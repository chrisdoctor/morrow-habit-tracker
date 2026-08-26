# Morrow Habit Tracker

Small full-stack habit-tracking feature

## Initial Scope

The application will provide:

-   a Node.js + TypeScript REST API;
-   a React + TypeScript dashboard;
-   MySQL persistence;
-   a small set of seeded health habits;
-   daily habit logging;
-   current streaks and weekly progress.

The initial implementation is intentionally focused on the requested
feature slice rather than a complete habit-management product.

## Initial Architecture

``` text
React + TypeScript
        |
        | REST
        v
Node.js + TypeScript
        |
   Controllers
        |
     Services
        |
   Data Access
        |
        v
      MySQL
```

Domain and progress rules will live on the backend rather than being
independently reimplemented in React.

## Domain Model

The initial model is intentionally small:

``` text
User
  |
  +-- Habit
        |
        +-- HabitLog
```

### User

Represents the owner of the habits. Authentication is outside the
initial exercise scope, so the application will use a seeded/demo user.

### Habit

Represents a user-specific health behaviour with:

-   name;
-   unit;
-   frequency.

The initial implementation assumes daily habits.

### HabitLog

Represents the recorded value for a habit on a local calendar date.

A habit may have at most one effective log per date. Logging the same
habit/date again updates the existing record rather than creating a
duplicate.

## Database Choice

**MySQL** is used for the initial implementation.

The core model is relational and benefits from database-enforced
relationships and uniqueness constraints. It also provides a
straightforward path for future relationships around users, habits,
goals, programmes, or other health-related entities.

Habit-specific supplementary data can use JSON where appropriate without
requiring a second datastore.

Initial schema:

``` text
users
-----
id
name
timezone
created_at
updated_at

habits
------
id
user_id
name
unit
frequency
is_active
created_at
updated_at

habit_logs
----------
id
habit_id
log_date
value
metadata
created_at
updated_at

UNIQUE (habit_id, log_date)
```

## Initial API

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


## Assumptions

### Completion

For the initial implementation, a habit is completed for a day when a
log exists for that habit on that local calendar date.

### Week

A week runs from **Monday to Sunday**.

### Streak

A current streak is the number of consecutive local calendar days on
which the habit has a log.

If today's habit has not yet been completed, the streak is calculated
from yesterday so an in-progress day does not immediately break an
existing streak.

### Dates and Timezones

Habit tracking is based on the user's local calendar date rather than
server-local or UTC calendar dates.

Habit logs use a local calendar date for streak and weekly-progress calculations. Audit timestamps are stored separately in UTC.

## Testing Priorities

Testing will focus primarily on behaviour where correctness matters
most:

-   streak calculation;
-   completion thresholds;
-   gaps and empty history;
-   week boundaries;
-   local-date handling;
-   create/update behaviour for daily logs;
-   validation and API error handling;
-   basic dashboard behaviour.

The goal is focused confidence in domain rules and API boundaries
rather than maximising coverage percentage.

## Running Locally

ToDo: Local setup instructions
