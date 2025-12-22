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
