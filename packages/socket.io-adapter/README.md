<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="200" height="200">

# @nestjs-redis/socket.io-adapter

Redis-powered Socket.IO adapter for NestJS

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fsocket.io-adapter.svg)](https://www.npmjs.com/package/@nestjs-redis/socket.io-adapter)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/socket.io-adapter.svg)](https://www.npmjs.com/package/@nestjs-redis/socket.io-adapter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/) [![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

</div>

---

## Features

- Horizontal scaling with Redis pub/sub
- Works with existing `@nestjs-redis/client` connections
- Type-safe, production-ready

## Installation

```bash
npm install @nestjs-redis/socket.io-adapter @nestjs-redis/client redis
```

The recommended approach is to use `RedisModule` from `@nestjs-redis/client` so Redis connections are lifecycle-managed by Nest (connect/disconnect with your app). Alternatively, you can pass your own Redis client (e.g. created with `createClient()` from `redis`) and manage its lifecycle yourself.

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
// main.ts
import { NestFactory } from '@nestjs/core';
import { setupRedisAdapter } from '@nestjs-redis/socket.io-adapter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup Redis adapter for Socket.IO
  await setupRedisAdapter(app);

  await app.listen(3000);
}
bootstrap();
```

### Multiple Redis connections

If you have multiple Redis connections, specify which one to use:

```typescript
// app.module.ts
@Module({
  imports: [
    RedisModule.forRoot({
      options: { url: 'redis://localhost:6379' },
    }),
    RedisModule.forRoot({
      connectionName: 'websockets',
      options: { url: 'redis://websockets:6379' },
    }),
  ],
})
export class AppModule {}
```

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use the 'websockets' Redis connection
  await setupRedisAdapter(app, 'websockets');

  await app.listen(3000);
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
