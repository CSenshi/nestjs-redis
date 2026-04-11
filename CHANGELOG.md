## 1.1.1-0 (2026-04-11)

This was a version bump only, there were no code changes.

## 1.1.0 (2026-04-11)

### 🚀 Features

- init schedule package ([38d155f](https://github.com/CSenshi/nestjs-redis/commit/38d155f))
- **examples/full:** add schedule package ([b114fe4](https://github.com/CSenshi/nestjs-redis/commit/b114fe4))
- **schedule:** add official nestjs/schedule lib as starting point wip ([c3de89d](https://github.com/CSenshi/nestjs-redis/commit/c3de89d))
- **schedule:** implement Redis-based job scheduling with polling loop ([278e5cf](https://github.com/CSenshi/nestjs-redis/commit/278e5cf))

### 🩹 Fixes

- **schedule:** fix invalid types from nestjs/cron ([361fd53](https://github.com/CSenshi/nestjs-redis/commit/361fd53))
- **schedule:** remove unused cron dependency ([aebb9d4](https://github.com/CSenshi/nestjs-redis/commit/aebb9d4))
- **schedule:** update cronTime type to string for consistency ([5fd3f12](https://github.com/CSenshi/nestjs-redis/commit/5fd3f12))
- **schedule:** remove unused params and add timezone handling ([1587021](https://github.com/CSenshi/nestjs-redis/commit/1587021))
- **schedule:** fix disabled cron jobs handling ([53c3c05](https://github.com/CSenshi/nestjs-redis/commit/53c3c05))
- **schedule:** fix timezone type ([56d1ce0](https://github.com/CSenshi/nestjs-redis/commit/56d1ce0))
- **schedule:** update tsconfig to exclude test-utils directory ([84ee10e](https://github.com/CSenshi/nestjs-redis/commit/84ee10e))
- **schedule:** fix argument types in module interface ([9282c42](https://github.com/CSenshi/nestjs-redis/commit/9282c42))

### ❤️ Thank You

- CSenshi

# 1.0.0 (2026-02-02)

### ⚠️ Breaking changes

- **@nestjs-redis/kit** has been removed. Use the individual packages instead:
  - `@nestjs-redis/client` — Redis client and `RedisModule`
  - `@nestjs-redis/health-indicator` — Terminus health checks
  - `@nestjs-redis/lock` — Distributed locking (Redlock)
  - `@nestjs-redis/throttler-storage` — Throttler storage
  - `@nestjs-redis/socket.io-adapter` — Socket.IO adapter
  - `@nestjs-redis/streams-transporter` — Redis Streams microservices transport  
    Install only the packages you need; see the [README](https://github.com/CSenshi/nestjs-redis#quick-start) and each package’s README for setup.

### ⚠️ Deprecations

- **@nestjs-redis/kit** is deprecated and will be removed in the next major release.
  Migrate to the individual packages: `@nestjs-redis/client`, `@nestjs-redis/health-indicator`, `@nestjs-redis/lock`, `@nestjs-redis/throttler-storage`, `@nestjs-redis/socket.io-adapter`, `@nestjs-redis/streams-transporter`. See the README for setup.

### 🚀 Features

- **dependencies:** migrate to individual @nestjs-redis packages and update pnpm lockfile ([f9736c7](https://github.com/CSenshi/nestjs-redis/commit/f9736c7))
- **eslint:** add 'rxjs' to ignoredDependencies in ESLint config ([de3e420](https://github.com/CSenshi/nestjs-redis/commit/de3e420))
- **package:** update package.json with metadata and dependencies ([3180826](https://github.com/CSenshi/nestjs-redis/commit/3180826))
- **package:** update package.json files to use 'dist' directory for builds ([394b72e](https://github.com/CSenshi/nestjs-redis/commit/394b72e))
- **streams-transporter:** initialize ([dee5a1a](https://github.com/CSenshi/nestjs-redis/commit/dee5a1a))
- **streams-transporter:** add stream client/server wip ([7e3419a](https://github.com/CSenshi/nestjs-redis/commit/7e3419a))
- **streams-transporter:** add client initialization ([642c23c](https://github.com/CSenshi/nestjs-redis/commit/642c23c))
- **streams-transporter:** implement RedisStreamClient with event dispatching and integration tests ([9e73ce1](https://github.com/CSenshi/nestjs-redis/commit/9e73ce1))
- **streams-transporter:** add EventType and RequestType for event handling ([906059c](https://github.com/CSenshi/nestjs-redis/commit/906059c))
- **streams-transporter:** add integration tests for RedisStreamServer and improve event handling ([661560c](https://github.com/CSenshi/nestjs-redis/commit/661560c))
- **streams-transporter:** implement consumer group management and message acknowledgment in RedisStreamServer ([b954359](https://github.com/CSenshi/nestjs-redis/commit/b954359))
- **streams-transporter:** enhance RedisStreamClient and RedisStreamServer with request/response handling and integration tests ([c4c4740](https://github.com/CSenshi/nestjs-redis/commit/c4c4740))
- **streams-transporter:** introduce RedisStreamsOptions and enhance RedisStreamClient/Server with improved configuration handling ([cf2932b](https://github.com/CSenshi/nestjs-redis/commit/cf2932b))
- **streams-transporter:** enhance RedisStreamClient and RedisStreamServer with RedisStreamsContext for improved message handling ([2b21650](https://github.com/CSenshi/nestjs-redis/commit/2b21650))
- **streams-transporter:** enhance RedisStreamClient to support pending event listeners and improve event handling ([9670f15](https://github.com/CSenshi/nestjs-redis/commit/9670f15))
- **streams-transporter:** export client and server ([03f9e40](https://github.com/CSenshi/nestjs-redis/commit/03f9e40))

### ❤️ Thank You

- CSenshi

## 1.0.0-0 (2026-02-02)

### 🚀 Features

- **dependencies:** migrate to individual @nestjs-redis packages and update pnpm lockfile ([f9736c7](https://github.com/CSenshi/nestjs-redis/commit/f9736c7))
- **eslint:** add 'rxjs' to ignoredDependencies in ESLint config ([de3e420](https://github.com/CSenshi/nestjs-redis/commit/de3e420))
- **package:** update package.json with metadata and dependencies ([3180826](https://github.com/CSenshi/nestjs-redis/commit/3180826))
- **package:** update package.json files to use 'dist' directory for builds ([394b72e](https://github.com/CSenshi/nestjs-redis/commit/394b72e))
- **streams-transporter:** initialize ([dee5a1a](https://github.com/CSenshi/nestjs-redis/commit/dee5a1a))
- **streams-transporter:** add stream client/server wip ([7e3419a](https://github.com/CSenshi/nestjs-redis/commit/7e3419a))
- **streams-transporter:** add client initialization ([642c23c](https://github.com/CSenshi/nestjs-redis/commit/642c23c))
- **streams-transporter:** implement RedisStreamClient with event dispatching and integration tests ([9e73ce1](https://github.com/CSenshi/nestjs-redis/commit/9e73ce1))
- **streams-transporter:** add EventType and RequestType for event handling ([906059c](https://github.com/CSenshi/nestjs-redis/commit/906059c))
- **streams-transporter:** add integration tests for RedisStreamServer and improve event handling ([661560c](https://github.com/CSenshi/nestjs-redis/commit/661560c))
- **streams-transporter:** implement consumer group management and message acknowledgment in RedisStreamServer ([b954359](https://github.com/CSenshi/nestjs-redis/commit/b954359))
- **streams-transporter:** enhance RedisStreamClient and RedisStreamServer with request/response handling and integration tests ([c4c4740](https://github.com/CSenshi/nestjs-redis/commit/c4c4740))
- **streams-transporter:** introduce RedisStreamsOptions and enhance RedisStreamClient/Server with improved configuration handling ([cf2932b](https://github.com/CSenshi/nestjs-redis/commit/cf2932b))
- **streams-transporter:** enhance RedisStreamClient and RedisStreamServer with RedisStreamsContext for improved message handling ([2b21650](https://github.com/CSenshi/nestjs-redis/commit/2b21650))
- **streams-transporter:** enhance RedisStreamClient to support pending event listeners and improve event handling ([9670f15](https://github.com/CSenshi/nestjs-redis/commit/9670f15))
- **streams-transporter:** export client and server ([03f9e40](https://github.com/CSenshi/nestjs-redis/commit/03f9e40))

### ❤️ Thank You

- CSenshi

## 0.13.4 (2026-01-21)

This was a version bump only, there were no code changes.

## 0.13.3 (2026-01-04)

### 🔥 Performance

- **throttler-storage:** implement loading lua script and evaluating with sha afterwards ([cfd5b30](https://github.com/CSenshi/nestjs-redis/commit/cfd5b30))

### ❤️ Thank You

- CSenshi

## 0.13.2 (2025-12-28)

This was a version bump only, there were no code changes.

## 0.13.1 (2025-12-22)

This was a version bump only, there were no code changes.

## 0.13.0 (2025-12-18)

### 🚀 Features

- add examples directory ([b45af47](https://github.com/CSenshi/nestjs-redis/commit/b45af47))
- **examples:** add redis integrations ([0775190](https://github.com/CSenshi/nestjs-redis/commit/0775190))

### 🩹 Fixes

- **throttler-storage:** fix CROSSSLOT keys problem in cluster using hash tags ([6e4f96a](https://github.com/CSenshi/nestjs-redis/commit/6e4f96a))

### ❤️ Thank You

- CSenshi

## 0.12.1 (2025-10-06)

### 🩹 Fixes

- **health-indicator:** add missing redis types ([abf57a0](https://github.com/CSenshi/nestjs-redis/commit/abf57a0))

### ❤️ Thank You

- CSenshi

## 0.12.0 (2025-10-01)

This was a version bump only, there were no code changes.

## 0.11.2 (2025-08-18)

### 🩹 Fixes

- **client:** add missing redis event listeners ([cdc4038](https://github.com/CSenshi/nestjs-redis/commit/cdc4038))

### ❤️ Thank You

- CSenshi

## 0.11.1 (2025-08-17)

### 🚀 Features

- **socket.io-adapter**: add new pacakge ([#7](https://github.com/CSenshi/nestjs-redis/pull/7))

### 🩹 Fixes

- **health-indicator:** update RedisHealthIndicator to use HealthIndicatorService directly ([#8](https://github.com/CSenshi/nestjs-redis/pull/8))

### ❤️ Thank You

- CSenshi

## 0.10.1 (2025-08-12)

### 🩹 Fixes

- **client:** ensure Redis is ready in all lifecycle hooks ([6e7688f](https://github.com/CSenshi/nestjs-redis/commit/6e7688f))

### ❤️ Thank You

- CSenshi

## 0.10.0 (2025-08-10)

### 📝 Notes

- Version jump: some intermediate versions were published and later unpublished due to inconsistencies. npm prevents republishing the same versions for a period of time, so we are moving to 0.10.0 to unblock releases. This is an administrative bump; starting from 0.10.0 is a safe choice for consumers.

### ❤️ Thank You

- CSenshi

## 0.3.0 (2025-08-10)

### 🚀 Features

- **kit:** add new all-in-one package to bundle all modules ([a2ac074](https://github.com/CSenshi/nestjs-redis/commit/a2ac074))

### 🩹 Fixes

- **lock:** fix invalid invalid files in package.json ([49087f4](https://github.com/CSenshi/nestjs-redis/commit/49087f4))

### ❤️ Thank You

- CSenshi

## 0.2.1 (2025-08-10)

### 🩹 Fixes

- update documentation

## 0.2.0 (2025-08-06)

### 🚀 Features

- **@nestjs-redis/lock:** Introduce new redlock package to ecosystem 
- **ci:** add step to derive SHAs for nx affected commands ([dd45018](https://github.com/CSenshi/nestjs-redis/commit/dd45018))
- **ci:** add Redis service to compatibility test workflow ([e3e05ee](https://github.com/CSenshi/nestjs-redis/commit/e3e05ee))

### ❤️ Thank You

- CSenshi

## 0.1.2 (2025-07-31)

### 🩹 Fixes

- **client:** fix forRootAsync method not looking at imports property ([a495e5c](https://github.com/CSenshi/nestjs-redis/commit/a495e5c))

### ❤️ Thank You

- CSenshi

## 0.1.1 (2025-07-29)

### 🩹 Fixes

- remove scripts section from package.json ([6ccc7e4](https://github.com/CSenshi/nestjs-redis/commit/6ccc7e4))

### ❤️ Thank You

- CSenshi

## 0.1.0 (2025-07-29)

### 🚀 Features

- Initial release of NestJS Redis packages
- **@nestjs-redis/client:** Redis client module with decorators and services
- **@nestjs-redis/throttler-storage:** Redis storage implementation for NestJS throttler
- **@nestjs-redis/health-indicator:** Redis health indicator for NestJS health checks

### ❤️ Thank You

- CSenshi
