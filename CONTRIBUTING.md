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
   ```

3. Verify setup:
   ```bash
   pnpm nx test client
   pnpm nx test:int client
   ```

## Contributing Workflow

1. **Create a branch:** `git checkout -b feature/your-feature-name`
2. **Make changes** following our standards (TypeScript, ESLint, Prettier, NestJS patterns)
3. **Add tests** for new functionality
4. **Run CI checks locally:**
   ```bash
   pnpm exec nx affected -t lint test build
   pnpm exec nx format:check --all
   ```
5. **Commit** using [Conventional Commits](https://conventionalcommits.org/)
6. **Create PR** with clear description and issue references

## Package Structure

This is a monorepo with multiple packages under `packages/`. Each package focuses on a specific Redis integration (client, locking, health checks, etc.). See the [Packages section](README.md#packages) in the main README for current packages.

## Development Commands

```bash
# Testing
pnpm nx test <package>              # unit tests
pnpm nx test:int <package>          # integration tests (requires Redis)
pnpm nx run-many -t test            # all tests

# Linting & Formatting
pnpm nx run-many -t lint            # check linting
pnpm nx run-many -t lint --fix      # fix linting issues
pnpm exec nx format:write --all     # format code

# CI Checks (run before submitting PR)
pnpm exec nx affected -t lint test build
pnpm exec nx format:check --all

# Create new library
pnpm nx g @nx/nest:library \
	--name=<name> \
	--directory=packages/<name> \
	--buildable \
	--publishable \
	--linter=eslint \
	--unitTestRunner=jest
```

## Commit Format

Use [Conventional Commits](https://conventionalcommits.org/): `<type>(scope): description`

**Types:** `feat`, `fix`, `docs`, `test`, `chore`, `refactor`  
**Scopes:** Use package names (e.g., `client`, `lock`, `kit`) or omit for general changes

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
