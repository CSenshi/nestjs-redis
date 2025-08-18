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

- **Horizontal scaling**: Connect clients to any server instance
- **Redis pub/sub**: Automatic event distribution across instances
- **Lifecycle management**: Redis connections are managed automatically
- **Works with existing connections**: Integrates seamlessly with `@nestjs-redis/client`
- **Type-safe**: Full TypeScript support
- **Production-ready**: Built on the official Socket.IO Redis adapter

## Installation

### Recommended: Install the complete toolkit

```bash
npm install @nestjs-redis/kit redis
```

### Alternative: Install socket.io-adapter package only

```bash
npm install @nestjs-redis/socket.io-adapter redis
```

## Quick Start

### Setup with existing Redis connection (Recommended)

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

## The Problem

When scaling your NestJS application horizontally with multiple instances, WebSocket connections become a challenge. By default, Socket.IO connections are tied to a single server instance, which means:

- Events sent from one server instance won't reach clients connected to other instances
- Real-time features break when users connect to different servers
- Load balancing becomes complex as you need sticky sessions

## The Solution

This package provides a Redis-backed Socket.IO adapter that uses Redis pub/sub to synchronize events across all server instances. When a server emits an event, it's published to Redis and distributed to all other server instances, ensuring all clients receive the event regardless of which server they're connected to.

## How It Works

1. **Redis Pub/Sub**: The adapter creates two Redis connections - one for publishing and one for subscribing
2. **Event Distribution**: When a server emits an event, it's published to a Redis channel
3. **Cross-Instance Delivery**: All server instances subscribe to the same channels and forward events to their connected clients
4. **Automatic Management**: Connection lifecycle is handled automatically by the adapter

## API

### `setupRedisAdapter(app, redisToken?)`

Sets up the Redis adapter for the NestJS application.

- `app`: NestJS application instance
- `redisToken` (optional): Redis connection name (defaults to the default connection)

### `RedisIoAdapter`

The underlying Socket.IO adapter class that handles Redis connections.

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Server 1  │    │   Server 2  │    │   Server 3  │
│  ┌───────┐  │    │  ┌───────┐  │    │  ┌───────┐  │
│  │Client │  │    │  │Client │  │    │  │Client │  │
│  └───────┘  │    │  └───────┘  │    │  └───────┘  │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                    ┌─────▼─────┐
                    │   Redis   │
                    │  Pub/Sub  │
                    └───────────┘
```

## Learn More

- [NestJS WebSocket Adapter Documentation](https://docs.nestjs.com/websockets/adapter)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Redis Pub/Sub](https://redis.io/docs/manual/pubsub/)

## Links

- Root repo: [CSenshi/nestjs-redis](https://github.com/CSenshi/nestjs-redis)
- Issues: [GitHub Issues](https://github.com/CSenshi/nestjs-redis/issues)
- Discussions: [GitHub Discussions](https://github.com/CSenshi/nestjs-redis/discussions)

## Contributing

Please see the [root contributing guidelines](https://github.com/CSenshi/nestjs-redis#contributing).

## License

MIT © [CSenshi](https://github.com/CSenshi)
