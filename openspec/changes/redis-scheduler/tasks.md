## 1. Package Scaffold

- [x] 1.1 Run `pnpm nx g @nx/nest:library --name=scheduler --directory=packages/scheduler --buildable --publishable --linter=eslint --unitTestRunner=jest` to generate the package scaffold
- [x] 1.2 Update generated `package.json`: set name to `@nestjs-redis/scheduler`, add peer deps (`redis ^5`, `@nestjs/common ^9-11`, `@nestjs/core ^9-11`), add dep `cron-parser`, align `exports`/`files`/`engines` fields with other packages
- [x] 1.3 Update `tsconfig.json` to extend `tsconfig.base.json` and set `moduleResolution: nodenext` (match other packages)
- [x] 1.4 Update generated `project.json` to add `typecheck` target and align `lint`/`test`/`build` target config with other packages
- [x] 1.5 Register the new package in `nx.json` release config

## 2. Constants and Enums

- [x] 2.1 Create `schedule.constants.ts` — metadata keys: `SCHEDULE_CRON_OPTIONS`, `SCHEDULE_INTERVAL_OPTIONS`, `SCHEDULE_TIMEOUT_OPTIONS`, `SCHEDULER_NAME`, `SCHEDULER_TYPE`; module token: `SCHEDULE_MODULE_OPTIONS`
- [x] 2.2 Create `enums/scheduler-type.enum.ts` — `SchedulerType.CRON | INTERVAL | TIMEOUT`
- [x] 2.3 Create `enums/cron-expression.enum.ts` — verbatim copy of `CronExpression` from `@nestjs/schedule`
- [x] 2.4 Create `enums/index.ts` re-exporting both enums

## 3. Decorators

- [ ] 3.1 Create `decorators/cron.decorator.ts` — `@Cron(cronTime, options?)` with `CronOptions` type (name, timeZone, utcOffset, disabled, threshold, waitForCompletion, unrefTimeout); sets `SCHEDULE_CRON_OPTIONS`, `SCHEDULER_NAME`, `SCHEDULER_TYPE` metadata
- [ ] 3.2 Create `decorators/interval.decorator.ts` — `@Interval(timeout)` and `@Interval(name, timeout)` overloads
- [ ] 3.3 Create `decorators/timeout.decorator.ts` — `@Timeout(timeout)` and `@Timeout(name, timeout)` overloads
- [ ] 3.4 Create `decorators/index.ts` re-exporting all three decorators and `CronOptions`

## 4. Interfaces

- [ ] 4.1 Create `interfaces/schedule-module-options.interface.ts` — `ScheduleModuleOptions` (client, keyPrefix?, shutdownTimeout?, cronJobs?, intervals?, timeouts?), `ScheduleModuleOptionsFactory`, `ScheduleModuleAsyncOptions`
- [ ] 4.2 Create `interfaces/interval-metadata.interface.ts` — `IntervalMetadata { timeout: number }`
- [ ] 4.3 Create `interfaces/timeout-metadata.interface.ts` — `TimeoutMetadata { timeout: number }`

## 5. Metadata Accessor

- [ ] 5.1 Create `schedule-metadata.accessor.ts` — `SchedulerMetadataAccessor` injectable; methods: `getSchedulerType`, `getSchedulerName`, `getCronMetadata`, `getIntervalMetadata`, `getTimeoutMetadata`

## 6. Redis Job Store

- [ ] 6.1 Create `redis/redis-job-store.service.ts` — injectable service wrapping all Redis operations
- [ ] 6.2 Implement `registerJob(name, expression, nextTs, force)` — HGET meta, compare expression, ZADD NX or ZADD based on change detection
- [ ] 6.3 Implement `claimDueJob(nowMs)` — Lua script (ZRANGEBYSCORE + ZREM atomic); SHA cache + NOSCRIPT fallback pattern (same as throttler-storage)
- [ ] 6.4 Implement `peekNextJob()` — `ZRANGE jobs 0 0 WITHSCORES` returning `{ name, score } | null`
- [ ] 6.5 Implement `enqueueJob(name, nextTs)` — plain `ZADD jobs nextTs name` (overwrite)
- [ ] 6.6 Implement `removeJob(name)` — `ZREM jobs name` + `HDEL meta name`

## 7. Redis Poll Loop

- [ ] 7.1 Create `redis/redis-poll-loop.service.ts` — injectable service with `start()` and `stop()` methods
- [ ] 7.2 Implement smart sleep: peek next job → sleep until score (or 1 s if empty) → attempt claim; loop
- [ ] 7.3 Make sleep interruptible via `AbortController` / cancel token so `stop()` wakes the loop immediately
- [ ] 7.4 On successful claim: call `RedisJobStore.enqueueJob` with next occurrence (computed from in-memory expression) BEFORE dispatching handler
- [ ] 7.5 Implement `threshold` check: if `Date.now() - score > threshold` log warning and skip handler (still re-enqueue)
- [ ] 7.6 Dispatch handler in background (unhandled rejections caught and logged; don't block the loop)

## 8. Scheduler Registry

- [ ] 8.1 Create `scheduler.registry.ts` — `SchedulerRegistry` injectable with `Map<string, CronJobHandle>`, `Map<string, any>` for intervals/timeouts
- [ ] 8.2 Implement `getCronJob`, `getCronJobs`, `addCronJob` (throws on duplicate), `deleteCronJob` (removes from ZSET via `RedisJobStore.removeJob` + stops local ref)
- [ ] 8.3 Implement `doesExist(type, name)` returning boolean
- [ ] 8.4 Implement `getIntervals`, `getTimeouts`, `addInterval`, `addTimeout`, `deleteInterval`, `deleteTimeout`, `getInterval`, `getTimeout`
- [ ] 8.5 Define `CronJobHandle` interface/class with `start()` (ZADD) and `stop()` (ZREM) methods that mutate the Redis ZSET
- [ ] 8.6 Create `schedule.messages.ts` — `DUPLICATE_SCHEDULER(type, name)` and `NO_SCHEDULER_FOUND(type, name)` message helpers

## 9. Orchestrator

- [ ] 9.1 Create `scheduler.orchestrator.ts` — `SchedulerOrchestrator` implementing `OnApplicationBootstrap` and `BeforeApplicationShutdown`
- [ ] 9.2 Implement `addCron(fn, options)` — store handler + expression in `cronJobs` record (keyed by resolved name)
- [ ] 9.3 Implement `addInterval(fn, timeout, name)` and `addTimeout(fn, timeout, name)` — identical to `@nestjs/schedule`
- [ ] 9.4 Implement `onApplicationBootstrap`: for each cron job call `RedisJobStore.registerJob`, create `CronJobHandle`, add to registry; mount intervals + timeouts; start poll loop
- [ ] 9.5 Implement `beforeApplicationShutdown`: stop poll loop, await in-flight handlers up to `shutdownTimeout`, clear intervals + timeouts, close cron jobs

## 10. Explorer

- [ ] 10.1 Create `schedule.explorer.ts` — `ScheduleExplorer` implementing `OnModuleInit`; inject `DiscoveryService`, `MetadataScanner`, `SchedulerMetadataAccessor`, `SchedulerOrchestrator`, `SCHEDULE_MODULE_OPTIONS`
- [ ] 10.2 Implement `explore()`: scan all providers + controllers, for each method call `lookupSchedulers`
- [ ] 10.3 Implement `lookupSchedulers`: switch on `SchedulerType`; respect `cronJobs`/`intervals`/`timeouts` feature flags; warn on non-static providers
- [ ] 10.4 Wrap all discovered handlers in try/catch blocks (log error, don't rethrow)

## 11. Module

- [ ] 11.1 Create `schedule.module.ts` — `ScheduleModule` with manual `forRoot(options?)` and `forRootAsync(options)` static methods (no `ConfigurableModuleBuilder` — needs DiscoveryModule import and non-standard wiring)
- [ ] 11.2 `forRoot`: return `{ global: true, module: ScheduleModule, imports: [DiscoveryModule], providers: [...], exports: [SchedulerRegistry] }`
- [ ] 11.3 `forRootAsync`: support `useFactory`, `useClass`, `useExisting` patterns; inject `SCHEDULE_MODULE_OPTIONS` token; apply default values (`cronJobs: true`, `intervals: true`, `timeouts: true`)
- [ ] 11.4 Provide `RedisJobStore` and `RedisPollLoop` in module providers, injecting `SCHEDULE_MODULE_OPTIONS` for the Redis client and keyPrefix

## 12. Public API (index.ts)

- [ ] 12.1 Create `src/index.ts` exporting: `ScheduleModule`, `SchedulerRegistry`, `SchedulerMetadataAccessor`, `Cron`, `Interval`, `Timeout`, `CronExpression`, `SchedulerType`, `CronOptions`, `ScheduleModuleOptions`, `ScheduleModuleAsyncOptions`, `ScheduleModuleOptionsFactory`, `IntervalMetadata`, `TimeoutMetadata`

## 13. Tests

- [ ] 13.1 Write unit tests for `RedisJobStore` — mock redis client, verify ZADD NX vs overwrite logic, verify Lua claim returns job name or null
- [ ] 13.2 Write unit tests for `RedisPollLoop` — mock job store, verify sleep duration, threshold skip, re-enqueue before dispatch
- [ ] 13.3 Write unit tests for `SchedulerRegistry` — duplicate throw, doesExist, deleteCronJob
- [ ] 13.4 Write integration tests (`*.int.spec.ts`) — bootstrap a NestJS test module with real Redis; verify exactly-one-execution across two parallel orchestrators; verify expression-change reschedule; verify disabled job never fires
- [ ] 13.5 Write integration test for drop-in compat — same decorator shapes as `@nestjs/schedule` compile and run correctly

## 14. Verification

- [ ] 14.1 `pnpm nx lint scheduler` passes
- [ ] 14.2 `pnpm nx typecheck scheduler` passes
- [ ] 14.3 `pnpm nx test scheduler` passes (Redis running)
- [ ] 14.4 `pnpm nx build scheduler` produces valid dist
- [ ] 14.5 Update root `README.md` or add `packages/scheduler/README.md` with usage example
