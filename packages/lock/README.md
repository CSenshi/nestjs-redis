<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="120" height="120">

# @nestjs-redis/lock

**Distributed locking for NestJS applications using Redis and the Redlock algorithm**

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Flock.svg)](https://www.npmjs.com/package/@nestjs-redis/lock)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/lock.svg)](https://www.npmjs.com/package/@nestjs-redis/lock)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/)
[![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

_Built on [@redis-kit/lock](https://github.com/CSenshi/redis-kit/tree/main/packages/lock) • [node-redis](https://github.com/redis/node-redis) • Redlock algorithm • Distributed locking • Production-tested_

</div>

---

## 📋 Table of Contents

- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [🔧 Configuration](#-configuration)
- [📚 API Reference](#-api-reference)
- [🔗 Built on @redis-kit/lock](#-built-on-redis-kitlock)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 📦 Installation

```bash
# Install the package and dependencies
npm install @nestjs-redis/lock

# Or with yarn
yarn add @nestjs-redis/lock

# Or with pnpm
pnpm add @nestjs-redis/lock
```

### Requirements

| Dependency             | Version                          | Required   |
| ---------------------- | -------------------------------- | ---------- |
| `@nestjs/common`       | ^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0 | ✅ Peer    |
| `Node.js`              | 18+                              | ✅ Runtime |

## 🚀 Quick Start

### Module Setup

```typescript
import { Module } from '@nestjs/common';
import { RedisModule, RedisToken } from '@nestjs-redis/client';
import { RedlockModule } from '@nestjs-redis/lock';

@Module({
  imports: [
    RedisModule.forRoot({
      options: { url: 'redis://localhost:6379' },
    }),
    RedlockModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis) => ({
        clients: [redis],
      }),
    }),
  ],
})
export class AppModule {}
```

> **Recommended Approach**: Using `RedisModule` from `@nestjs-redis/client` is the recommended way as it automatically manages the lifecycle of Redis instances (connection/disconnection).

> While you can create Redis clients directly using `createClient()` in the `RedlockModule` declaration, you would need to manually manage the connection lifecycle.

### Using the @Redlock Decorator

```typescript
import { Injectable } from '@nestjs/common';
import { Redlock } from '@nestjs-redis/lock';

@Injectable()
export class UserService {
  @Redlock('user:update', 5000) // <- Locks execution for other processes
  async updateUserBalance(userId: string, amount: number) {
    const user = await this.getUserById(userId);
    user.balance += amount;
    await this.saveUser(user);
    return user;
  }
}
```

### Direct Service Usage

```typescript
import { Injectable } from '@nestjs/common';
import { RedlockService } from '@nestjs-redis/lock';

@Injectable()
export class PaymentService {
  // 1. Inject RedlockService
  constructor(private readonly redlock: RedlockService) {}

  async processPayment(paymentId: string) {
    // 2. Use it in custom way
    return await this.redlock.withLock(
      [`payment:${paymentId}`],
      5000,
      async () => {
        // ... Do some critical task
      },
    );
  }
}
```

## 🔧 Configuration

### Basic Configuration

```typescript
RedlockModule.forRootAsync({
  inject: [RedisToken()],
  useFactory: (redis) => ({
    clients: [redis],
    redlockConfig: {
      retryCount: 3,
      retryDelay: 200,
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    },
  }),
});
```

### Multi-Redis Configuration

```typescript
@Module({
  imports: [
    RedisModule.forRoot({
      connectionName: 'primary',
      options: { url: 'redis://primary:6379' },
    }),
    RedisModule.forRoot({
      connectionName: 'secondary',
      options: { url: 'redis://secondary:6379' },
    }),
    RedlockModule.forRootAsync({
      inject: [RedisToken('primary'), RedisToken('secondary')],
      useFactory: (primaryRedis, secondaryRedis) => ({
        clients: [primaryRedis, secondaryRedis],
        redlockConfig: {
          retryCount: 5,
          retryDelay: 100,
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedlockModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, RedisToken()],
      useFactory: (configService: ConfigService, redis) => ({
        clients: [redis],
        redlockConfig: {
          retryCount: configService.get('REDLOCK_RETRY_COUNT', 3),
          retryDelay: configService.get('REDLOCK_RETRY_DELAY', 200),
          retryJitter: configService.get('REDLOCK_RETRY_JITTER', 200),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## 📚 API Reference

### Module Configuration

#### `RedlockModule.forRootAsync(options)`

| Option       | Type                                | Description                                | Default     |
| ------------ | ----------------------------------- | ------------------------------------------ | ----------- |
| `useFactory` | `(...args) => RedlockModuleOptions` | Factory function to create Redlock options | `undefined` |
| `inject`     | `any[]`                             | Dependencies to inject into useFactory     | `[]`        |
| `imports`    | `any[]`                             | Modules to import for dependency injection | `[]`        |

#### `RedlockModuleOptions`

| Option          | Type                   | Description                        | Default |
| --------------- | ---------------------- | ---------------------------------- | ------- |
| `clients`       | `Redis[]`              | Array of Redis clients for locking | `[]`    |
| `redlockConfig` | `RedlockConfiguration` | Redlock algorithm configuration    | `{}`    |

#### `RedlockConfiguration`

| Option                        | Type     | Description                             | Default |
| ----------------------------- | -------- | --------------------------------------- | ------- |
| `retryCount`                  | `number` | Number of times to retry acquiring lock | `3`     |
| `retryDelay`                  | `number` | Base delay between retries (ms)         | `200`   |
| `retryJitter`                 | `number` | Random jitter added to retry delay (ms) | `200`   |
| `automaticExtensionThreshold` | `number` | Threshold for automatic lock extension  | `500`   |

### Decorators

#### `@Redlock(key: string, ttl: number)`

Method decorator for automatic distributed locking.

```typescript
@Injectable()
export class MyService {
  @Redlock('resource:key', 5000)
  async criticalMethod() {
    // This method will be automatically locked
  }
}
```

### Services

#### `RedlockService`

Injectable service for programmatic lock management.

```typescript
@Injectable()
export class MyService {
  constructor(private readonly redlock: RedlockService) {}

  async doWork() {
    await this.redlock.withLock(['key1', 'key2'], 5000, async () => {
      // Critical section
    });
  }
}
```

##### Methods

- `withLock(keys: string[], ttl: number, callback: () => Promise<T>): Promise<T>`
- `acquire(keys: string[], ttl: number): Promise<Lock>`
- `release(lock: Lock): Promise<void>`

---

## 🔗 Built on @redis-kit/lock

This NestJS wrapper is built on [`@redis-kit/lock`](https://www.npmjs.com/package/@redis-kit/lock), a **new yet fully tested** distributed locking library that's compatible and on par with current Redlock algorithms. Built on the modern [node-redis](https://github.com/redis/node-redis) client for optimal performance.

For additional configurations and help, see the [@redis-kit/lock documentation](https://github.com/CSenshi/redis-kit/tree/main/packages/lock).

---

## 🤝 Contributing

Contributions are welcome! Please see the [main repository](https://github.com/CSenshi/nestjs-redis) for contributing guidelines.

---

## 📄 License

MIT © [CSenshi](https://github.com/CSenshi)
