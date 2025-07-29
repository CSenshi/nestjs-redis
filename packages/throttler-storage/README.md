<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="120" height="120">

# @nestjs-redis/throttler-storage

**Redis storage for NestJS Throttler with distributed rate limiting**

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fthrottler-storage.svg)](https://www.npmjs.com/package/@nestjs-redis/throttler-storage)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/throttler-storage.svg)](https://www.npmjs.com/package/@nestjs-redis/throttler-storage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/)
[![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

_Built on [node-redis](https://github.com/redis/node-redis) • Drop-in replacement • Distributed rate limiting_

</div>

---

## 📋 Table of Contents

- [🎯 Why This Package?](#-why-this-package)
- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [🔧 Configuration](#-configuration)
- [📚 API Reference](#-api-reference)
- [🔄 Migration Guide](#-migration-guide)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🎯 Why This Package?

The `@nestjs-redis/throttler-storage` package provides Redis-based storage for NestJS Throttler, enabling distributed rate limiting across multiple application instances. Key benefits:

- **Distributed Rate Limiting**: Share rate limits across multiple app instances and servers
- **Production Tested**: Battle-tested in high-traffic production environments
- **Drop-in Replacement**: Seamlessly replaces the default in-memory throttler storage
- **Future-Proof**: Built on the modern `node-redis` client for long-term reliability

---

## ✨ Features

- **🚀 Production Ready** — Tested and used in high-traffic production environments
- **🔄 Drop-in Replacement** — Works seamlessly with existing NestJS Throttler setup
- **🌐 Distributed Rate Limiting** — Share rate limits across multiple application instances
- **🏗️ Multi-Redis Support** — Compatible with Redis Client, Cluster, and Sentinel
- **🎯 Clean Factory API** — Explicit static methods for clear initialization
- **⚡ Lifecycle Management** — Automatic connection handling and cleanup
- **🛡️ Type Safe** — Full TypeScript support with comprehensive type definitions

## 📦 Installation

```bash
# Install the package and dependencies
npm install @nestjs-redis/throttler-storage redis

# Or with yarn
yarn add @nestjs-redis/throttler-storage redis

# Or with pnpm
pnpm add @nestjs-redis/throttler-storage redis
```

### Requirements

| Dependency          | Version                          | Required   |
| ------------------- | -------------------------------- | ---------- |
| `@nestjs/common`    | ^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0 | ✅ Peer    |
| `@nestjs/throttler` | ^6.4.0                           | ✅ Peer    |
| `redis`             | ^5.0.0                           | ✅ Peer    |
| `Node.js`           | 18+                              | ✅ Runtime |

## 🚀 Quick Start

### With existing Redis connection (Recommended)

**Single connection:**

```ts
import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { RedisModule, RedisToken } from '@nestjs-redis/client';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';

@Module({
  imports: [
    RedisModule.forRoot({
      url: 'redis://localhost:6379',
    }),
    ThrottlerModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis) => ({
        throttlers: [{ limit: 5, ttl: seconds(60) }],
        storage: RedisThrottlerStorage.from(redis),
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
import { RedisModule, RedisToken } from '@nestjs-redis/client';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';

@Module({
  imports: [
    RedisModule.forRoot({
      connections: [
        {
          connection: 'cache',
          type: 'client',
          options: { url: 'redis://localhost:6379' },
        },
        {
          connection: 'throttling',
          type: 'client',
          options: { url: 'redis://localhost:6380' },
        },
      ],
    }),
    ThrottlerModule.forRootAsync({
      inject: [RedisToken('throttling')],
      useFactory: (redis) => ({
        throttlers: [{ limit: 5, ttl: seconds(60) }],
        storage: RedisThrottlerStorage.from(redis),
      }),
    }),
  ],
})
export class AppModule {}
```

## 🔧 Configuration

### Static Factory Methods

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';
import { createClient, createCluster, createSentinel } from 'redis';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 5, ttl: seconds(60) }],

      // Generic method for existing Redis client/cluster/sentinel
      storage: RedisThrottlerStorage.from(
        createClient({ url: 'redis://localhost:6379' })
      ),

      // Redis client from options
      storage: RedisThrottlerStorage.fromClientOptions({
        url: 'redis://localhost:6379',
      }),

      // Redis cluster from options
      storage: RedisThrottlerStorage.fromClusterOptions({
        rootNodes: [{ url: 'redis://localhost:7000' }],
      }),

      // Redis sentinel from options
      storage: RedisThrottlerStorage.fromSentinelOptions({
        sentinels: [{ host: 'localhost', port: 26379 }],
        name: 'mymaster',
      }),
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [{ limit: 10, ttl: seconds(60) }],
        storage: RedisThrottlerStorage.fromClientOptions({
          url: configService.get('REDIS_URL'),
          password: configService.get('REDIS_PASSWORD'),
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

## 📚 API Reference

### Factory Methods

| Method                         | Description                                                                                  | Lifecycle Management |
| ------------------------------ | -------------------------------------------------------------------------------------------- | -------------------- |
| `from(client)`                 | Unified method for existing Redis client/cluster/sentinel with optional lifecycle management | ❌ Not managed       |
| `fromClientOptions(options)`   | Creates Redis client from options                                                            | ✅ Managed           |
| `fromClusterOptions(options)`  | Creates Redis cluster from options                                                           | ✅ Managed           |
| `fromSentinelOptions(options)` | Creates Redis sentinel from options                                                          | ✅ Managed           |

**Lifecycle Management**:

- ✅ **Managed**: The storage instance will automatically connect/disconnect the Redis instance during application bootstrap/shutdown.
- ❌ **Not managed**: You are responsible for managing the Redis connection lifecycle.
- 🔧 **Configurable**: Lifecycle management can be controlled via the optional `manageClientLifecycle` parameter (defaults to `false`).

### Storage Interface

The `RedisThrottlerStorage` implements the NestJS `ThrottlerStorage` interface:

```typescript
interface ThrottlerStorage {
  increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number
  ): Promise<ThrottlerStorageRecord>;
}

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
}
```

## 🔄 Migration Guide

### From In-Memory Storage

```typescript
// Before (in-memory)
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 10, ttl: seconds(60) }],
      // No storage specified - uses in-memory by default
    }),
  ],
})
export class AppModule {}

// After (Redis storage)
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 10, ttl: seconds(60) }],
      storage: RedisThrottlerStorage.fromClientOptions({
        url: 'redis://localhost:6379',
      }),
    }),
  ],
})
export class AppModule {}
```

---

## 🤝 Contributing

Contributions are welcome! Please see the [main repository](https://github.com/CSenshi/nestjs-redis) for contributing guidelines.

---

## 📄 License

MIT © [CSenshi](https://github.com/CSenshi)
