# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is an Nx monorepo using pnpm.

```bash
# Build/lint/test all affected projects
pnpm exec nx affected -t lint test build

# Run a specific target for a specific package
pnpm nx build client
pnpm nx test lock
pnpm nx lint throttler-storage

# Run a single test file
pnpm nx test <package> --testFile=path/to/file.spec.ts

# Check formatting
pnpm exec nx format:check --all
pnpm exec nx format:write --all

# Release
pnpm exec nx release version
pnpm exec nx release publish --access public
```

Package names for nx targets: `client`, `health-indicator`, `lock`, `socket.io-adapter`, `streams-transporter`, `throttler-storage`.

CI requires a running Redis instance (port 6379) and Redis Cluster (ports 7010–7015) for integration tests.

## Architecture

Six independently installable NestJS packages under `packages/`, all scoped as `@nestjs-redis/*`:

- **client** — Core package. Provides DI-managed Redis connections (Client, Cluster, Sentinel modes). Other packages depend on this for connection injection.
- **health-indicator** — Terminus health check integration.
- **lock** — Distributed locking via Redlock (`@redis-kit/lock`).
- **socket.io-adapter** — Redis adapter for Socket.IO horizontal scaling.
- **streams-transporter** — Redis Streams microservices transport with consumer groups.
- **throttler-storage** — `ThrottlerStorage` implementation using Lua scripting for atomic rate limiting.

### Module pattern

All packages follow the same NestJS pattern:

```typescript
RedisModule.forRoot(options)       // sync
RedisModule.forRootAsync(options)  // async with DI
```

Built on `ConfigurableModuleClass` from `@nestjs/common`. Named connections are supported via `RedisToken(connectionName)` and the `@InjectRedis(connectionName?)` decorator.

The `client` package manages lifecycle: connects on app start, disconnects on shutdown, logs connection events. Set `REDIS_MODULE_DEBUG=true` to enable debug logging.

### Testing

- Unit tests: `*.spec.ts`
- Integration tests: `*.int.spec.ts` (require live Redis)
- Test runner: Jest with SWC compilation

### Key dependencies

- **redis ^5.0.0** (node-redis, not ioredis)
- **TypeScript 5.9** with strict mode, target ES2022, moduleResolution nodenext
- **Nx 22** with `@nx/js/typescript`, `@nx/jest`, `@nx/eslint` plugins
- Peer dependencies support NestJS v9, v10, v11

### Release process

Uses Nx release with conventional commits. PRs must follow conventional commit format (enforced by PR template). Publishes to npm under `@nestjs-redis/*` scope.
