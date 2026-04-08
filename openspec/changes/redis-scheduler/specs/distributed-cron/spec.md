## ADDED Requirements

### Requirement: Exactly one instance executes each cron job per tick
When multiple instances of the same application are running, the system SHALL ensure that exactly one instance executes each `@Cron`-decorated method per scheduled tick. No instance SHALL execute a job that another instance has already claimed for the same tick.

#### Scenario: Two instances compete for the same due job
- **WHEN** two instances both detect a job is due at the same timestamp
- **THEN** exactly one instance executes the handler and the other skips it

#### Scenario: Ten instances, all with the same cron job
- **WHEN** ten identical ECS tasks are running and a `@Cron('* * * * * *')` job fires
- **THEN** the handler is invoked exactly once across all ten instances

---

### Requirement: Redis sorted set stores next run timestamp as score
The system SHALL use a Redis sorted set with score equal to the next scheduled run time in Unix milliseconds. The member SHALL be the job name.

#### Scenario: Job registered at startup
- **WHEN** the application bootstraps with a `@Cron('0 * * * * *')` decorated method
- **THEN** a ZSET entry exists for that job with score equal to the next occurrence of the expression after boot time

#### Scenario: Job re-enqueued after execution
- **WHEN** an instance successfully claims and executes a job
- **THEN** a new ZSET entry is added with score equal to the next occurrence after the current run time

---

### Requirement: Atomic Lua claim prevents duplicate execution
The system SHALL use a single Lua script to atomically find and remove a due job from the sorted set. The script SHALL return the job name if a due job was found and claimed, or nil if no due job exists.

#### Scenario: Claim script finds a due job
- **WHEN** `ZRANGEBYSCORE jobs -inf now LIMIT 0 1` returns a job and `ZREM` succeeds
- **THEN** the script returns the job name and no other instance can claim the same tick

#### Scenario: Claim script finds no due job
- **WHEN** no entry in the sorted set has score ≤ now
- **THEN** the script returns nil and the instance sleeps until the next entry's score

---

### Requirement: Smart sleep loop minimises Redis traffic
The system SHALL implement a poll loop that peeks at the earliest entry in the sorted set and sleeps until its score, rather than polling on a fixed interval. The sleep SHALL be interruptible on application shutdown.

#### Scenario: No jobs registered
- **WHEN** the sorted set is empty
- **THEN** the poll loop sleeps for 1 second before re-checking

#### Scenario: Next job is in the future
- **WHEN** the earliest entry has score T and current time is T − 5000 ms
- **THEN** the instance sleeps for approximately 5000 ms before attempting a claim

#### Scenario: Multiple jobs due simultaneously
- **WHEN** several entries have score ≤ now after a claim completes
- **THEN** the loop immediately re-attempts a claim without sleeping

---

### Requirement: Re-enqueue before handler invocation
The system SHALL insert the job's next scheduled occurrence into the sorted set BEFORE invoking the handler function. This ensures the job is never orphaned if the handler throws or the process is killed.

#### Scenario: Handler throws an error
- **WHEN** a claimed job's handler throws an uncaught exception
- **THEN** the job's next occurrence is already in the sorted set and future ticks are unaffected

#### Scenario: Process killed after claim
- **WHEN** the process is terminated after claiming a job but before completing the handler
- **THEN** the job's next occurrence is already in the sorted set (re-enqueued before handler start)

---

### Requirement: Expression-change detection on deployment
The system SHALL store the cron expression for each job in a Redis Hash at `{prefix}:meta`. On bootstrap, if the stored expression differs from the current decorator expression, the system SHALL overwrite the ZSET entry with the next occurrence computed from the new expression.

#### Scenario: Cron expression unchanged across deployments
- **WHEN** a redeployed instance has the same expression as what is stored in `{prefix}:meta`
- **THEN** `ZADD NX` is used and the existing schedule is preserved

#### Scenario: Cron expression changed on redeploy
- **WHEN** a redeployed instance has a different expression than what is stored in `{prefix}:meta`
- **THEN** `{prefix}:meta` is updated with the new expression and the ZSET entry is overwritten with the new next occurrence

---

### Requirement: 5-field and 6-field cron expressions supported
The system SHALL accept both standard 5-field cron expressions (minute granularity) and 6-field expressions with a leading seconds field, matching `@nestjs/schedule` behaviour.

#### Scenario: 6-field expression with seconds
- **WHEN** `@Cron('*/10 * * * * *')` is used
- **THEN** the job fires every 10 seconds with exactly-one-instance guarantee

#### Scenario: 5-field expression
- **WHEN** `@Cron('0 * * * *')` is used
- **THEN** the job fires every hour at minute 0

---

### Requirement: Timezone support for cron expressions
The system SHALL support the `timeZone` option on `@Cron`, interpreting the cron expression in the specified IANA timezone.

#### Scenario: Job scheduled in a specific timezone
- **WHEN** `@Cron('0 9 * * 1-5', { timeZone: 'America/New_York' })` is used
- **THEN** next occurrence is computed as 9:00 AM Eastern Time on weekdays

---

### Requirement: `disabled` option suppresses Redis registration
When `@Cron(expr, { disabled: true })` is used, the system SHALL register the job in the in-memory `SchedulerRegistry` but SHALL NOT insert it into the Redis sorted set at bootstrap. The job SHALL NOT fire automatically.

#### Scenario: Disabled job at bootstrap
- **WHEN** `@Cron('* * * * * *', { disabled: true })` is declared
- **THEN** no ZSET entry exists for the job and the handler is never invoked automatically

---

### Requirement: `threshold` option skips late executions
When a claimed job's actual execution time exceeds `score + threshold` (default 250 ms), the system SHALL skip the handler invocation, log a warning, and re-enqueue for the next occurrence.

#### Scenario: Job claimed significantly late
- **WHEN** a job with default threshold is claimed and `Date.now() − score > 250`
- **THEN** the handler is not invoked, a warning is logged, and the job is re-enqueued

---

### Requirement: `@Interval` and `@Timeout` remain process-local
`@Interval` and `@Timeout` decorators SHALL behave identically to `@nestjs/schedule` — they use `setInterval` / `setTimeout` and are not backed by Redis.

#### Scenario: @Interval across multiple instances
- **WHEN** ten instances each have `@Interval(5000)`
- **THEN** all ten fire independently every 5 seconds (no distributed coordination)

---

### Requirement: Drop-in import replacement
The package SHALL export `ScheduleModule`, `Cron`, `CronExpression`, `Interval`, `Timeout`, `SchedulerRegistry`, `SchedulerType`, `CronOptions`, and all related types under the same names as `@nestjs/schedule`. Replacing the import path SHALL be the only migration step.

#### Scenario: Replacing the import
- **WHEN** `import { ScheduleModule, Cron } from '@nestjs/schedule'` is replaced with `import { ScheduleModule, Cron } from '@nestjs-redis/scheduler'`
- **THEN** the application compiles and behaves identically, with cron jobs now distributed
