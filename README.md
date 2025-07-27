<div align="center">

<img src="docs/images/logo.png" alt="NestJS Redis Toolkit Logo" width="200" height="200">

# 🚀 NestJS Redis Toolkit

**The modern, production-ready Redis integration for NestJS applications**

[![Build Status](https://github.com/CSenshi/nestjs-redis/workflows/CI/badge.svg)](https://github.com/CSenshi/nestjs-redis/actions)
[![npm version](https://badge.fury.io/js/%40nestjs-redis%2Fclient.svg)](https://www.npmjs.com/package/@nestjs-redis/client)
[![npm downloads](https://img.shields.io/npm/dm/@nestjs-redis/client.svg)](https://www.npmjs.com/package/@nestjs-redis/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11+-red.svg)](https://nestjs.com/)
[![Redis](https://img.shields.io/badge/Redis-5+-red.svg)](https://redis.io/)

_Built on the modern [node-redis](https://github.com/redis/node-redis) client • Future-proof • Type-safe • Production-tested_

</div>

---

## 📋 Table of Contents

- [🎯 Why NestJS Redis Toolkit?](#-why-nestjs-redis-toolkit)
- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📦 Packages](#-packages)
- [📊 Compatibility](#-compatibility)
- [🔄 Migration Guide](#-migration-guide)
- [🤝 Contributing](#-contributing)
- [🆘 Support](#-support)
- [📄 License](#-license)

---

## 🎯 Why NestJS Redis Toolkit?

The Redis ecosystem for NestJS has been fragmented, with most solutions built on the now-deprecated `ioredis` library. **NestJS Redis Toolkit** provides a modern, unified approach built on the official [node-redis](https://github.com/redis/node-redis) client.

### The Problem

- **Outdated Dependencies**: Most existing solutions rely on `ioredis`, which is being deprecated
- **Inconsistent APIs**: Different packages use different patterns and conventions
- **Limited Features**: Existing solutions often lack advanced Redis features like clustering and sentinel support
- **Poor TypeScript Support**: Many packages have incomplete or outdated type definitions
- **Compatibility Issues**: Libraries often have problems being compatible with each other, leading to version conflicts and integration challenges

### Our Solution

- **🔮 Future-Proof**: Built on the official, actively maintained `node-redis` client that will receive long-term support and updates
- **🎯 Consistent API**: Unified patterns across all packages following NestJS best practices
- **⚡ Full Feature Set**: Complete support for Redis client, cluster, and sentinel modes
- **🛡️ Type-Safe**: First-class TypeScript support with comprehensive type definitions
- **🏭 Production-Ready**: Battle-tested in production environments

## ✨ Features

- **Multi-Connection Support** — Handle multiple Redis connections with named instances
- **Flexible Architecture** — Support for Redis client, cluster, and sentinel configurations
- **Async Configuration** — Full support for dynamic configuration with `forRootAsync`
- **Dependency Injection** — Seamless integration with NestJS's DI container
- **Lifecycle Management** — Automatic connection handling and cleanup
- **TypeScript First** — Comprehensive type definitions and IntelliSense support
- **Production Tested** — Used in high-traffic production applications
- **Extensible Design** — Easy to extend with custom functionality

## 📊 Compatibility

| Package                           | Node.js | NestJS | Redis | Status         |
| --------------------------------- | ------- | ------ | ----- | -------------- |
| `@nestjs-redis/client`            | 18+     | 10+    | 5+    | ✅ Stable      |
| `@nestjs-redis/throttler-storage` | 18+     | 10+    | 5+    | ✅ Stable      |
| `@nestjs-redis/redlock`           | 18+     | 10+    | 5+    | 🚧 Coming Soon |

---

## 🚀 Quick Start

Get up and running with Redis in your NestJS application in minutes.

### Installation

```bash
# Install the client package
npm install @nestjs-redis/client redis

# Or install specific packages as needed
npm install @nestjs-redis/throttler-storage redis
```

### Basic Usage

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { RedisClientModule } from '@nestjs-redis/client';

@Module({
  imports: [
    RedisClientModule.forRoot({
      type: 'client',
      options: {
        url: 'redis://localhost:6379',
      },
    }),
  ],
})
export class AppModule {}
```

```typescript
// app.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis, type Redis } from '@nestjs-redis/client';

@Injectable()
export class AppService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setValue(key: string, value: string) {
    await this.redis.set(key, value);
  }

  async getValue(key: string) {
    return this.redis.get(key);
  }
}
```

### Async Configuration

Use `forRootAsync` for dynamic configuration with dependency injection:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisClientModule } from '@nestjs-redis/client';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedisClientModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'client',
        options: {
          url: configService.get('REDIS_URL') || 'redis://localhost:6379',
          password: configService.get('REDIS_PASSWORD'),
          database: configService.get('REDIS_DB') || 0,
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### Multi-Connection Setup

```typescript
// app.module.ts
@Module({
  imports: [
    // Default connection with async config
    RedisClientModule.forRootAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'client',
        options: {
          url: configService.get('REDIS_URL'),
        },
      }),
    }),
    // Named connections using separate forRoot calls
    RedisClientModule.forRoot({
      connectionName: 'cache',
      type: 'client',
      options: {
        url: 'redis://cache:6379',
      },
    }),
    RedisClientModule.forRootAsync({
      connectionName: 'sessions',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'cluster',
        options: {
          rootNodes: [
            { url: configService.get('REDIS_SESSION_NODE_1') },
            { url: configService.get('REDIS_SESSION_NODE_2') },
          ],
        },
      }),
    }),
  ],
})
export class AppModule {}
```

```typescript
// multi.service.ts
@Injectable()
export class MultiService {
  constructor(
    @InjectRedis() private readonly defaultRedis: Redis,
    @InjectRedis('cache') private readonly cacheRedis: Redis,
    @InjectRedis('sessions') private readonly sessionRedis: RedisCluster
  ) {}

  async cacheData(key: string, data: any) {
    await this.cacheRedis.setEx(key, 300, JSON.stringify(data));
  }

  async storeSession(sessionId: string, session: any) {
    await this.sessionRedis.setEx(
      `session:${sessionId}`,
      1800,
      JSON.stringify(session)
    );
  }
}
```

### Complete Example with All Packages

Here's a comprehensive example showing how to use all of the available packages with async configuration:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { RedisClientModule, RedisToken } from '@nestjs-redis/client';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';

@Module({
  imports: [
    // Configure Redis client with async config
    RedisClientModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'client',
        options: {
          url: configService.get('REDIS_URL') || 'redis://localhost:6379',
        },
      }),
    }),
    // Configure throttling with Redis storage
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [RedisToken(), ConfigService],
      useFactory: (redis, configService: ConfigService) => ({
        throttlers: [
          {
            limit: configService.get('THROTTLE_LIMIT') || 10,
            ttl: seconds(configService.get('THROTTLE_TTL') || 60),
          },
        ],
        storage: RedisThrottlerStorage.from(redis),
      }),
    }),
  ],
})
export class AppModule {}
```

## 📦 Packages

| Package                                                                                            | Status             | Description                                                                                                                    | Use Cases                                            |
| -------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| [`@nestjs-redis/client`](https://www.npmjs.com/package/@nestjs-redis/client)                       | ✅ **Stable**      | Flexible, production-ready Redis client module for NestJS with multi-connection support, built on the modern node-redis client | Caching, session storage, pub/sub, queues            |
| [`@nestjs-redis/throttler-storage`](https://www.npmjs.com/package/@nestjs-redis/throttler-storage) | ✅ **Stable**      | Redis storage for NestJS Throttler with distributed rate limiting                                                              | API rate limiting, DDoS protection, quota management |
| `@nestjs-redis/redlock`                                                                            | 🚧 **Coming Soon** | Distributed lock manager using Redis                                                                                           | Preventing race conditions, exclusive operations     |

Each package is published independently with comprehensive documentation. **Click the package links above for detailed installation and usage instructions.**

## Toolkit Structure

- `packages/client` — Redis client module
- `packages/throttler-storage` — Redis storage for NestJS Throttler
- `packages/redlock` — Redlock module (planned)
- `packages/*` — Additional modules in the future

---

## 🔄 Migration Guide

### From ioredis-based Solutions

Migrating from `ioredis`-based NestJS Redis packages is straightforward:

#### Before (ioredis)

```typescript
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';

@Injectable()
export class MyService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setValue(key: string, value: string) {
    await this.redis.set(key, value);
  }
}
```

#### After (NestJS Redis Toolkit)

```typescript
import { InjectRedis, type Redis } from '@nestjs-redis/client';

@Injectable()
export class MyService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setValue(key: string, value: string) {
    await this.redis.set(key, value);
  }
}
```

### Key Differences

- **Import Path**: Change from `@liaoliaots/nestjs-redis` to `@nestjs-redis/client`
- **Type Import**: Use `type Redis` from our package instead of `ioredis`
- **Configuration**: Module configuration syntax is similar but uses `node-redis` options
- **Async Configuration**: Full support for `forRootAsync` with dependency injection
- **Commands**: Most Redis commands have the same API, but check [node-redis documentation](https://github.com/redis/node-redis) for specifics

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and development process.

### Ways to Contribute

- 🐛 **Bug Reports**: Found a bug? [Open an issue](https://github.com/CSenshi/nestjs-redis/issues/new?template=bug_report.md)
- 💡 **Feature Requests**: Have an idea? [Request a feature](https://github.com/CSenshi/nestjs-redis/issues/new?template=feature_request.md)
- 📖 **Documentation**: Improve docs, add examples, or fix typos
- 🔧 **Code**: Submit pull requests for bug fixes or new features
- 🧪 **Testing**: Add test cases or improve test coverage

### Development Guidelines

- Follow existing code style and conventions
- Add tests for new features and bug fixes
- Update documentation for API changes
- Ensure all tests pass before submitting PR
- Use conventional commit messages

### Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

---

## 🆘 Support

### Community Resources

- **[GitHub Issues](https://github.com/CSenshi/nestjs-redis/issues)** — Bug reports & feature requests
- **[GitHub Discussions](https://github.com/CSenshi/nestjs-redis/discussions)** — Questions, ideas, and community chat
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/nestjs-redis)** — Technical questions with `nestjs-redis` tag

### Getting Help

1. **Check Documentation**: Start with package-specific READMEs
2. **Search Issues**: Look for existing solutions in GitHub issues
3. **Ask Questions**: Use GitHub Discussions for general questions
4. **Report Bugs**: Create detailed issue reports with reproduction steps

---

## 🙏 Acknowledgments

Special thanks to:

- The [NestJS team](https://nestjs.com/) for creating an amazing framework
- The [Redis team](https://redis.io/) for the powerful data store
- The [node-redis](https://github.com/redis/node-redis) maintainers for the excellent client library
- All contributors and community members who help improve this toolkit

---

## 📄 License

MIT © [CSenshi](https://github.com/CSenshi)

---

<div align="center">

**[⭐ Star this repo](https://github.com/CSenshi/nestjs-redis) • [🐛 Report Bug](https://github.com/CSenshi/nestjs-redis/issues) • [💡 Request Feature](https://github.com/CSenshi/nestjs-redis/discussions)**

Made with ❤️ for the NestJS community

</div>
