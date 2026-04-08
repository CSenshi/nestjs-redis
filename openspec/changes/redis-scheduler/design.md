## Context

`@nestjs/schedule` is single-instance: every process starts its own `CronJob` timers. In a horizontally-scaled ECS deployment with 10 identical tasks, every cron fires 10 times. The existing monorepo already provides a `@nestjs-redis/client` package (node-redis v5) that is available as a peer dependency — no new infrastructure is required.

The reference implementation (`@nestjs/schedule` source) defines the component model we mirror: `Explorer` (discovery) → `Orchestrator` (lifecycle) → `Registry` (runtime API). We keep this structure and replace only the cron-execution layer with Redis.

## Goals / Non-Goals

**Goals:**
- Exactly one instance executes each `@Cron` job per scheduled tick across all ECS tasks
- `import { ScheduleModule, Cron, CronExpression, SchedulerRegistry, ... } from '@nestjs-redis/scheduler'` is a drop-in replacement for `@nestjs/schedule`
- Support 5-field and 6-field (seconds) cron expressions with timezone
- Smart sleep: instances wake only when a job is due, not on a fixed poll interval
- Expression-change detection: changed cron expressions on redeploy reschedule correctly
- `@Interval` / `@Timeout` remain process-local (identical to `@nestjs/schedule`)

**Non-Goals:**
- Distributed `@Interval` (sorted-set backed) — out of scope; process-local is the correct semantic
- Job history / audit log
- `waitForCompletion` distributed enforcement (V1: per-process only via local guard)
- Dynamic job registration at runtime (stretch goal; implement after core is stable)
- Redis Cluster or Sentinel support for the scheduler key space (single client assumed)

## Decisions

### 1. Redis ZSET as the scheduling primitive

**Decision:** Use a sorted set with score = next run timestamp (Unix ms). `ZPOPMIN`-style atomic Lua claim determines which instance runs each tick.

**Rationale:** Sorted sets natively model "next event at time T" — `ZRANGEBYSCORE -inf now LIMIT 0 1` finds the next due job in O(log N). The claim is a single Lua script (atomic on Redis), eliminating the need for a separate distributed lock.

**Alternative considered:** Redlock + local `CronJob` timers. Rejected: requires all instances to run the job handler simultaneously and coordinate, which is more complex and still susceptible to clock skew.

### 2. Lua atomic claim script

```lua
-- KEYS[1] = {prefix}:jobs  (ZSET)
-- ARGV[1] = now (Unix ms as string)
local jobs = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, 1)
if #jobs == 0 then return nil end
redis.call('ZREM', KEYS[1], jobs[1])
return jobs[1]
```

**Rationale:** Single round-trip, atomically checks and removes. No two instances can claim the same job. SHA cached after first `SCRIPT LOAD`; NOSCRIPT fallback re-sends the raw script (same pattern as `throttler-storage`).

### 3. Smart sleep loop (peek → sleep → claim)

```
loop:
  entry = ZRANGE jobs 0 0 WITHSCORES
  if empty          → sleep(1 s) [interruptible]
  if score > now    → sleep(score - now) [interruptible]
  if score <= now   → lua claim
    got job  → re-enqueue first, then run handler in background
    got nil  → loop immediately (another instance claimed it)
```

**Rationale:** Minimises Redis traffic vs. a fixed 100ms poll. For a job running every minute, each instance makes ~2 Redis calls per minute instead of 600. Sleep is interrupted on module shutdown via an `AbortController`-style cancel token.

**Re-enqueue before running:** `ZADD jobs nextTimestamp jobName` happens _before_ invoking the handler. Guarantees the job is never orphaned if the handler throws or the instance crashes mid-execution. A missed run is preferable to a lost schedule entry.

### 4. Companion Hash for expression-change detection

Two Redis keys per `keyPrefix`:

| Key | Type | Purpose |
|-----|------|---------|
| `{prefix}:jobs` | ZSET | Score = next run (ms); member = job name |
| `{prefix}:meta` | Hash | Field = job name; value = cron expression string |

On startup, for each `@Cron` job:
```
stored = HGET {prefix}:meta  jobName
if stored != currentExpression OR stored == nil:
  HSET  {prefix}:meta  jobName  currentExpression
  ZADD  {prefix}:jobs  nextOccurrence  jobName   ← overwrite (expression changed)
else:
  ZADD  {prefix}:jobs NX nextOccurrence jobName  ← skip if already scheduled
```

**Rationale:** Without this, a rolling deployment that changes a cron expression (e.g., `0 * * * *` → `30 * * * *`) would silently retain the old schedule because `ZADD NX` is a no-op on existing members.

### 5. Job identity: `ClassName.methodName`

Auto-generated from the provider class name and method name via NestJS `DiscoveryService`. The `name` option overrides this. Throws `DUPLICATE_SCHEDULER` at bootstrap if two handlers resolve to the same name (mirroring `@nestjs/schedule` behaviour).

**Rationale:** Matches `@nestjs/schedule` ergonomics. All ECS tasks are identical, so the same class+method always produces the same name — giving a stable, predictable Redis key across instances.

### 6. Module structure mirrors `@nestjs/schedule`

| Component | Role |
|-----------|------|
| `ScheduleExplorer` | `OnModuleInit` — scans providers+controllers via `DiscoveryService` + `MetadataScanner`; calls orchestrator |
| `SchedulerOrchestrator` | `OnApplicationBootstrap` / `BeforeApplicationShutdown` — mounts intervals/timeouts, registers cron jobs in Redis, starts poll loop |
| `SchedulerRegistry` | Public injectable — identical API surface to `@nestjs/schedule`'s registry |
| `SchedulerMetadataAccessor` | Reads reflect-metadata set by decorators |
| `RedisJobStore` | Internal — ZADD, HGET/HSET, Lua claim; SHA cache + NOSCRIPT fallback |
| `RedisPollLoop` | Internal — smart sleep loop, cancel token, background job dispatch |

**Rationale:** Preserves the three-layer design of `@nestjs/schedule` so the codebase is immediately navigable to anyone familiar with the original. Isolates Redis concerns to `RedisJobStore` + `RedisPollLoop`.

### 7. `disabled` option

Disabled jobs are registered in the in-memory `SchedulerRegistry` (so `registry.getCronJob(name)` works) but are **not** inserted into the Redis ZSET at bootstrap. They can be started later via `registry.getCronJob(name).start()` — but since we replace `CronJob` references with a thin wrapper, `start()` must insert into Redis.

### 8. `threshold` option (default 250 ms)

If the poll loop claims a job and `Date.now() - score > threshold`, the run is skipped and a warning is logged. The job is still re-enqueued for its next occurrence. Matches `@nestjs/schedule` semantics; guards against delayed execution when a Redis cluster is briefly overloaded.

### 9. `cron-parser` for expression computation

Used to compute next occurrence from a cron expression + timezone. Supports both 5-field and 6-field (seconds) expressions. No `cron` package needed — we never create `CronJob` instances.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Clock skew between ECS tasks causes two instances to both think a job is due at "now" | Lua claim is atomic — only one ZREM succeeds regardless of clock skew |
| Rolling deployment with expression change: Instance A (old) re-enqueues with old expression after Instance B (new) has updated meta | Acceptable race; expression converges after the next claim cycle. Document as expected behaviour. |
| Instance crashes after claim but before re-enqueue | Re-enqueue happens _before_ handler invocation, so this can't happen in the normal path. If the instance crashes between claim and re-enqueue (e.g., OOM kill in the Lua-to-ZADD gap), the job is orphaned. Mitigation: keep the gap minimal (synchronous ZADD before any async work). |
| Very large number of jobs (thousands) with frequent ticks | `ZRANGE 0 0` is O(log N) — scales fine. Lua claim is also O(log N). Not a concern in practice. |
| `waitForCompletion` not distributed | Document limitation. V2 can use a per-job Redis lock with TTL to enforce cross-instance no-overlap. |

## Migration Plan

1. Add `@nestjs-redis/scheduler` to `package.json`
2. Replace `import { ScheduleModule, ... } from '@nestjs/schedule'` with `import { ScheduleModule, ... } from '@nestjs-redis/scheduler'`
3. Update `ScheduleModule.forRoot()` → `ScheduleModule.forRootAsync({ inject: [RedisToken()], useFactory: (redis) => ({ client: redis }) })`
4. Ensure Redis is available in the environment (`docker compose up redis -d` locally)
5. Remove `@nestjs/schedule` from dependencies

**Rollback:** Reverse steps 2–5. No Redis data cleanup required (scheduler keys are namespaced and non-critical).

## Open Questions

- Should `SchedulerRegistry.getCronJob(name)` return a thin wrapper object (with `start()`/`stop()` that mutate the ZSET) or just a plain metadata object? The original returns a `CronJob` instance with many methods — we need to decide how much of that surface to emulate.
