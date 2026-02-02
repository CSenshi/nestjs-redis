<div align="center">

<img src="https://raw.githubusercontent.com/CSenshi/nestjs-redis/main/docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="200" height="200">

# @nestjs-redis/streams-transporter

Custom NestJS microservices transporter using Redis Streams with event and request/response patterns

[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fstreams-transporter.svg)](https://www.npmjs.com/package/@nestjs-redis/streams-transporter)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/streams-transporter.svg)](https://www.npmjs.com/package/@nestjs-redis/streams-transporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9%2B-red.svg)](https://nestjs.com/) [![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

</div>

---

## Features

- **Redis Streams–based transport**: Events and requests stored as stream entries; replies written to per-client reply streams
- **Event and request/response**: Fire-and-forget events (`dispatchEvent`) and request/response via `send()` with routing callbacks
- **Consumer groups**: Server uses `XREADGROUP` + `XACK` for at-least-once delivery and horizontal scaling
- **Configurable options**: Stream prefix, consumer group/name, block timeout, batch size, max stream length (MAXLEN trim), retry delay
- **NestJS integration**: `RedisStreamsContext` (stream name, message id, consumer group/name) passed to handlers; optional `onProcessingStartHook` / `onProcessingEndHook`
- **Type-safe**: Event/request/response type guards and resolved options

## Installation

```bash
npm install @nestjs-redis/streams-transporter redis
```

## Quick Start

### Server (microservice)

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { RedisStreamServer } from '@nestjs-redis/streams-transporter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      strategy: new RedisStreamServer({
        url: 'redis://localhost:6379',
        streamPrefix: '_microservices',
        consumerGroup: 'nestjs-streams',
        consumerName: 'my-consumer',
      }),
    },
  );

  await app.listen();
}
bootstrap();
```

### Client (hybrid app or separate service)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisStreamClient } from '@nestjs-redis/streams-transporter';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'STREAMS_SERVICE',
        customClass: RedisStreamClient,
        options: {
          url: 'redis://localhost:6379',
          streamPrefix: '_microservices',
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

```typescript
// app.controller.ts
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller()
export class AppController {
  constructor(
    @Inject('STREAMS_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Get('echo')
  async echo() {
    return firstValueFrom(this.client.send('user.echo', { hello: 'world' }));
  }
}
```

### Event handlers (server)

```typescript
// app.controller.ts
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { Ctx } from '@nestjs/microservices';
import { RedisStreamsContext } from '@nestjs-redis/streams-transporter';

@Controller()
export class AppController {
  @MessagePattern('user.echo')
  echo(@Payload() data: object, @Ctx() ctx: RedisStreamsContext) {
    return { ok: true, data };
  }

  @EventPattern('user.created')
  onUserCreated(@Payload() data: object, @Ctx() ctx: RedisStreamsContext) {
    // fire-and-forget; no reply
    console.log('User created', data, ctx.getStreamName(), ctx.getMessageId());
  }
}
```

## Options

`RedisStreamServer` and `RedisStreamClient` accept `RedisStreamsOptions`, which extends Redis client options and adds:

| Option            | Default                               | Description                                                               |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| `streamPrefix`    | `'_microservices'`                    | Prefix for request streams (e.g. `{prefix}:user.echo`) and reply streams. |
| `consumerGroup`   | `'nestjs-streams'`                    | Consumer group name for server `XREADGROUP`.                              |
| `consumerName`    | `''` (then `consumer-${process.pid}`) | Consumer name in the group.                                               |
| `blockTimeout`    | `100`                                 | Block timeout (ms) for `XREAD` / `XREADGROUP`.                            |
| `batchSize`       | `50`                                  | Max entries per read (`COUNT`).                                           |
| `maxStreamLength` | `10000`                               | Max length for streams; `XADD ... TRIM MAXLEN ~` is used on add.          |
| `retryDelay`      | `250`                                 | Delay (ms) before retrying after a read/connection error.                 |

Use `resolveRedisStreamsOptions(options)` to get a fully resolved options object (all optional fields filled with defaults).

## API

- **`RedisStreamClient`** – NestJS `ClientProxy` implementation. Connects to Redis, publishes events/requests to streams, listens for replies on a dedicated reply stream and dispatches to `routingMap` callbacks. `close()` flushes callbacks with an error, deletes the reply stream, and quits the client.
- **`RedisStreamServer`** – NestJS `CustomTransportStrategy`. Creates consumer groups, consumes via `XREADGROUP`, ACKs with `XACK`, invokes message/event handlers with `RedisStreamsContext`, and writes replies to the client’s reply stream.
- **`RedisStreamsContext`** – Context passed to handlers (like Nest’s RPC context). Methods: `getStreamName()`, `getMessageId()`, `getConsumerGroup()`, `getConsumerName()`.
- **`RedisStreamsOptions`** / **`RedisStreamsResolvedOptions`** – Options and resolved type; **`resolveRedisStreamsOptions(options)`** – returns resolved options.

Stream entry shape:

- **Events**: `e: '1'`, `data` (JSON).
- **Requests**: `e: '0'`, `id`, `replyTo`, `data` (JSON).
- **Responses**: `id`, `data` or `err` (JSON), `isDisposed: '1'`.

## Links

- Root repo: [CSenshi/nestjs-redis](https://github.com/CSenshi/nestjs-redis)
- Issues: [GitHub Issues](https://github.com/CSenshi/nestjs-redis/issues)
- Discussions: [GitHub Discussions](https://github.com/CSenshi/nestjs-redis/discussions)

## Contributing

Please see the [root contributing guidelines](https://github.com/CSenshi/nestjs-redis#contributing).

## License

MIT © [CSenshi](https://github.com/CSenshi)
