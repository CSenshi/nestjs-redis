# @nestjs-redis/throttler-storage

Redis storage implementation for [NestJS Throttler](https://github.com/nestjs/throttler) with support for Redis Client, Cluster, and Sentinel configurations.

## Features

- **Production ready**: Tested and used in production
- **Fully compatible**: Tested against official NestJS in-memory storage provider
- **Drop-in replacement**: Works with existing throttler setup
- **Distributed**: Share rate limiting across multiple app instances
- **Multi-Redis support**: Works with Redis Client, Cluster, and Sentinel
- **Clean API**: Explicit static factory methods for clear initialization

## Installation

```bash
npm install @nestjs-redis/throttler-storage redis
```

> **Note:** `@nestjs/common` and `redis` are required as peer dependencies.

## Usage

### With existing Redis connection (Recommended)

**Single connection:**
```ts
import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { RedisClientModule, getRedisClientInjectionToken } from '@nestjs-redis/client';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';

@Module({
  imports: [
    RedisClientModule.forRoot({
      url: 'redis://localhost:6379'
    }),
    ThrottlerModule.forRootAsync({
      inject: [getRedisClientInjectionToken()],
      useFactory: (redis) => ({
        throttlers: [{ limit: 5, ttl: seconds(60) }],
        storage: RedisThrottlerStorage.fromClient(redis),
      }),
    }),
  ],
})
export class AppModule {}
```

**Named connection (multi-connection):**
```ts
import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { RedisClientModule, getRedisClientInjectionToken } from '@nestjs-redis/client';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';

@Module({
  imports: [
    RedisClientModule.forRoot({
      connections: [
        { connection: 'cache', type: 'client', options: { url: 'redis://localhost:6379' } },
        { connection: 'throttling', type: 'client', options: { url: 'redis://localhost:6380' } },
      ]
    }),
    ThrottlerModule.forRootAsync({
      inject: [getRedisClientInjectionToken('throttling')],
      useFactory: (redis) => ({
        throttlers: [{ limit: 5, ttl: seconds(60) }],
        storage: RedisThrottlerStorage.fromClient(redis),
      }),
    }),
  ],
})
export class AppModule {}
```

### Static Factory Methods

```ts
import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';
import { createClient, createCluster, createSentinel } from 'redis';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 5, ttl: seconds(60) }],

      // Below are all available factory methods for creating storage instances

      // Default Redis client (localhost:6379)
      storage: RedisThrottlerStorage.create(),

      // Redis client from options
      storage: RedisThrottlerStorage.fromClientOptions({ 
        url: 'redis://localhost:6379' 
      }),

      // Existing Redis client (lifecycle NOT managed)
      storage: RedisThrottlerStorage.fromClient(
        createClient({ url: 'redis://localhost:6379' })
      ),

      // Redis cluster from options
      storage: RedisThrottlerStorage.fromClusterOptions({ 
        rootNodes: [{ url: 'redis://localhost:7000' }] 
      }),

      // Existing Redis cluster (lifecycle NOT managed)
      storage: RedisThrottlerStorage.fromCluster(
        createCluster({ rootNodes: [{ url: 'redis://localhost:7000' }] })
      ),

      // Redis sentinel from options
      storage: RedisThrottlerStorage.fromSentinelOptions({ 
        sentinels: [{ host: 'localhost', port: 26379 }],
        name: 'mymaster'
      }),

      // Existing Redis sentinel (lifecycle NOT managed)
      storage: RedisThrottlerStorage.fromSentinel(
        createSentinel({ 
          sentinels: [{ host: 'localhost', port: 26379 }],
          name: 'mymaster'
        })
      ),
    }),
  ],
})
export class AppModule {}
```

## Factory Methods Reference

| Method | Description | Lifecycle Management |
|--------|-------------|---------------------|
| `create()` | Creates default Redis client (localhost:6379) | ✅ Managed |
| `fromClientOptions(options)` | Creates Redis client from options | ✅ Managed |
| `fromClient(client)` | Uses existing Redis client | ❌ Not managed |
| `fromClusterOptions(options)` | Creates Redis cluster from options | ✅ Managed |
| `fromCluster(cluster)` | Uses existing Redis cluster | ❌ Not managed |
| `fromSentinelOptions(options)` | Creates Redis sentinel from options | ✅ Managed |
| `fromSentinel(sentinel)` | Uses existing Redis sentinel | ❌ Not managed |

**Lifecycle Management**: When marked as "Managed", the storage instance will automatically connect/disconnect the Redis instance during application bootstrap/shutdown.

## License

MIT
