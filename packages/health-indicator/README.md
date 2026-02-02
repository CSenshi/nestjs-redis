<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="200" height="200">

# @nestjs-redis/health-indicator

Redis health indicator for NestJS with first-class Terminus integration.

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fhealth-indicator.svg)](https://www.npmjs.com/package/@nestjs-redis/health-indicator)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/health-indicator.svg)](https://www.npmjs.com/package/@nestjs-redis/health-indicator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/) [![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

</div>

---

## Features

- Plug-and-play Terminus health checks
- Works with existing `@nestjs-redis/client` connections
- Supports multiple Redis instances
- Type-safe, production-ready

## Installation

```bash
npm install @nestjs-redis/health-indicator @nestjs-redis/client redis
```

The recommended approach is to use `RedisModule` from `@nestjs-redis/client` so Redis connections are lifecycle-managed by Nest (connect/disconnect with your app). Alternatively, you can pass your own Redis client (e.g. created with `createClient()` from `redis`) and manage its lifecycle yourself.

## Quick Start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisModule } from '@nestjs-redis/client';
import { RedisHealthIndicator } from '@nestjs-redis/health-indicator';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'client',
      options: { url: 'redis://localhost:6379' },
    }),
    TerminusModule,
  ],
  providers: [RedisHealthIndicator],
})
export class AppModule {}
```

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { InjectRedis } from '@nestjs-redis/client';
import { RedisHealthIndicator } from '@nestjs-redis/health-indicator';
import type { RedisClientType } from 'redis';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
    @InjectRedis() private readonly redisClient: RedisClientType,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.redis.isHealthy('redis', { client: this.redisClient }),
    ]);
  }
}
```

### Multiple Instances

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
    @InjectRedis() private readonly mainRedis: RedisClientType,
    @InjectRedis('cache') private readonly cacheRedis: RedisClientType,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.redis.isHealthy('redis-main', { client: this.mainRedis }),
      () => this.redis.isHealthy('redis-cache', { client: this.cacheRedis }),
    ]);
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
