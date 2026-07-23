# Changesets

This repo uses [Changesets](https://github.com/changesets/changesets) in **fixed** mode: every `@nestjs-redis/*` package always shares the same version.

## For contributors

When your PR changes a publishable package under `packages/`:

```bash
pnpm changeset
```

Or mark the PR as non-releasing (official empty Changeset):

```bash
pnpm exec changeset add --empty
```

CI runs `changeset status --since=…` and fails when packages changed without a Changeset.

## For maintainers (release)

1. `pnpm release:version` — bump all packages lockstep + update each package `CHANGELOG.md`
2. Commit the version + changelog files
3. Tag `vX.Y.Z` and push the tag (publish workflow handles npm)
