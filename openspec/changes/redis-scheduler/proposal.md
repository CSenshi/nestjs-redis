## Why

NestJS applications deployed on ECS (or any horizontally-scaled environment) cannot safely use `@nestjs/schedule` because every instance fires every cron job independently — causing duplicate work, race conditions, and data corruption. A Redis-backed scheduler using sorted sets solves this by making job claiming atomic: exactly one instance runs each job per scheduled tick.

## What Changes

- **New package** `packages/scheduler` published as `@nestjs-redis/scheduler`
- Class and decorator names are **identical** to `@nestjs/schedule` — migration is a single import path change, nothing else
- **`ScheduleModule`** — drop-in module replacement; `forRoot()` / `forRootAsync()` with same options shape, plus a required `client` field (Redis connection)
- **`@Cron(expr, opts?)`** — same decorator API; job execution is distributed via Redis sorted set (score = next run timestamp) + Lua atomic claim; exactly one instance fires per tick
- **`@Interval(ms)` / `@Timeout(ms)`** — identical API; remain process-local (`setInterval`/`setTimeout`)
- **`CronExpression` enum** — re-exported verbatim
- **`SchedulerRegistry`** — identical API (`getCronJob`, `addCronJob`, `deleteCronJob`, `getIntervals`, `getTimeouts`, etc.)
- **Smart poll loop** — each instance peeks at the next due job score and sleeps until then; no busy-polling
- **Expression-change detection** — companion Redis Hash stores the canonical cron expression per job; a changed expression on redeploy automatically reschedules at the correct next occurrence

## Capabilities

### New Capabilities

- `distributed-cron`: Distributed cron scheduling via Redis sorted sets — decorator-based, exactly-one-instance-per-tick guarantee, 5 and 6-field expressions, timezone support, expression-change detection across deployments
- `scheduler-registry`: Runtime registry for programmatic job management (start, stop, delete, list cron jobs / intervals / timeouts) — API-compatible with `@nestjs/schedule`'s `SchedulerRegistry`

### Modified Capabilities

<!-- none — this is a new package, no existing specs change -->

## Impact

- **New package**: `packages/scheduler` — seventh package in the monorepo
- **New peer dependencies**: `redis ^5.0.0`, `@nestjs/common ^9–11`, `@nestjs/core ^9–11`
- **New dependency**: `cron-parser` (next-occurrence computation + timezone support)
- **No changes** to any existing packages
- **Migration**: replace `import { ScheduleModule, ... } from '@nestjs/schedule'` with `import { ScheduleModule, ... } from '@nestjs-redis/scheduler'` — no other code changes required
