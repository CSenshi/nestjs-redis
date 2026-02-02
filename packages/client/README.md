<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="200" height="200">

# @nestjs-redis/client

Flexible, production-ready Redis client module for NestJS with multi-connection support

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fclient.svg)](https://www.npmjs.com/package/@nestjs-redis/client)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/client.svg)](https://www.npmjs.com/package/@nestjs-redis/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/) [![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

</div>

---

## Features

- Multi-connection support (named connections)
- Client, Cluster, and Sentinel modes
- NestJS DI integration and lifecycle management
- Async configuration with `forRootAsync`
- Type-safe, production-ready

## Installation

```bash
npm install @nestjs-redis/client redis
```

## Quick Start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-redis/client';

@Module({
  imports: [
    RedisModule.forRoot({
      options: { url: 'redis://localhost:6379' },
    }),
  ],
})
export class AppModule {}
```

```typescript
// app.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-redis/client';
import type { RedisClientType } from 'redis';

@Injectable()
export class AppService {
  constructor(@InjectRedis() private readonly redis: RedisClientType) {}

  async setValue(key: string, value: string) {
    await this.redis.set(key, value);
  }

  async getValue(key: string) {
    return this.redis.get(key);
  }
}
```

### Multi-Connection

```typescript
@Module({
  imports: [
    RedisModule.forRoot({
      isGlobal: true,
      options: { url: 'redis://localhost:6379' },
    }),
    RedisModule.forRoot({
      connectionName: 'cache',
      type: 'client',
      options: { url: 'redis://cache:6379' },
    }),
    RedisModule.forRoot({
      connectionName: 'cluster',
      type: 'cluster',
      options: { rootNodes: [{ url: 'redis://cluster:6379' }] },
    }),
  ],
})
export class AppModule {}
```

## Debug Logging

Enable detailed Redis connection logging by setting the `REDIS_MODULE_DEBUG` environment variable:

```bash
REDIS_MODULE_DEBUG=true npm start
```

This provides comprehensive logging of Redis connection lifecycle events:

```
[RedisModule] [Connection=<empty>]: Creating Redis client...
[RedisModule] [Connection=<empty>]: Connecting to Redis...
[RedisModule] [Connection=<empty>]: [Event=connect] Connection initiated to Redis server
[RedisModule] [Connection=<empty>]: [Event=ready] Redis client is ready to accept commands
[RedisModule] [Connection=<empty>]: Redis client connected

...

[RedisModule] [Connection=<empty>]: Closing Redis connection
[RedisModule] [Connection=<empty>]: [Event=end] Connection closed (disconnected from Redis server)
[RedisModule] [Connection=<empty>]: Redis connection closed

```

All available event types can be checked at official [`node-redis` docs](https://github.com/redis/node-redis?tab=readme-ov-file#events)

## API

- `@InjectRedis(name?)`
- `RedisToken(name?)`
- `RedisModule.forRoot(options)` / `forRootAsync(options)`

## Links

- Root repo: [CSenshi/nestjs-redis](https://github.com/CSenshi/nestjs-redis)
- Issues: [GitHub Issues](https://github.com/CSenshi/nestjs-redis/issues)
- Discussions: [GitHub Discussions](https://github.com/CSenshi/nestjs-redis/discussions)

## Contributing

Please see the [root contributing guidelines](https://github.com/CSenshi/nestjs-redis#contributing).

## License

MIT © [CSenshi](https://github.com/CSenshi)
