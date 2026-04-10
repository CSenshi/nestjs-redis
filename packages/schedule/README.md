<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="200" height="200">

# @nestjs-redis/schedule

Drop-in replacement for `@nestjs/schedule` with Redis-backed distributed cron execution

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fschedule.svg)](https://www.npmjs.com/package/@nestjs-redis/schedule)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/schedule.svg)](https://www.npmjs.com/package/@nestjs-redis/schedule)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/) [![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

</div>

---

## Features

- Drop-in replacement - Same `@Cron`, `@Interval`, `@Timeout` decorators and other APIs as `@nestjs/schedule`
- Distributed cron execution - Redis locking guarantees a job fires on exactly one instance per tick
- Redis persistence for cron jobs — schedules survive process restarts
- Works with existing `@nestjs-redis/client` connections

## Installation

```bash
npm install @nestjs-redis/schedule
```

## Quick Start

```typescript
// app.module.ts
@Module({
  imports: [
    RedisModule.forRoot({ options: { url: 'redis://localhost:6379' } }),
    ScheduleModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (client) => ({ client }),
    }),
  ],
})
export class AppModule {}
```

```typescript
// tasks.service.ts
@Injectable()
export class TasksService {
  @Cron(CronExpression.EVERY_MINUTE)
  handleCron() {
    // runs on exactly one instance per tick, even with many replicas
  }
}
```

## Migrating from `@nestjs/schedule`

1. Swap the import:

```diff
-import { ScheduleModule, Cron } from '@nestjs/schedule';
+import { ScheduleModule, Cron } from '@nestjs-redis/schedule';
```

2. Pass a Redis client:

```diff
-ScheduleModule.forRoot()
+ScheduleModule.forRootAsync({
+  inject: [RedisToken()],
+  useFactory: (client) => ({ client }),
+})
```

For full API documentation refer to the [official `@nestjs/schedule` docs](https://docs.nestjs.com/techniques/task-scheduling).

> **Note:** `@Interval` and `@Timeout` use native Node.js timers and run on every instance, identical to `@nestjs/schedule`. Only `@Cron` jobs are distributed via Redis.

## Links

- Root repo: [CSenshi/nestjs-redis](https://github.com/CSenshi/nestjs-redis)
- Issues: [GitHub Issues](https://github.com/CSenshi/nestjs-redis/issues)
- Discussions: [GitHub Discussions](https://github.com/CSenshi/nestjs-redis/discussions)

## Contributing

Please see the [root contributing guidelines](https://github.com/CSenshi/nestjs-redis#contributing).

## License

MIT © [CSenshi](https://github.com/CSenshi)
