# @nestjs-redis/scheduler

Redis-backed distributed cron scheduler for NestJS — a drop-in replacement for `@nestjs/schedule` with an **exactly-one-instance-per-tick** guarantee across horizontally-scaled deployments.

## Why

`@nestjs/schedule` fires every `@Cron` job on every instance. On ECS with 10 tasks, each job runs 10 times per tick. This package uses a Redis sorted set as a distributed clock: exactly one instance claims and executes each job per scheduled tick.

## Installation

```bash
npm install @nestjs-redis/scheduler
# peer deps: @nestjs/common, @nestjs/core, redis
```

## Usage

### Replace the import path — nothing else changes

```ts
// Before
import { ScheduleModule, Cron, CronExpression } from '@nestjs/schedule';

// After
import { ScheduleModule, Cron, CronExpression } from '@nestjs-redis/scheduler';
```

### Bootstrap

```ts
import { Module } from '@nestjs/common';
import { RedisModule, RedisToken } from '@nestjs-redis/client';
import { ScheduleModule } from '@nestjs-redis/scheduler';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      options: { url: 'redis://localhost:6379' },
    }),
    ScheduleModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis) => ({ client: redis }),
    }),
  ],
})
export class AppModule {}
```

### Decorators

```ts
import { Injectable } from '@nestjs/common';
import {
  Cron,
  CronExpression,
  Interval,
  Timeout,
} from '@nestjs-redis/scheduler';

@Injectable()
export class TasksService {
  // Fires every minute — exactly once across all instances
  @Cron(CronExpression.EVERY_MINUTE)
  handleCron() {
    console.log('Running distributed cron job');
  }

  // Named job with timezone
  @Cron('0 9 * * 1-5', { name: 'dailyReport', timeZone: 'America/New_York' })
  sendDailyReport() {}

  // Process-local interval (not distributed — same as @nestjs/schedule)
  @Interval(5000)
  handleInterval() {}

  // Process-local timeout
  @Timeout(3000)
  handleTimeout() {}
}
```

### Options

| Option            | Type              | Default       | Description                                            |
| ----------------- | ----------------- | ------------- | ------------------------------------------------------ |
| `client`          | `RedisClientType` | required      | Redis client instance                                  |
| `keyPrefix`       | `string`          | `'scheduler'` | Redis key namespace (`{prefix}:jobs`, `{prefix}:meta`) |
| `shutdownTimeout` | `number`          | `5000`        | Ms to wait for in-flight handlers on shutdown          |
| `cronJobs`        | `boolean`         | `true`        | Enable/disable `@Cron` discovery                       |
| `intervals`       | `boolean`         | `true`        | Enable/disable `@Interval` discovery                   |
| `timeouts`        | `boolean`         | `true`        | Enable/disable `@Timeout` discovery                    |

### `@Cron` options

| Option      | Description                                            |
| ----------- | ------------------------------------------------------ |
| `name`      | Unique job name (default: `ClassName.methodName`)      |
| `timeZone`  | IANA timezone (e.g. `'America/New_York'`)              |
| `disabled`  | Skip Redis registration; job won't fire automatically  |
| `threshold` | Max ms late before skipping execution (default: `250`) |

### SchedulerRegistry

```ts
import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs-redis/scheduler';

@Injectable()
export class ManagementService {
  constructor(private registry: SchedulerRegistry) {}

  pauseJob(name: string) {
    this.registry.getCronJob(name).stop();
  }

  resumeJob(name: string) {
    this.registry.getCronJob(name).start();
  }

  listJobs() {
    return [...this.registry.getCronJobs().keys()];
  }
}
```

## How it works

1. On bootstrap each `@Cron` job is registered in a Redis sorted set (`ZADD NX`) with score = next occurrence (Unix ms)
2. Each instance runs a smart poll loop: `ZRANGE 0 0` → sleep until score → attempt atomic Lua claim
3. The Lua script atomically `ZRANGEBYSCORE + ZREM` — only one instance succeeds
4. The winner re-enqueues the next occurrence **before** invoking the handler
5. Expression changes on redeploy are detected via a companion Redis Hash and the schedule is updated

## Migration from `@nestjs/schedule`

1. Install `@nestjs-redis/scheduler`
2. Replace import path
3. Update `ScheduleModule.forRoot()` → `ScheduleModule.forRootAsync({ inject: [redisToken], useFactory: (redis) => ({ client: redis }) })`
4. Ensure Redis is available
5. Remove `@nestjs/schedule`
