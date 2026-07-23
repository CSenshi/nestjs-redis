# Changesets

This repo uses [Changesets](https://github.com/changesets/changesets) in **fixed** mode: every `@nestjs-redis/*` package always shares the same version.

## For contributors

When your PR changes a publishable package under `packages/`:

```bash
pnpm changeset
```

Or mark the PR as non-releasing:

```bash
touch .changeset/no-release
```

CI fails package-touching PRs that lack either a `.changeset/*.md` note or the `no-release` marker.

## For maintainers (release)

1. `pnpm release:version` — bump all packages lockstep + update root `CHANGELOG.md`
2. Commit the version + changelog
3. Tag `vX.Y.Z` and push the tag (publish workflow handles npm)
