<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="120" height="120">

# @nestjs-redis/health-indicator

**Redis health indicator for NestJS applications with comprehensive monitoring support**

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fhealth-indicator.svg)](https://www.npmjs.com/package/@nestjs-redis/health-indicator)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/health-indicator.svg)](https://www.npmjs.com/package/@nestjs-redis/health-indicator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/)
[![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

_Built on [node-redis](https://github.com/redis/node-redis) • Production-ready • Type-safe • Terminus integration_

</div>

---

## 📋 Table of Contents

- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [🔧 Configuration](#-configuration)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 📦 Installation

```bash
# Install the package and dependencies
npm install @nestjs-redis/health-indicator redis

# Or with yarn
yarn add @nestjs-redis/health-indicator redis

# Or with pnpm
pnpm add @nestjs-redis/health-indicator redis
```

### Requirements

| Dependency         | Version                          | Required   |
| ------------------ | -------------------------------- | ---------- |
| `@nestjs/common`   | ^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0 | ✅ Peer    |
| `@nestjs/terminus` | ^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0 | ✅ Peer    |
| `redis`            | ^5.0.0                           | ✅ Peer    |
| `Node.js`          | 18+                              | ✅ Runtime |

## 🚀 Quick Start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisClientModule } from '@nestjs-redis/client';
import { RedisHealthIndicator } from '@nestjs-redis/health-indicator';
import { HealthController } from './health.controller';

@Module({
  imports: [
    RedisClientModule.forRoot({
      type: 'client',
      options: {
        url: 'redis://localhost:6379',
      },
    }),
    TerminusModule,
  ],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class AppModule {}
```

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { RedisHealthIndicator } from '@nestjs-redis/health-indicator';
import { InjectRedis, type Redis } from '@nestjs-redis/client';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private redis: RedisHealthIndicator,
    @InjectRedis() private redisClient: Redis
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        this.redis.isHealthy('redis', {
          client: this.redisClient,
        }),
    ]);
  }
}
```

## 🔧 Configuration

### Multiple Redis Instances

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private redis: RedisHealthIndicator,
    @InjectRedis() private mainRedis: Redis,
    @InjectRedis('cache') private cacheRedis: Redis
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        this.redis.isHealthy('redis-main', {
          client: this.mainRedis,
        }),
      () =>
        this.redis.isHealthy('redis-cache', {
          client: this.cacheRedis,
        }),
    ]);
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please see the [main repository](https://github.com/CSenshi/nestjs-redis) for contributing guidelines.

---

## 📄 License

MIT © [CSenshi](https://github.com/CSenshi)
