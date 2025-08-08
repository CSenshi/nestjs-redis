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
- Client, Cluster, and Sentinel support

## Installation

```bash
npm install @nestjs-redis/throttler-storage redis
# or
yarn add @nestjs-redis/throttler-storage redis
# or
pnpm add @nestjs-redis/throttler-storage redis
```

## Quick Start

With existing Redis connection:

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
        storage: RedisThrottlerStorage.from(redis),
      }),
    }),
  ],
})
export class AppModule {}
```

## Links

- Root repo: [CSenshi/nestjs-redis](https://github.com/CSenshi/nestjs-redis)
- Issues: [GitHub Issues](https://github.com/CSenshi/nestjs-redis/issues)
- Discussions: [GitHub Discussions](https://github.com/CSenshi/nestjs-redis/discussions)

## Contributing

Please see the [root contributing guidelines](https://github.com/CSenshi/nestjs-redis#contributing).

## License

MIT © [CSenshi](https://github.com/CSenshi)
