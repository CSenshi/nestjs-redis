<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="200" height="200">

# @nestjs-redis/throttler-storage

Redis-backed storage for NestJS Throttler enabling distributed rate limiting across instances.

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fthrottler-storage.svg)](https://www.npmjs.com/package/@nestjs-redis/throttler-storage)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/throttler-storage.svg)](https://www.npmjs.com/package/@nestjs-redis/throttler-storage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/) [![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

</div>

---

## Features

- Distributed rate limiting with Redis
- Drop-in replacement for in-memory storage
- Works with existing `@nestjs-redis/client` connections
- Client, Cluster, and Sentinel support
- Does not manage Redis connection lifecycle — pass an existing, managed client

## Installation

```bash
npm install @nestjs-redis/throttler-storage @nestjs-redis/client redis
```

The recommended approach is to use `RedisModule` from `@nestjs-redis/client` so Redis connections are lifecycle-managed by Nest (connect/disconnect with your app). Alternatively, you can pass your own Redis client (e.g. created with `createClient()` from `redis`) and manage its lifecycle yourself.

## Quick Start

### With existing Redis connection (Recommended)

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { RedisModule, RedisToken } from '@nestjs-redis/client';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';

@Module({
  imports: [
    RedisModule.forRoot({ options: { url: 'redis://localhost:6379' } }),
    ThrottlerModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis) => ({
        throttlers: [{ limit: 5, ttl: seconds(60) }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
  ],
})
export class AppModule {}
```

### Without existing Redis connection (Recommended)

If you do not otherwise use Redis in your application and want it only for throttler storage, you can declare the connection within the `ThrottlerModule` scope by importing `RedisModule` inside `forRootAsync`.

```typescript
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [
        RedisModule.forRoot({ options: { url: 'redis://localhost:6379' } }),
      ],
      inject: [RedisToken()],
      useFactory: (redis) => ({
        throttlers: [{ limit: 5, ttl: seconds(60) }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
  ],
})
export class AppModule {}
```

### Without existing Redis connection and without RedisModule

If you do not want to use `RedisModule`, create a client yourself and manage its lifecycle (connect/disconnect). `RedisThrottlerStorage` does not manage the lifecycle of the provided client.

```typescript
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: async () => {
        const redis = createClient({ url: 'redis://localhost:6379' });
        await redis.connect();
        return {
          throttlers: [{ limit: 5, ttl: seconds(60) }],
          storage: new RedisThrottlerStorage(redis),
        };
      },
    }),
  ],
})
export class AppModule {}
```

## Links

- Root repo: [CSenshi/nestjs-redis](https://github.com/CSenshi/nestjs-redis)
- Issues: [GitHub Issues](https://github.com/CSenshi/nestjs-redis/issues)
- Discussions: [GitHub Discussions](https://github.com/CSenshi/nestjs-redis/discussions)

## Contributing

Please see the [root contributing guidelines](https://github.com/CSenshi/nestjs-redis#contributing).

## License

MIT © [CSenshi](https://github.com/CSenshi)
