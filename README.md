# Morrow Habit Tracker

Small full-stack habit-tracking feature

## Implementation Overview

### Initial Scope

The application will provide:

-   a Node.js + TypeScript REST API;
-   a React + TypeScript dashboard;
-   MySQL persistence;
-   a small set of seeded health habits;
-   daily habit logging;
-   current streaks and weekly progress.

The initial implementation is intentionally focused on the requested
feature slice rather than a complete habit-management product.

### Initial Architecture

``` text
React + TypeScript
        |
        | REST
        v
Express routes
        |
   Route handlers
        |
   Services
        |
   Repositories
        |
        v
      MySQL
```

Routes handle HTTP concerns and validation. Progress rules live in a
backend service, while repositories own explicit SQL access. React
renders server-provided progress rather than independently calculating
streaks or weekly completion.

### Domain Model



``` text
User
  |
  +-- Habit
        |
        +-- HabitLog
```

#### User

Represents the owner of the habits. Authentication is outside the
initial exercise scope, so the application will use a seeded/demo user.

#### Habit

Represents a user-specific health behaviour with:

-   name;
-   unit.

The initial implementation assumes daily habits.

#### HabitLog

Represents the recorded value for a habit on a local calendar date.

A habit may have at most one effective log per date. Logging the same
habit/date again updates the existing record rather than creating a
duplicate.

### Database Choice

**MySQL** is used for the initial implementation.

The core model is relational and benefits from database-enforced
relationships and uniqueness constraints.

Initial schema:

``` text
users
-----
id
name
created_at
updated_at

habits
------
id
user_id
name
unit
created_at
updated_at

habit_logs
----------
id
habit_id
log_date
value
created_at
updated_at

UNIQUE (habit_id, log_date)
```

### API Endpoints

``` text
GET /api/habits
```

Returns the current user's habits.

``` text
PUT /api/habits/:habitId/logs/:date
```

Creates or updates the value recorded for a habit on a given local
calendar date.

``` text
GET /api/progress?week=YYYY-MM-DD
```

Returns the user's habit progress for the requested week, including
current streak and weekly completion information.


## Running Locally

1. Create root environment variables:

``` sh
cp .env.example .env
```

Fill in the MySQL passwords in `.env`.

2. Start MySQL:

``` sh
docker compose up -d mysql
```

3. Apply the schema and seed data from the repo root:

``` sh
docker compose exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < api/sql/schema.sql
docker compose exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < api/sql/seed.sql
```

4. Create API environment variables:

``` sh
cp api/.env.example api/.env
```

The root `.env` configures the local MySQL container. `api/.env`
configures how the API connects to that container. For this take-home exercise
setup, we need to keep the overlapping MySQL values aligned.

5. Install and run the API:

``` sh
cd api
npm install
npm run dev
```

6. Install and run the frontend in a second terminal:

``` sh
cd web
npm install
npm run dev
```

The frontend runs through Vite and proxies `/api` requests to the API on
port `3000` to avoid CORS issues.

## Assumptions and Edge Cases

The implementation uses a seeded demo user rather than authentication.
Each habit belongs to that demo user, and all API calls operate in that
context.

A habit is considered complete for a day when a log exists for that
habit/date. The numeric value is stored and displayed, but it does not
affect completion or streaks.

A habit can have only one effective log per calendar date. Re-logging
the same habit/date updates the existing row through a database
uniqueness constraint and upsert.

The requested week is interpreted as the Monday-Sunday week containing
the `week=YYYY-MM-DD` query date. Invalid dates and malformed dates
return `400`.

Current streak is calculated from today if today has a log. If today has
not been logged yet, the streak is calculated from yesterday so an
in-progress day does not immediately break an existing streak.

Future-dated logs are rejected. Progress only considers logs through the
current calendar date.

Deliberately not handled in this slice:

-   authentication or multiple real users;
-   habit creation, editing, archiving, or deletion;
-   custom week starts;
-   per-user timezones;
-   migrations beyond applying the SQL files manually;
-   automated test coverage;
-   partial-day audit history for multiple submissions on the same day.

## Production Considerations

- For production, I would integrate authentication and authorisation and derive the current user
from the request rather than using a seeded user.

- I would improve `findProgressSourceRows()` asit retrieves every habit log up through today for the user, even when the caller only wants one week's progress. This is not fine after several years of logs. I would review indexes and either bound the history queried or calculate the current streak more efficiently.

- Right now a day is considered completed when a log exists `(value !== null)`, and the streak increments for every consecutive date containing a log regardless of the logged value. If production habits eventually have targets such as “8 hours sleep” or “30 minutes exercise,” the data model and progress calculation will need to reflect this.

- I am using DECIMAL(10,2) in the db, but the API currently accepts any number, such as 1.234567. I need to define whether such values are rejected or rounded rather than relying implicitly on database conversion.

- I would add rate limiting, appropriate CORS/security-header configuration, request correlation IDs, metrics/monitoring, backup/restore procedures, and CI/CD deployment checks.

- I would add validation of production configuration at startup. Production should fail fast with a clear configuration error.

- I would replace manual SQL application with versioned migrations. 
Right now the database is created manually by running:
```
api/sql/schema.sql
api/sql/seed.sql
```

I would use migration files:
```
001_create_users.sql
002_create_habits.sql
003_create_habit_logs.sql
```

Each migration runs once, in order.

- I would add tests that run automatically, especially for logic where regressions are easy:
   - streak calculation
   - invalid dates like 2026-02-31
   - same habit/date update behavior
   - 400 and 404 API responses

- I would centralize shared date parsing/formatting on the backend. I would also add support for multi-region users and add explicit timezone handling. The current version uses simple calendar dates because the exercise is scoped to a small feature slice.

- I would replace the simple catch-all error handler with structured logging and clearer handling for expected application errors.

- I would add frontend tests for loading, error, progress rendering, and
the write-then-refresh flow.

- I would add graceful shutdown and proper readiness checks. The server currently checks the DB once before listening, which is good, but there is no SIGTERM/SIGINT handling to stop accepting requests and close the MySQL pool cleanly.

## AI Tools Used

I used Codex as an implementation and review assistant
during the exercise. I used it primarily to:

-   scaffold repetitive TypeScript/Express and React code after defining
    the intended structure
-   generate initial SQL/query implementations from an established data
    model
-   suggest edge cases for manual testing
-   review implementation details such as MySQL typing, date handling,
    and API error paths
-   accelerate small refactors once the desired behaviour was already
    defined

I kept architectural and product decisions outside the coding agent, then used AI to implement or review those decisions.

## Where AI Helped

AI was particularly useful for reducing time spent on mechanical
implementation. For example, after defining the repository/service
boundaries and API contract, I used it to generate typed `mysql2`
repository mappings and repetitive request-handling code.

It was also useful as a second reviewer. For the progress calculation, I
asked AI to enumerate edge cases around streaks, week boundaries, missing
logs, and date handling. I then manually exercised the relevant cases
against the running application.

## Where I Overrode Or Corrected AI

There were several cases where I deliberately rejected or changed AI
suggestions:

-   Avoided premature dependencies. AI initially suggested Zod for
    runtime validation and Vitest during initial scaffolding. I kept
    validation explicit and manual while the API surface was small, and
    deferred introducing a test framework until enough domain logic
    existed to justify it.
-   Simplified repository structure. An initial suggestion used an npm
    workspace or `apps/` structure. With only two small applications and
    no shared packages, I removed the workspace structure and kept
    independently runnable `api/` and `web/` packages.
-   Corrected an unsupported product assumption. An early implementation
    introduced habit targets and defined completion as `value >= target`.
    On reviewing the brief, I determined that target achievement was not
    actually required. I simplified the model so completion means that a
    daily log exists, and streaks represent consecutive logged days.
-   Kept SQL explicit. I chose parameterized `mysql2` queries rather than
    introducing an ORM. For the size of the exercise, explicit SQL made
    persistence behaviour and constraints easier to inspect and reason
    about.
-   Kept the server authoritative for progress. Rather than duplicating
    streak/progress calculations in React, I kept those rules in the
    backend and had the frontend refresh progress after writes.
