# NestJS Redis Toolkit

A unified set of high-quality, production-ready [NestJS](https://nestjs.com/) modules for working with [Redis](https://redis.io/). This toolkit provides idiomatic, type-safe, and scalable Redis integrations for your NestJS applications.

> **Note:** This toolkit is built on the new [node-redis](https://github.com/redis/node-redis) client. [ioredis](https://github.com/luin/ioredis) is being deprecated, so this project provides a modern, future-proof foundation for Redis in NestJS.

---

## Vision

**NestJS Redis Toolkit** aims to be the go-to solution for all Redis-related needs in the NestJS ecosystem. Whether you need a simple client, distributed locks, pub/sub, or advanced Redis features, this toolkit provides a consistent, well-documented, and extensible foundation.

---

## Packages

- [`@nestjs-redis/client`](./packages/client) — Flexible Redis client module for NestJS (single/multi-connection, cluster, sentinel)
- [`@nestjs-redis/throttler-storage`](./packages/throttler-storage) — Redis storage for NestJS Throttler with distributed rate limiting support
- `@nestjs-redis/redlock` — Distributed lock manager for Redis (coming soon)
- _More modules coming soon!_

Each package is published independently. **For installation and usage, see the README in each package directory.**

---

## Toolkit Structure

- `packages/client` — Redis client module
- `packages/throttler-storage` — Redis storage for NestJS Throttler
- `packages/redlock` — Redlock module (planned)
- `packages/*` — Additional modules in the future

---

## Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, features, or documentation improvements.

For local development:

```bash
pnpm install
pnpm build
```

---

## Community & Support

- [GitHub Issues](https://github.com/your-org/nestjs-redis/issues) — Bug reports & feature requests
- _Discord/Community link here (if available)_

---

## License

MIT
