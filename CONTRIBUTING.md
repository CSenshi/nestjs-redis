# Contributing to NestJS Redis Toolkit

Thank you for contributing! This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

**Prerequisites:** Node.js 18+, pnpm, Docker Compose

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/<YOUR_USERNAME>/nestjs-redis.git
   cd nestjs-redis
   pnpm install
   ```

2. Start Redis for integration tests:

   ```bash
   docker compose up redis -d
   # Cluster tests also need: docker compose up redis-cluster -d
   ```

3. Verify setup:

   ```bash
   pnpm --filter @nestjs-redis/client test
   pnpm --filter @nestjs-redis/client test:int
   ```

## Contributing Workflow

1. **Create a branch:** `git checkout -b feature/your-feature-name`
2. **Make changes** following our standards (TypeScript, ESLint, Prettier, NestJS patterns)
3. **Add tests** for new functionality
4. **Run CI checks locally:**

   ```bash
   pnpm lint
   pnpm test
   pnpm build
   pnpm format:check
   ```

5. **Commit** using [Conventional Commits](https://conventionalcommits.org/)
6. **Create PR** with clear description and issue references

## Package Structure

This is a **pnpm workspaces** monorepo with publishable packages under `packages/` and an optional demo under `examples/full` (not part of critical CI). See the [Packages section](README.md#packages) in the main README for current packages.

## Development Commands

```bash
# All publishable packages
pnpm build
pnpm typecheck
pnpm test
pnpm test:int
pnpm lint
pnpm format:check
pnpm format

# Single package (filter by package name)
pnpm --filter @nestjs-redis/client test
pnpm --filter @nestjs-redis/client test:int   # integration specs (requires Redis)
pnpm --filter @nestjs-redis/lock build
pnpm --filter @nestjs-redis/lock lint
pnpm --filter @nestjs-redis/lock typecheck

# Single test file
pnpm --filter @nestjs-redis/client test -- path/to/file.spec.ts

# Example app (optional; not required for lib CI)
pnpm --filter @examples/full build
```

## Release (maintainers)

All `@nestjs-redis/*` packages share one suite version. Publishing is tag-gated.

```bash
pnpm release          # interactive: bump packages/*/package.json, commit, tag vX.Y.Z, push
```

The `v*.*.*` tag push triggers CI to build and publish to npm with provenance.

You can pass a version explicitly, e.g. `pnpm release patch` / `pnpm release 1.4.0`.

## Adding a new library

Copy an existing package (e.g. `packages/client`) as a scaffold—no generators required:

1. Copy the folder to `packages/<name>` and rename package fields in `package.json` (`name`, `description`, `repository.directory`, etc.).
2. Keep the same layout: `src/`, `tsconfig*.json`, `jest.config.ts`, `.spec.swcrc`, `eslint.config.mjs`, and scripts (`build`, `typecheck`, `test`, `test:int`, `lint`).
3. Register the package in the root `tsconfig.json` project references if needed.
4. Match the current suite version in `package.json` with the other packages.
5. Smoke-check: `pnpm --filter @nestjs-redis/<name> build && pnpm --filter @nestjs-redis/<name> test`.

## Commit Format

Use [Conventional Commits](https://conventionalcommits.org/): `<type>(scope): description`

**Types:** `feat`, `fix`, `docs`, `test`, `chore`, `refactor`  
**Scopes:** Use package names (e.g., `client`, `lock`) or omit for general changes

**Examples:**

```bash
feat(client): add multi-connection support
fix(lock): resolve race condition in acquire method
docs: update installation instructions
```

## Questions?

- [Issues](https://github.com/CSenshi/nestjs-redis/issues) for bugs and features
- [Discussions](https://github.com/CSenshi/nestjs-redis/discussions) for questions and ideas

---

Thank you for contributing! 🚀
