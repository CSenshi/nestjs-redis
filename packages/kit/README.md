<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="200" height="200">

# @nestjs-redis/kit

All-in-one convenience package that re-exports every module in the NestJS Redis Toolkit. Install once, use everywhere.

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fkit.svg)](https://www.npmjs.com/package/@nestjs-redis/kit)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/kit.svg)](https://www.npmjs.com/package/@nestjs-redis/kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/) [![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

</div>

---

## Features

- Single dependency with all toolkit modules re-exported
- Import everything from a single entrypoint: `@nestjs-redis/kit`
- First-class TypeScript types and NestJS DI patterns
- Built on the official `node-redis` client

## Installation

```bash
npm install @nestjs-redis/kit redis
# or
yarn add @nestjs-redis/kit redis
# or
pnpm add @nestjs-redis/kit redis
```

If you only need a specific capability, you can also install a single package directly (e.g., client only):

```bash
npm install @nestjs-redis/client redis
```

## Quick Start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import {
  InjectRedis,
  Redis,
  RedisHealthIndicator,
  RedisModule,
  RedisThrottlerStorage,
  RedisToken,
  RedlockModule,
} from '@nestjs-redis/kit';

@Module({
  imports: [
    // Client
    RedisModule.forRoot({ options: { url: 'redis://localhost:6379' } }),

    // Locking
    RedlockModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis: Redis) => ({ clients: [redis] }),
    }),

    // Throttling
    ThrottlerModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis: Redis) => ({
        throttlers: [{ limit: 5, ttl: seconds(60) }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),

    // Health checks
    TerminusModule,
  ],
  providers: [RedisHealthIndicator],
})
export class AppModule {}
```

```typescript
// usage.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis, type Redis, Redlock } from '@nestjs-redis/kit';

@Injectable()
export class DemoService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Redlock('demo:critical', 5000)
  async doCriticalWork() {
    await this.redis.set('key', 'value');
  }
}
```

## Links

- Root repo: [CSenshi/nestjs-redis](https://github.com/CSenshi/nestjs-redis)
- Issues: [GitHub Issues](https://github.com/CSenshi/nestjs-redis/issues)
- Discussions: [GitHub Discussions](https://github.com/CSenshi/nestjs-redis/discussions)

## Contributing

Please see the [root contributing guidelines](https://github.com/CSenshi/nestjs-redis#contributing).

## License

MIT © [CSenshi](https://github.com/CSenshi)
