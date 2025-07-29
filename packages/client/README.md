<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="120" height="120">

# @nestjs-redis/client

**Flexible, production-ready Redis client module for NestJS with multi-connection support, built on the modern node-redis client**

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fclient.svg)](https://www.npmjs.com/package/@nestjs-redis/client)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/client.svg)](https://www.npmjs.com/package/@nestjs-redis/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/)
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
- **⚙️ Async Configuration** — Full support for dynamic configuration with `forRootAsync`
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

| Dependency       | Version                          | Required   |
| ---------------- | -------------------------------- | ---------- |
| `@nestjs/common` | ^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0 | ✅ Peer    |
| `@nestjs/core`   | ^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0 | ✅ Peer    |
| `redis`          | ^5.0.0                           | ✅ Peer    |
| `Node.js`        | 18+                              | ✅ Runtime |

## 🚀 Quick Start

### Single Connection

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-redis/client';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'client',
      options: {
        url: 'redis://localhost:6379',
      },
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
    // Default connection
    RedisModule.forRoot({
      isGlobal: true,
      type: 'client',
      options: {
        url: 'redis://localhost:6379',
      },
    }),
    // Named connections using separate forRoot calls
    RedisModule.forRoot({
      connectionName: 'cache',
      type: 'client',
      options: {
        url: 'redis://cache:6379',
      },
    }),
    RedisModule.forRoot({
      connectionName: 'sessions',
      type: 'client',
      options: {
        url: 'redis://sessions:6379',
      },
    }),
    // Cluster connection
    RedisModule.forRoot({
      connectionName: 'cluster',
      type: 'cluster',
      options: { rootNodes: [{ url: 'redis://cluster:6379' }] },
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
RedisModule.forRoot({
  type: 'client',
  options: {
    url: 'redis://localhost:6379',
    // Any node-redis client options
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    },
  },
});
```

### Advanced Configuration

```typescript
RedisModule.forRoot({
  connectionName: 'myConnection', // Optional connection name
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
    // All node-redis options supported directly
  },
});
```

### Async Configuration

The `forRootAsync()` method supports dynamic configuration using factories, existing services, or configuration classes.

#### Using `useFactory`

```typescript
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'client',
        options: {
          url: configService.get('REDIS_URL') || 'redis://localhost:6379',
          password: configService.get('REDIS_PASSWORD'),
          database: configService.get('REDIS_DB') || 0,
        },
      }),
    }),
  ],
})
export class AppModule {}
```

#### Using Configuration Classes

```typescript
import { Injectable } from '@nestjs/common';
import { RedisOptionsFactory, RedisModuleOptions } from '@nestjs-redis/client';

@Injectable()
export class RedisConfigService implements RedisOptionsFactory {
  createRedisOptions(): RedisModuleOptions {
    return {
      type: 'client',
      options: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        },
      },
    };
  }
}

@Module({
  imports: [
    RedisModule.forRootAsync({
      useClass: RedisConfigService,
    }),
  ],
  providers: [RedisConfigService],
})
export class AppModule {}
```

#### Using Existing Services

```typescript
@Module({
  imports: [
    RedisModule.forRootAsync({
      useExisting: RedisConfigService,
    }),
  ],
  providers: [RedisConfigService],
})
export class AppModule {}
```

#### Named Connections with Async Configuration

```typescript
@Module({
  imports: [
    // Default connection
    RedisModule.forRootAsync({
      isGlobal: true,
      useFactory: (configService: ConfigService) => ({
        type: 'client',
        options: {
          url: configService.get('REDIS_URL'),
        },
      }),
      inject: [ConfigService],
    }),
    // Named cache connection
    RedisModule.forRootAsync({
      connectionName: 'cache',
      useFactory: (configService: ConfigService) => ({
        type: 'client',
        options: {
          url: configService.get('REDIS_CACHE_URL'),
        },
      }),
      inject: [ConfigService],
    }),
    // Named sessions connection
    RedisModule.forRootAsync({
      connectionName: 'sessions',
      useFactory: (configService: ConfigService) => ({
        type: 'cluster',
        options: {
          rootNodes: [
            { url: configService.get('REDIS_SESSION_NODE_1') },
            { url: configService.get('REDIS_SESSION_NODE_2') },
          ],
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Cluster Configuration

```typescript
RedisModule.forRoot({
  connectionName: 'cluster', // Optional connection name
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
RedisModule.forRoot({
  connectionName: 'sentinel', // Optional connection name
  type: 'sentinel',
  options: {
    sentinelRootNodes: [
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

#### `RedisModule.forRoot(options)`

| Option           | Type                                                                | Description                 | Default     |
| ---------------- | ------------------------------------------------------------------- | --------------------------- | ----------- |
| `connectionName` | `string`                                                            | Name for the connection     | `undefined` |
| `isGlobal`       | `boolean`                                                           | Make the module global      | `false`     |
| `type`           | `'client' \| 'cluster' \| 'sentinel'`                               | Redis connection type       | `'client'`  |
| `options`        | `RedisClientOptions \| RedisClusterOptions \| RedisSentinelOptions` | Redis configuration options | `{}`        |

#### `RedisModule.forRootAsync(options)`

Async configuration method for dynamic Redis setup.

| Option           | Type                              | Description                                           | Default     |
| ---------------- | --------------------------------- | ----------------------------------------------------- | ----------- |
| `connectionName` | `string`                          | Name for the connection                               | `undefined` |
| `isGlobal`       | `boolean`                         | Make the module global                                | `false`     |
| `useFactory`     | `(...args) => RedisModuleOptions` | Factory function to create Redis options              | `undefined` |
| `useClass`       | `Type<RedisOptionsFactory>`       | Class that implements RedisOptionsFactory             | `undefined` |
| `useExisting`    | `Type<RedisOptionsFactory>`       | Existing provider that implements RedisOptionsFactory | `undefined` |
| `inject`         | `any[]`                           | Dependencies to inject into useFactory                | `[]`        |
| `imports`        | `any[]`                           | Modules to import for dependency injection            | `[]`        |

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
    RedisModule.forRoot({
      options: {
        url: 'redis://localhost:6379',
      },
    }),
  ],
  providers: [
    {
      inject: [RedisToken()], // <-- Returns injection token
      useFactory: (redis: Redis) => {
        // <-- you are able to have redis here because of RedisToken() injection
        // Use redis instance here
        return new MyCustomService(redis);
      },
      provide: 'CUSTOM_PROVIDER',
    },
  ],
})
export class MyModule {}
```

### Interfaces

#### `RedisOptionsFactory`

Interface for creating configuration classes that can be used with `useClass` or `useExisting`.

```typescript
export interface RedisOptionsFactory {
  createRedisOptions(): Promise<RedisModuleOptions> | RedisModuleOptions;
}
```

## 🤝 Contributing

Contributions are welcome! Please see the [main repository](https://github.com/CSenshi/nestjs-redis) for contributing guidelines.

---

## 📄 License

MIT © [CSenshi](https://github.com/CSenshi)
