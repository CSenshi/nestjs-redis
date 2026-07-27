Generate a new NestJS library in this pnpm workspaces monorepo by copying an existing package (no generators).

Usage: /new-lib <name>

Steps:

1. Copy an existing package scaffold, e.g. `packages/client` → `packages/<lib-name>`.
2. Update `package.json`: `name` (`@nestjs-redis/<lib-name>`), description, keywords, `repository.directory`.
3. Keep scripts: `build`, `typecheck`, `test`, `test:int`, `lint`.
4. Clear `src/` and implement the library; export public API from `src/index.ts`.
5. Add the package to `.changeset/config.json` `fixed[0]` array.
6. Add a project reference in root `tsconfig.json` if other packages need it.
7. Verify:

```bash
pnpm --filter @nestjs-redis/<lib-name> build
pnpm --filter @nestjs-redis/<lib-name> test
pnpm --filter @nestjs-redis/<lib-name> lint
```

8. Add a Changeset: `pnpm changeset`
