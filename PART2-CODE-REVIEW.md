# Morrow Code Review

## Review summary

**PR Status: Request changes**

The overall shape of the feature is fine, but there are a few issues here that I would want fixed before merge. The main ones are SQL injection, hardcoded production credentials, async work not being awaited, broken effect dependencies that can either keep refetching or leave the dashboard blank on initial load, and the daily-log check not being safe under concurrent requests.

I’ve kept the comments below focused on things that can affect correctness, security, or the user experience. The smaller cleanup items are grouped at the end.

---

# Backend — `server.ts`

## 1. [Blocker] Parameterise the SQL queries

**Location:** `GET /api/dashboard` and `POST /api/logs`

We are interpolating request values directly into SQL:

```ts
`SELECT * FROM habits WHERE user_id = ${userId}`
```

and:

```ts
`INSERT INTO habit_logs (...) VALUES (${userId}, ${habitId}, '${value}', CURDATE())`
```

This leaves the endpoint open to SQL injection. `userId`, `habitId`, and `value` should not be interpolated directly into SQL.

Let's use parameterised queries directly in the mysql `execute()` calls:

```ts
const [habits] = await db.execute(
  "SELECT id, name, target FROM habits WHERE user_id = ?",
  [userId]
);
```

```ts
await db.execute(
  `INSERT INTO habit_logs (user_id, habit_id, value, log_date)
   VALUES (?, ?, ?, CURDATE())`,
  [userId, habitId, value]
);
```

You might be thinking of using ORM. That is also a valid option but only if the wider codebase already uses one. So let's use the parameterised query right now instead of introducing something heavier just for this fix.

---

## 2. [Blocker] Remove database credentials from source

**Location:** MySQL connection pool configuration in `server.ts`

The database connection is using hardcoded prod-looking credentials, including the `root` account:

```ts
const db = mysql.createPool({
  host: "prod-db.internal",
  user: "root",
  password: "Passw0rd123!",
  database: "healthapp",
});
```

These values should not live in the code. I would move them to environment/secret configuration. Also, give the application a least-privileged db role instead of `root`.

If this password was ever live, I would rotate it immediately. Removing it from the latest commit is not enough once it has been committed or shared.

---

## 3. [Blocker] Wait for the dashboard queries before sending the response

**Location:** `GET /api/dashboard`

There is an issue with the use of forEach() here:

```ts
habits.forEach(async (habit: any) => {
  const [logs]: any = await db.query(...);
  result.push({ ...habit, logs });
});

res.json(result);
```

`forEach` does not wait for the async callback. That means `res.json(result)` can run before the log queries have finished, so the dashboard can come back empty or only partly populated even when the data is there.

The minimal fix is to use `Promise.all()` with `map()`:

```ts
const result = await Promise.all(
  habits.map(async (habit: HabitRow) => {
    const [logs] = await db.execute(
      `SELECT value, log_date
       FROM habit_logs
       WHERE habit_id = ?
         AND log_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`,
      [habit.id]
    );

    return { ...habit, logs };
  })
);
```

This fixes the async issue, but it still has an N+1 query pattern. There's the query for the habits and then one habit_logs query per habit. If users have a small number of active habits, I would not treat this as a blocker yet. But if habit counts or dashboard traffic grows, we should revisit this and move toward a joined query or two bulk queries instead.

---

## 4. [Blocker] Make “log once per day” a database guarantee

**Location:** `POST /api/logs` and `habit_logs` database constraint

The current flow is:

1. Check whether a row already exists.
2. If not, insert one.

That works most of the time, but it is not safe when two requests arrive at nearly the same time. Both requests can pass the `SELECT` before either one inserts, and we end up with two logs for the same habit and day.

Let's put the rule in the database instead:

```sql
ALTER TABLE habit_logs
ADD CONSTRAINT uq_habit_log_day
UNIQUE (user_id, habit_id, log_date);
```

There is also a habit ownership issue in this code. `userId` and `habitId` both come from the request body, but the code never verifies that the habit actually belongs to that user.

We can add an ownership check in the insert. We could actually add a separate SELECT to check ownership before inserting, but that would add another database round trip, so let's just make the check a part of insert itself.

```sql
INSERT INTO habit_logs (user_id, habit_id, value, log_date)
SELECT h.user_id, h.id, ?, CURDATE()
FROM habits h
WHERE h.id = ?
  AND h.user_id = ?;
```

The unique constraint protects us from duplicates even under concurrency, while the `INSERT ... SELECT` makes sure the habit actually belongs to the user.

If authentication exists elsewhere in the application, I would also take `userId` from the authenticated user rather than trusting the value sent by the browser.

---

## 5. [Blocker] Do not return success before MySQL confirms the insert

**Location:** `POST /api/logs`

The insert is not awaited before the success response is returned:

```ts
db.query(`INSERT ...`);
res.json({ success: true });
```

So the API can tell the frontend everything worked even if the insert fails a moment later.

This can lead to poor user experience: a user may believe they logged the habit for the day and kept their streak, while the row was never actually saved.

The write should be awaited before returning success:

```ts
await db.execute(/* insert habit log */);
res.status(201).json({ success: true });
```

If the write fails, the request should fail too.

---

## 6. [Important] Do not expose stack traces to API callers

**Location:** Global Express error handler in `server.ts`

The global error handler currently returns the stack trace:

```ts
res.status(500).json({ error: err.stack });
```

That can expose internal file paths, runtime details, and potentially hints about the application or database structure to anyone calling the endpoint.

I would instead log the detailed error on the server and return a stable generic response to the client:

```ts
console.error(err);
res.status(500).json({ error: "Internal server error" });
```

---

# Frontend — `HabitDashboard.tsx`

## 7. [Blocker] Fix the dashboard effects and remove the redundant filtered state

**Location:** dashboard fetch effect and search/filter effect

There are two effect dependency problems in the HabitDashboard component. There's one in the dashboard fetch effect and another in the search/filter effect.

The fetch effect has no dependency array:

```ts
useEffect(() => {
  fetch(`/api/dashboard?userId=${userId}`)
    .then((res) => res.json())
    .then((data) => setHabits(data));
});
```

`setHabits()` causes another render, which runs the effect again and sends another request. Because the effect has no dependency array, this creates a continuous fetch/render loop. This can repeatedly hit the API until the component is unmounted or the request fails.

There is also a separate issue with the `filtered` state. It starts as an empty array, and the effect that populates it only runs when search changes:

```ts
useEffect(() => {
  setFiltered(habits.filter((h) => h.name.includes(search)));
}, [search]);
```

When the initial fetch finishes and `habits` is populated, this effect does not run because `search` has not changed. The result is that the dashboard can show zero habits on initial load until the user types something into the search box.

The fetch should run when the component loads and when `userId` changes:

```ts
useEffect(() => {
  fetch(`/api/dashboard?userId=${userId}`)
    .then((res) => res.json())
    .then((data) => setHabits(data));
}, [userId]);
```

For `filtered`, I would remove the extra state and effect entirely and derive it from the current data during render:

```ts
const filtered = habits.filter((habit) =>
  habit.name.includes(search)
);
```

That removes the need to keep two pieces of state in sync. I would also check `res.ok` and show some sort of loading/error state rather than assuming every response is successful.

---

## 8. [Important] Do not mutate the existing React state

**Location:** `logHabit()`

This block changes the existing state object in place:

```ts
const updated = habits;
updated.find((h) => h.id === habitId)!.logs.push(...);
setHabits(updated);
```

`updated` and `habits` are the same array, so React is getting the same reference back after the mutation. That can lead to stale or inconsistent rendering.

There is also another issue with the `!`. The code assumes it will always find a habit, but there's no guarantee that a matching habit exists at runtime. If the ID is stale or the habit is no longer in state, `.logs` will throw an error.

I would adjust this to use an immutable update instead:

```ts
setHabits((current) =>
  current.map((habit) =>
    habit.id === habitId
      ? {
          ...habit,
          logs: [
            ...habit.logs,
            {
              value: "done",
              log_date: new Date().toISOString(),
            },
          ],
        }
      : habit
  )
);
```

That avoids the mutation and also handles “no matching habit” safely.

---

# Backend + Frontend — Shared behaviour

## 9. [Important] The backend and frontend do not agree on what “last 7 days” means

**Area:** Backend — `GET /api/dashboard`; Frontend — `HabitDashboard` component, `completionRate()`

The backend currently uses:

```sql
log_date > DATE_SUB(NOW(), INTERVAL 7 DAY)
```

That is a 168-hour rolling window.

The frontend is doing something different as it builds seven calendar dates which includes today and the six days before it.

If the product rule is “the last seven calendar days including today,” I would make the backend say that directly:

```sql
log_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
```

There is also a timezone issue here. The frontend uses `toISOString()`, which converts the browser time to UTC, while `CURDATE()` follows the MySQL session timezone. Around midnight in Singapore, those can point to different dates.

The definition of “today” needs to be consistent. I would define which timezone determines the user’s habit day and apply that same rule in both the frontend and backend.

---

## Additional notes

### Backend

- Validate `userId`, `habitId`, and `value` before hitting the database. Parameterised queries prevent SQL injection, but they do not make invalid input valid. Malformed requests should return a clear 4xx response rather than failing later as a database/server error. Example:

```
// Assuming userId is an integer:
if (!Number.isInteger(userId)) {
  return res.status(400).json({ error: "Invalid userId" });
}
```

- Consider returning `201 Created` when a habit log is successfully created, and an appropriate 4xx response when the request cannot be completed, instead of always returning HTTP 200 with success: false. That makes the API contract clearer because the HTTP status itself tells the client whether the request succeeded, conflicted with existing state, or was invalid.

- The `email` sent by the client is not used by the habit-log operation and is only used for application logging. I do not see why this endpoint needs to receive and log this particular piece of personal info when it serves no other purpose. If we need to identify who performed the action in the logs, we can use a trusted user identifier from the authenticated request instead.

- Let's try to avoid using `SELECT *` and instead select only the columns the endpoint actually needs. This keeps the API less coupled to the database schema and avoids accidentally exposing new columns later. I would also replace the broad `any` usage with proper request, query, and result types so TypeScript can catch mismatches earlier instead of deferring them to runtime.


### Frontend

- Use `key={habit.id}` rather than the array index.

### Shared / Domain

- The frontend `completionRate()` treats the existence of any log as a completed day, even though the model also has `value` and `target`. Please clarify the intended completion rule: does having a log itself mean “done,” or does the recorded value need to meet the target?
---

**Scope:** I would not add Redux, GraphQL, an ORM, microservices, or similar architectural changes as part of this PR. The issues above can be addressed cleanly within the current React + Express + MySQL setup.

---

## Tests I would add around these changes

### Backend

- Dashboard waits for all required data before returning.
- Two concurrent requests cannot create two logs for the same habit and day.
- A user cannot create a log against another user's habit.
- A failed database write is not reported as success.

### Frontend

- Dashboard fetches on initial load / `userId` change, not on every render.
- Habits are visible after the initial fetch without requiring the user to change the search field.
- A failed database write does not leave the UI showing a completed habit.

### Shared behaviour

- The seven-day calculation behaves correctly at the date boundary and follows the agreed timezone rule.
