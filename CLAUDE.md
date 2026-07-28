# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Commands

pnpm workspaces monorepo. Publishable packages live under `packages/*` (`@nestjs-redis/*`). Example app: `examples/full` (optional, not critical CI).

```bash
# All publishable packages
pnpm build
pnpm typecheck
pnpm test
pnpm lint          # oxlint (root .oxlintrc.json)
pnpm format:check  # oxfmt --check
pnpm format        # oxfmt

# Single package
pnpm --filter @nestjs-redis/client build
pnpm --filter @nestjs-redis/lock test
pnpm --filter @nestjs-redis/throttler-storage lint
pnpm --filter @nestjs-redis/client typecheck

# Single test file
pnpm --filter @nestjs-redis/client test -- path/to/file.spec.ts

# Integration tests only
pnpm --filter @nestjs-redis/client test:int

# Release (lockstep packages/*/ version, tag vX.Y.Z, push → publish CI)
pnpm release              # interactive; or: pnpm release patch|minor|major|1.4.0
```

Start Redis before running any tests: `docker compose up redis -d`  
(Cluster suites also need `docker compose up redis-cluster -d`.)

## Architecture

Independently installable NestJS packages under `packages/`, all `@nestjs-redis/*` scoped:

| Package               | Purpose                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `client`              | Core. DI-managed Redis connections (Client/Cluster/Sentinel). All other packages depend on this.       |
| `health-indicator`    | Terminus health check integration.                                                                     |
| `lock`                | Distributed locking via `@redis-kit/lock` (`RedlockModule`, `RedlockService`, `@Redlock()` decorator). |
| `schedule`            | Distributed cron execution, drop-in for `@nestjs/schedule`.                                            |
| `socket.io-adapter`   | Redis adapter for Socket.IO horizontal scaling.                                                        |
| `streams-transporter` | Redis Streams microservices transport with consumer groups.                                            |
| `throttler-storage`   | `ThrottlerStorage` impl using Lua scripting for atomic rate limiting.                                  |

### Module pattern

All packages use `ConfigurableModuleBuilder` from `@nestjs/common`:

```typescript
// module-definition.ts sets .setClassMethodName('forRoot') and factory name
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<RedisModuleOptions>({
    moduleName: 'RedisClient',
  })
    .setClassMethodName('forRoot')
    .setFactoryMethodName('createRedisOptions' as keyof RedisOptionsFactory)
    .build();
```

The `client` module exports tokens via `RedisToken(connectionName?)`:

- No name → token `'REDIS_CLIENT'`
- Named `'cache'` → token `'REDIS_CLIENT_CACHE'` (uppercased)

Use `@InjectRedis(connectionName?)` or `Inject(RedisToken(connectionName?))` to inject clients.

`RedisModuleOptions` = connection config only (`type`, `options`). `RedisModuleForRootOptions` adds `isGlobal` and `connectionName`. The `useFactory` in `forRootAsync` returns `RedisModuleOptions` — **not** `RedisModuleForRootOptions`.

### Testing

- Tests: `*.spec.ts` (unit) and `*.int.spec.ts` (integration) — Redis must be running for tests that need it
- Runner: Jest with SWC compilation (no Nx)
- Package scripts: `test` (all specs) and `test:int` (`*.int.spec.ts` only)
- Start Redis: `docker compose up redis -d`

## Code Style & Conventions

- **redis package**: node-redis v5+ (`redis ^5.0.0 || ^6.0.0`), **not** ioredis. Types: `RedisClientType`, `RedisClusterType`, `RedisSentinelType`.
- **TypeScript**: strict mode, `target: ES2022`, `module: nodenext`, `moduleResolution: nodenext`, `customConditions: ["development"]`, `noUnusedLocals`, `noImplicitReturns`.
- **No barrel re-exports inside lib/**: `index.ts` at `src/` level only. Internal imports use direct paths.
- **Client lifecycle**: `RedisModule` connects on startup, disconnects on `onApplicationShutdown`. Other services (e.g., `RedisThrottlerStorage`) do **not** manage their client's lifecycle.
- **Lua scripts** in `throttler-storage`: loaded lazily, SHA cached, NOSCRIPT fallback re-runs with raw script.
- **Conventional commits** required. Releases: `pnpm release` (release-it) then tag publish CI.
- **Debug logging**: gated on `process.env['REDIS_MODULE_DEBUG'] === 'true'`; errors always log.

## What Claude Often Gets Wrong

1. **Using ioredis types**: This repo uses `redis` (node-redis), not ioredis. Do not use `IORedis`, `Redis` from ioredis, or ioredis-style APIs.

2. **`RedisModuleOptions` vs `RedisModuleForRootOptions`**: `useFactory` in `forRootAsync` must return `RedisModuleOptions` (connection config only — no `isGlobal`/`connectionName`). Those fields are on `RedisModuleForRootOptions` and `RedisModuleAsyncOptions` only.

3. **Token format**: `RedisToken('cache')` produces `'REDIS_CLIENT_CACHE'` (uppercased). Do not construct token strings manually.

4. **`RedlockService` is just `class RedlockService extends Redlock {}`**: It directly extends `Redlock` from `@redis-kit/lock` for DI injection. No wrapper logic — use `Redlock` API directly on the injected service.

5. **No `RedisService` class**: There is no service class in the `client` package. Connections are injected directly via `@InjectRedis()`. Do not create or reference a `RedisService`.

6. **`throttler-storage` constructor takes a pre-existing client**: `new RedisThrottlerStorage(client)` — the service does NOT manage the client lifecycle or create its own connection.

7. **`moduleResolution: nodenext`**: Relative imports in TypeScript source files must include `.js` extension. Do not use extensionless relative imports in new files.

8. **`ConfigurableModuleBuilder` factory method name**: The factory interface method is `createRedisOptions` (set via `setFactoryMethodName`), not the builder default `create`. Implement this in `RedisOptionsFactory`.

9. **Integration test file naming**: Must end in `.int.spec.ts` — run via `pnpm --filter @nestjs-redis/<pkg> test:int`.

10. **`forRoot`/`forRootAsync` return an anonymous subclass**: The `module` field is `class extends RedisModule { override connectionName = ... }`. The module class is not `RedisModule` itself; do not reference it by name in that context.

## Verification Checklist

Before submitting changes to any package:

- [ ] `pnpm --filter @nestjs-redis/<package> lint` passes
- [ ] `pnpm --filter @nestjs-redis/<package> typecheck` passes
- [ ] `pnpm --filter @nestjs-redis/<package> test` passes (Redis must be running)
- [ ] Public API changes reflected in `packages/<pkg>/src/index.ts`
- [ ] Commit message follows conventional commit format (`feat:`, `fix:`, `chore:`, etc.)

## Reference Files

| File                                                              | Purpose                                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `packages/client/src/lib/module.ts`                               | Core module; forRoot/forRootAsync/shutdown pattern                         |
| `packages/client/src/lib/tokens.ts`                               | `RedisToken()` token factory                                               |
| `packages/client/src/lib/types.ts`                                | `RedisModuleOptions`, `RedisModuleForRootOptions`, `RedisConnectionConfig` |
| `packages/client/src/lib/redis-client.module-definition.ts`       | `ConfigurableModuleBuilder` setup                                          |
| `packages/client/src/lib/interfaces/`                             | Async options and factory interfaces                                       |
| `packages/throttler-storage/src/lib/throttler-storage.service.ts` | Lua script pattern, `evalSha` + NOSCRIPT fallback                          |
| `packages/lock/src/lib/redlock/`                                  | Redlock module/service/decorator                                           |
| `tsconfig.base.json`                                              | Shared TS compiler options                                                 |
