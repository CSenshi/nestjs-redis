<div align="center">

<img src="../../docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="120" height="120">

# @nestjs-redis/client

**Flexible, production-ready Redis client module for NestJS**

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fclient.svg)](https://www.npmjs.com/package/@nestjs-redis/client)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/client.svg)](https://www.npmjs.com/package/@nestjs-redis/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11+-red.svg)](https://nestjs.com/)
[![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

_Built on [node-redis](https://github.com/redis/node-redis) • Future-proof • Type-safe • Production-tested_

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

The `@nestjs-redis/client` package provides a modern, type-safe Redis integration for NestJS applications. Built on the official `node-redis` client, it offers:

- **Future-Proof Foundation**: Uses the actively maintained `node-redis` library instead of deprecated alternatives
- **NestJS Integration**: Seamless dependency injection and lifecycle management
- **Production Ready**: Battle-tested in high-traffic applications with automatic reconnection and error handling
- **Full Feature Support**: Complete Redis client, cluster, and sentinel mode support

---

## ✨ Features

- **🔗 Multi-Connection Support** — Handle multiple Redis connections with named instances
- **🏗️ Flexible Architecture** — Support for Redis client, cluster, and sentinel modes
- **💉 Dependency Injection** — Seamless integration with NestJS's DI container
- **🔄 Lifecycle Management** — Automatic connection handling and cleanup
- **🛡️ TypeScript First** — Comprehensive type definitions and IntelliSense support
- **🚀 Production Ready** — Battle-tested in high-traffic applications
- **⚡ Performance Optimized** — Connection pooling and efficient resource management

## 📦 Installation

```bash
# Install the package and Redis client
npm install @nestjs-redis/client redis

# Or with yarn
yarn add @nestjs-redis/client redis

# Or with pnpm
pnpm add @nestjs-redis/client redis
```

### Requirements

| Dependency       | Version | Required   |
| ---------------- | ------- | ---------- |
| `@nestjs/common` | ^11.0.0 | ✅ Peer    |
| `@nestjs/core`   | ^11.0.0 | ✅ Peer    |
| `redis`          | ^5.0.0  | ✅ Peer    |
| `Node.js`        | 18+     | ✅ Runtime |

## 🚀 Quick Start

### Single Connection

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { RedisClientModule } from '@nestjs-redis/client';

@Module({
  imports: [
    RedisClientModule.forRoot({
      url: 'redis://localhost:6379',
    }),
  ],
})
export class AppModule {}
```

```typescript
// app.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis, type Redis } from '@nestjs-redis/client';

@Injectable()
export class AppService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setValue(key: string, value: string) {
    await this.redis.set(key, value);
  }

  async getValue(key: string) {
    return this.redis.get(key);
  }
}
```

### Multi-Connection Setup

```typescript
// app.module.ts
@Module({
  imports: [
    RedisClientModule.forRoot({
      isGlobal: true,
      connections: [
        // Default connection
        { type: 'client', options: { url: 'redis://localhost:6379' } },
        // Named connections
        {
          connection: 'cache',
          type: 'client',
          options: { url: 'redis://cache:6379' },
        },
        {
          connection: 'sessions',
          type: 'client',
          options: { url: 'redis://sessions:6379' },
        },
        // Cluster connection
        {
          connection: 'cluster',
          type: 'cluster',
          options: { rootNodes: [{ url: 'redis://cluster:6379' }] },
        },
      ],
    }),
  ],
})
export class AppModule {}
```

```typescript
// multi.service.ts
import { Injectable } from '@nestjs/common';
import {
  InjectRedis,
  type Redis,
  type RedisCluster,
} from '@nestjs-redis/client';

@Injectable()
export class MultiService {
  constructor(
    @InjectRedis() private readonly defaultRedis: Redis,
    @InjectRedis('cache') private readonly cacheRedis: Redis,
    @InjectRedis('sessions') private readonly sessionRedis: Redis,
    @InjectRedis('cluster') private readonly clusterRedis: RedisCluster
  ) {}

  async cacheData(key: string, data: any) {
    await this.cacheRedis.setEx(key, 300, JSON.stringify(data));
  }

  async storeSession(sessionId: string, session: any) {
    await this.sessionRedis.setEx(
      `session:${sessionId}`,
      1800,
      JSON.stringify(session)
    );
  }

  async clusterOperation(key: string, value: string) {
    await this.clusterRedis.set(key, value);
  }
}
```

## 🔧 Configuration

All configuration options are passed directly to the [node-redis](https://github.com/redis/node-redis) client, ensuring full compatibility with the official Redis client.

### Basic Configuration

```typescript
RedisClientModule.forRoot({
  url: 'redis://localhost:6379',
  // Any node-redis client options
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
});
```

### Advanced Configuration

```typescript
RedisClientModule.forRoot({
  isGlobal: true, // Make module global
  type: 'client', // 'client' | 'cluster' | 'sentinel'
  options: {
    url: 'redis://localhost:6379',
    password: 'your-password',
    database: 0,
    socket: {
      connectTimeout: 5000,
      lazyConnect: true,
    },
    // All node-redis options supported
  },
});
```

### Async Configuration

```typescript
RedisClientModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    url: configService.get('REDIS_URL'),
    password: configService.get('REDIS_PASSWORD'),
    socket: {
      connectTimeout: configService.get('REDIS_CONNECT_TIMEOUT', 5000),
    },
  }),
});
```

### Cluster Configuration

```typescript
RedisClientModule.forRoot({
  type: 'cluster',
  options: {
    rootNodes: [
      { url: 'redis://node1:6379' },
      { url: 'redis://node2:6379' },
      { url: 'redis://node3:6379' },
    ],
    defaults: {
      password: 'cluster-password',
    },
  },
});
```

### Sentinel Configuration

```typescript
RedisClientModule.forRoot({
  type: 'sentinel',
  options: {
    sentinels: [
      { host: 'sentinel1', port: 26379 },
      { host: 'sentinel2', port: 26379 },
    ],
    name: 'mymaster',
    password: 'sentinel-password',
  },
});
```

## 📚 API Reference

### Module Configuration

#### `RedisClientModule.forRoot(options)`

| Option        | Type                                                                | Description                        | Default     |
| ------------- | ------------------------------------------------------------------- | ---------------------------------- | ----------- |
| `isGlobal`    | `boolean`                                                           | Make the module global             | `false`     |
| `type`        | `'client' \| 'cluster' \| 'sentinel'`                               | Redis connection type              | `'client'`  |
| `options`     | `RedisClientOptions \| RedisClusterOptions \| RedisSentinelOptions` | Redis configuration options        | `{}`        |
| `connections` | `Connection[]`                                                      | Multiple connection configurations | `undefined` |

#### `RedisClientModule.forRootAsync(options)`

| Option        | Type                                     | Description                           |
| ------------- | ---------------------------------------- | ------------------------------------- |
| `imports`     | `ModuleMetadata['imports']`              | Modules to import                     |
| `inject`      | `any[]`                                  | Dependencies to inject                |
| `useFactory`  | `(...args: any[]) => RedisModuleOptions` | Factory function                      |
| `useClass`    | `Type<RedisOptionsFactory>`              | Class that implements options factory |
| `useExisting` | `Type<RedisOptionsFactory>`              | Existing provider                     |

### Decorators

#### `@InjectRedis(connectionName?: string)`

Inject a Redis client instance into your service.

```typescript
@Injectable()
export class MyService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRedis('cache') private readonly cacheRedis: Redis
  ) {}
}
```

### Tokens

#### `RedisToken(connectionName?: string)`

Get the injection token for a Redis connection.
> For a fully working example, see how the [throttler module uses injected Redis](https://github.com/CSenshi/nestjs-redis/tree/main/packages/throttler-storage#with-existing-redis-connection-recommended). 

```typescript
@Module({
  imports: [
    RedisClientModule.forRoot({
      url: 'redis://localhost:6379',
    }),
  ],
  providers: [
    {
      inject: [RedisToken()], // <-- Returns injection token
      useFactory: (redis: Redis) => { // <-- you are able to have redis here because of RedisToken() injection
        ...
      }
      provide: 'CUSTOM_PROVIDER',
    },
  ],
})
export class MyModule {}
```

## 🔄 Migration Guide

### From @nestjs-modules/ioredis

The `@nestjs-modules/ioredis` package is a popular ioredis-based Redis integration for NestJS. Here's how to migrate:

#### Module Configuration

```typescript
// Before (@nestjs-modules/ioredis)
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: 'redis://localhost:6379',
    }),
  ],
})
export class AppModule {}

// After (@nestjs-redis/client)
import { RedisClientModule } from '@nestjs-redis/client';

@Module({
  imports: [
    RedisClientModule.forRoot({
      url: 'redis://localhost:6379',
    }),
  ],
})
export class AppModule {}
```

#### Service Injection

```typescript
// Before (@nestjs-modules/ioredis)
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class MyService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setValue(key: string, value: string) {
    await this.redis.set(key, value);
  }
}

// After (@nestjs-redis/client)
import { InjectRedis, type Redis } from '@nestjs-redis/client';

@Injectable()
export class MyService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setValue(key: string, value: string) {
    await this.redis.set(key, value);
  }
}
```

### From @liaoliaots/nestjs-redis

The `@liaoliaots/nestjs-redis` package is another popular ioredis-based solution. Migration is straightforward:

#### Module Configuration

```typescript
// Before (@liaoliaots/nestjs-redis)
import { Module } from '@nestjs/common';
import { RedisModule } from '@liaoliaots/nestjs-redis';

@Module({
  imports: [
    RedisModule.forRoot({
      readyLog: true,
      config: {
        host: 'localhost',
        port: 6379,
        password: 'your-password',
      },
    }),
  ],
})
export class AppModule {}

// After (@nestjs-redis/client)
import { Module } from '@nestjs/common';
import { RedisClientModule } from '@nestjs-redis/client';

@Module({
  imports: [
    RedisClientModule.forRoot({
      url: 'redis://:your-password@localhost:6379',
    }),
  ],
})
export class AppModule {}
```

#### Service Injection

```typescript
// Before (@liaoliaots/nestjs-redis)
import { Injectable } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';

@Injectable()
export class MyService {
  private readonly redis: Redis | null;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getOrThrow();
  }

  async getValue(key: string): Promise<string | null> {
    return await this.redis!.get(key);
  }
}

// After (@nestjs-redis/client)
import { Injectable } from '@nestjs/common';
import { InjectRedis, type Redis } from '@nestjs-redis/client';

@Injectable()
export class MyService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getValue(key: string): Promise<string | null> {
    return this.redis.get(key);
  }
}
```

### Important Notes

**⚠️ API Changes**: Both `@nestjs-modules/ioredis` and `@liaoliaots/nestjs-redis` use the `ioredis` client library, while `@nestjs-redis/client` uses the official `node-redis` client. You'll need to update your Redis command usage to match the [node-redis API](https://github.com/redis/node-redis) when migrating. Most commands are similar, but some have different names or parameter formats.

---

## 🤝 Contributing

Contributions are welcome! Please see the [main repository](https://github.com/CSenshi/nestjs-redis) for contributing guidelines.

---

## 📄 License

MIT © [CSenshi](https://github.com/CSenshi)
