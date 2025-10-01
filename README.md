<div align="center">

<img src="docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="200" height="200">

# 🚀 NestJS Redis Toolkit

Modern, production-ready Redis integration for NestJS. Unified APIs, type-safe, and built on the official node-redis client.

[![Build Status](https://github.com/CSenshi/nestjs-redis/workflows/CI/badge.svg)](https://github.com/CSenshi/nestjs-redis/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/)
[![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

</div>

---

## Overview

NestJS Redis Toolkit is a cohesive set of utilities for Redis in NestJS applications. It provides a consistent developer experience across client connections, throttling storage, health checks, and distributed locking.

- Future‑proof: built on the actively maintained node-redis client
- Consistent APIs: NestJS-first patterns and DI integration
- Production-ready: lifecycle management and clear, minimal APIs

## Packages

- [@nestjs-redis/kit](packages/kit/README.md) — All-in-one convenience package that bundles all toolkit modules
- [@nestjs-redis/client](packages/client/README.md) — Redis client module with multi-connection support
- [@nestjs-redis/lock](packages/lock/README.md) — Distributed locking via Redlock
- [@nestjs-redis/throttler-storage](packages/throttler-storage/README.md) — Redis storage for NestJS Throttler
- [@nestjs-redis/health-indicator](packages/health-indicator/README.md) — Redis health checks for Terminus
- [@nestjs-redis/socket.io-adapter](packages/socket.io-adapter/README.md) — Redis-powered Socket.IO adapter for scalable WebSocket connections

## Quick Start

### Recommended: Install the complete toolkit

```bash
npm install @nestjs-redis/kit redis
```

Minimal setup:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-redis/kit';

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
import { InjectRedis } from '@nestjs-redis/kit';
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

### Alternative: Install individual packages

If you only need specific functionality, install individual packages:

```bash
npm install @nestjs-redis/client redis
```

```typescript
import { RedisModule } from '@nestjs-redis/client';
```

## Debug Logging

Enable detailed logging across all toolkit packages by setting the `REDIS_MODULE_DEBUG` environment variable:

```bash
REDIS_MODULE_DEBUG=true npm start
```

This provides comprehensive operational logging:

```
[RedisModule] [Connection=<empty>]: Creating Redis client...
[RedisModule] [Connection=<empty>]: [Event=connect] Connection initiated to Redis server
[RedisModule] [Connection=<empty>]: [Event=ready] Redis client is ready to accept commands
[RedisModule] [Connection=<empty>]: Redis client connected
```

## Compatibility

| Package                                                                                            | Node.js | NestJS | Redis |
| -------------------------------------------------------------------------------------------------- | ------- | ------ | ----- |
| [`@nestjs-redis/kit`](https://www.npmjs.com/package/@nestjs-redis/kit)                             | 18+     | 9+     | 5+    |
| [`@nestjs-redis/client`](https://www.npmjs.com/package/@nestjs-redis/client)                       | 18+     | 9+     | 5+    |
| [`@nestjs-redis/lock`](https://www.npmjs.com/package/@nestjs-redis/lock)                           | 18+     | 9+     | 5+    |
| [`@nestjs-redis/throttler-storage`](https://www.npmjs.com/package/@nestjs-redis/throttler-storage) | 18+     | 9+     | 5+    |
| [`@nestjs-redis/health-indicator`](https://www.npmjs.com/package/@nestjs-redis/health-indicator)   | 18+     | 9+     | 5+    |
| [`@nestjs-redis/socket.io-adapter`](https://www.npmjs.com/package/@nestjs-redis/socket.io-adapter) | 18+     | 9+     | 5+    |

All packages support NestJS 9.x, 10.x, and 11.x.

## Why use this toolkit?

- Unified, NestJS-first Redis experience across multiple use cases (client, throttling, health, locks)
- Built on the official `node-redis` client for long-term maintenance and compatibility
- Clean APIs with strong TypeScript types and DI-friendly patterns
- Production-ready lifecycle management (connect/disconnect) and clear error surfaces
- Minimal, consistent package READMEs so teams can onboard fast

### Background

Most NestJS Redis libraries were historically built on `ioredis`. While `ioredis` remains stable, maintenance is best-effort and the Redis team recommends `node-redis` for new projects. `node-redis` is actively maintained, redesigned from the ground up, and supports new and upcoming Redis features (including Redis Stack and Redis 8 capabilities). This toolkit exists to offer first‑class NestJS integrations on top of `node-redis` rather than `ioredis`.

Reference: [redis/ioredis (GitHub)](https://github.com/redis/ioredis)

## Links

- Documentation: see each package README above
- Issues: [GitHub Issues](https://github.com/CSenshi/nestjs-redis/issues)
- Discussions: [GitHub Discussions](https://github.com/CSenshi/nestjs-redis/discussions)
- npm: [`@nestjs-redis` on npm](https://www.npmjs.com/org/nestjs-redis)

## Contributing

Contributions are welcome! Please read the contributing guide in the repository and open issues/PRs with clear context and reproduction steps.

## License

MIT © [CSenshi](https://github.com/CSenshi)

<div align="center">

**[⭐ Star this repo](https://github.com/CSenshi/nestjs-redis) • [🐛 Report Bug](https://github.com/CSenshi/nestjs-redis/issues) • [💡 Request Feature](https://github.com/CSenshi/nestjs-redis/discussions)**

</div>
