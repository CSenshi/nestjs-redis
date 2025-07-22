# @nestjs-redis/client

A flexible, production-ready [NestJS](https://nestjs.com/) module for integrating [Redis](https://redis.io/) (client, cluster, or sentinel) into your application. Supports single and multi-connection setups, dependency injection, and idiomatic usage with the latest NestJS best practices.


## Features

- Supports Redis client, cluster, and sentinel modes
- Multi-connection support (named connections)
- Dependency injection for Redis clients
- Lifecycle management (auto connect/quit)
- TypeScript-first, fully typed


## Installation

```bash
npm install @nestjs-redis/client redis
# or
yarn add @nestjs-redis/client redis
# or
pnpm add @nestjs-redis/client redis
```

> **Note:** `@nestjs/common`, `@nestjs/core`, and `redis` are required as peer dependencies.


## Quick Start

### Single Connection

#### Import the Module

```ts
import { Module } from '@nestjs/common';
import { RedisClientModule } from '@nestjs-redis/client';

@Module({
  imports: [RedisClientModule.forRoot()],
})
export class AppModule {}
```

#### Inject and Use Redis Client

```ts
import { Injectable } from '@nestjs/common';
import { InjectRedis, type Redis } from '@nestjs-redis/client';

@Injectable()
export class MyService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setValue(key: string, value: string) {
    await this.redis.set(key, value);
  }

  async getValue(key: string) {
    return this.redis.get(key);
  }
}
```


## Multi-Connection

### Initialize

```ts
@Module({
  imports: [
    RedisClientModule.forRoot({
      isGlobal: true,
      connections: [
        // Default connection
        { type: 'client', options: { url: 'redis://localhost:6380' } },
        // Client Connection named 'cache'
        { connection: 'cache', type: 'client' },
        // Client Connection named 'pubsub'
        { connection: 'pubsub', type: 'client', options: { url: 'redis://localhost:6379' } },
        // Cluster Connection named 'queue'
        { connection: 'queue', type: 'cluster', options: { url: 'redis://localhost:6379' } },
      ],
    }),
  ],
})
export class AppModule {}
```

### Usage

You can inject and use multiple named Redis clients in your services. Use the `@InjectRedis()` decorator with the connection name to access the desired client.

```ts
import { Injectable } from '@nestjs/common';
import { InjectRedis, type Redis } from '@nestjs-redis/client';

@Injectable()
export class MultiService {
  constructor(
    @InjectRedis() private readonly defaultRedis: Redis,
    @InjectRedis('cache') private readonly cacheRedis: Redis,
    @InjectRedis('pubsub') private readonly pubsubRedis: Redis,
    @InjectRedis('queue') private readonly queueRedis: Redis,
  ) {}

  async setDefault(key: string, value: string) {
    await this.defaultRedis.set(key, value);
  }

  async setCache(key: string, value: string) {
    await this.cacheRedis.set(key, value);
  }

  async publish(channel: string, message: string) {
    await this.pubsubRedis.publish(channel, message);
  }

  async addToQueue(key: string, value: string) {
    await this.queueRedis.lPush(key, value);
  }
}
```


## Configuration

All `options` provided to the module are passed directly to the official [node-redis](https://github.com/redis/node-redis) client, cluster, or sentinel constructors. This means you can use any configuration supported by the redis library.

For full details on available options, see the official documentation:

- [Redis Client Configuration](https://github.com/redis/node-redis/blob/master/docs/client-configuration.md)

Example:
```ts
RedisClientModule.forRoot({
  isGlobal: true,
  type: 'client',
  options: {
    url: 'redis://localhost:6379',
    socket: {
      connectTimeout: 5000,
    },
    // ...any other supported options
  },
});
```

For multi-connection setups, each connection object can have its own options as described above.


## License

MIT
