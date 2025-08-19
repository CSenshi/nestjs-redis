<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="200" height="200">

# @nestjs-redis/lock

Distributed locking for NestJS using Redis and the Redlock algorithm

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Flock.svg)](https://www.npmjs.com/package/@nestjs-redis/lock)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/lock.svg)](https://www.npmjs.com/package/@nestjs-redis/lock)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/) [![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

</div>

---

## Features

- Redlock-based distributed locks
- Works with existing `@nestjs-redis/client` connections
- Decorator `@Redlock()` and `RedlockService`
- Type-safe, production-ready

## Installation

### Recommended: Install the complete toolkit

```bash
npm install @nestjs-redis/kit redis
```

### Alternative: Install lock package only

```bash
npm install @nestjs-redis/lock redis
```

## Quick Start

> **Note**: Examples use `@nestjs-redis/kit` imports (recommended). If you installed only this package, import from `@nestjs-redis/lock` and `@nestjs-redis/client` instead.

> Recommended: Use `RedisModule` from `@nestjs-redis/kit` so Redis connections are lifecycle-managed by Nest (connect/disconnect).
> Alternative: You can create raw Redis clients via `createClient()` from `redis`, but you must manage connecting and disconnecting yourself.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { RedisModule, RedisToken, RedlockModule } from '@nestjs-redis/kit';

@Module({
  imports: [
    RedisModule.forRoot({ options: { url: 'redis://localhost:6379' } }),
    RedlockModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis) => ({ clients: [redis] }),
    }),
  ],
})
export class AppModule {}
```

### Decorator usage

```typescript
import { Injectable } from '@nestjs/common';
import { Redlock } from '@nestjs-redis/kit';

@Injectable()
export class UserService {
  @Redlock('user:update', 5000)
  async updateUserBalance(userId: string, amount: number) {
    // critical work
  }
}
```

### Service usage

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly redlock: RedlockService) {}

  async processPayment(paymentId: string) {
    return this.redlock.withLock([`payment:${paymentId}`], 5000, async () => {
      // critical work
    });
  }
}
```

## Links

- Root repo: [CSenshi/nestjs-redis](https://github.com/CSenshi/nestjs-redis)
- Issues: [GitHub Issues](https://github.com/CSenshi/nestjs-redis/issues)
- Discussions: [GitHub Discussions](https://github.com/CSenshi/nestjs-redis/discussions)
- Built on @redis-kit/lock: [docs](https://github.com/CSenshi/redis-kit/tree/main/packages/lock)

## Contributing

Please see the [root contributing guidelines](https://github.com/CSenshi/nestjs-redis#contributing).

## License

MIT © [CSenshi](https://github.com/CSenshi)
