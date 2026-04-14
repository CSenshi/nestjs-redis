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
- Client, Cluster and Sentinel support
- Does not manage Redis connection lifecycle — pass an existing, managed client
- Six pluggable rate-limiting algorithms via `ThrottlerAlgorithm`
- All algorithms implemented as atomic Lua scripts (EVALSHA + NOSCRIPT fallback)
- Optional block key support: lock out a client for a configurable duration after exceeding the limit

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

### Without existing Redis connection

If you do not otherwise use Redis in your application, import `RedisModule` inside `forRootAsync` to scope the connection to the throttler:

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

### Without RedisModule

If you do not want to use `RedisModule`, create a client yourself and manage its lifecycle. `RedisThrottlerStorage` does not manage the lifecycle of the provided client.

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

## Algorithms

Pass a `ThrottlerAlgorithm` as the second argument to `RedisThrottlerStorage`. The default is `ThrottlerAlgorithm.FixedWindow`.

```typescript
import {
  RedisThrottlerStorage,
  ThrottlerAlgorithm,
} from '@nestjs-redis/throttler-storage';

new RedisThrottlerStorage(redis, ThrottlerAlgorithm.TokenBucket);
```

| Algorithm              | Memory | Accuracy        | Burst handling       | Best for                             |
| ---------------------- | ------ | --------------- | -------------------- | ------------------------------------ |
| `FixedWindow`          | O(1)   | Low at boundary | Up to 2× at boundary | Drop-in NestJS replacement (default) |
| `SlidingWindowLog`     | O(n)   | Exact           | None                 | Strict per-user limits               |
| `SlidingWindowCounter` | O(1)   | Good            | Smoothed             | General-purpose (recommended)        |
| `TokenBucket`          | O(1)   | Good            | Yes (up to capacity) | Bursty clients                       |
| `LeakyBucketPolicing`  | O(1)   | Good            | None (hard reject)   | Hard ingress cap, no queuing         |
| `LeakyBucketShaping`   | O(1)   | Good            | None (queued)        | Smooth output rate with queuing      |

**`FixedWindow` is the default** because `@nestjs/throttler`'s built-in in-memory storage uses fixed window internally — making this a true drop-in replacement with identical behavior. For new projects, **`SlidingWindowCounter`** is the recommended general-purpose choice: near-exact accuracy, low memory and no burst-at-boundary problem.

> **Learn more** — Each algorithm is based on the reference implementations in the [Redis rate limiting tutorial](https://redis.io/tutorials/howtos/ratelimiting/).

### Custom algorithm

You can also bring your own Lua script. The script receives `KEYS[1]` (the rate-limit key) and `ARGV[1..3]` (`ttlMs`, `limit`, `blockDurationMs`), and must return a 4-element array `[totalHits, timeToExpireMs, timeToBlockExpireMs, isBlocked]`.

For a complete example, see [fixed-window.algorithm.ts](src/lib/algorithms/fixed-window.algorithm.ts).

```typescript
new RedisThrottlerStorage(redis, {
  script: `
    local key = KEYS[1]
    local ttl_ms = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    -- ... your logic ...
    return { count, pttl, -1, 0 }
  `,
});
```

### Block duration

All algorithms support an optional block period. When `blockDuration` is set in your throttler config, a client that exceeds the limit is locked out for the full block duration, even after the rate-limit window resets.

```typescript
ThrottlerModule.forRootAsync({
  inject: [RedisToken()],
  useFactory: (redis) => ({
    throttlers: [{
      limit: 10,
      ttl: seconds(60),
      blockDuration: seconds(300), // block for 5 minutes after exceeding limit
    }],
    storage: new RedisThrottlerStorage(redis, ThrottlerAlgorithm.SlidingWindowLog),
  }),
}),
```

## Links

- Root repo: [CSenshi/nestjs-redis](https://github.com/CSenshi/nestjs-redis)
- Issues: [GitHub Issues](https://github.com/CSenshi/nestjs-redis/issues)
- Discussions: [GitHub Discussions](https://github.com/CSenshi/nestjs-redis/discussions)

## Contributing

Please see the [root contributing guidelines](https://github.com/CSenshi/nestjs-redis#contributing).

## License

MIT © [CSenshi](https://github.com/CSenshi)
