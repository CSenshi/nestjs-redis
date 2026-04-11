# Release Checklist

Run before cutting a release. Publishing is handled by GitHub CI after pushing the tag.

## 1. Ensure clean working tree

```bash
git status
```

No uncommitted changes should be present.

## 2. Lint, typecheck, and test

Redis must be running (`docker compose up redis -d`):

```bash
pnpm exec nx run-many -t lint typecheck test
pnpm exec nx format:check --all
```

## 3. Review commits since last release

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

Confirm all commits follow conventional commit format - the release tooling uses these for version bumps and changelog generation.

## 4. Bump version and push

Choose the appropriate bump:

```bash
pnpm exec nx release major --skipPublish
pnpm exec nx release minor --skipPublish
pnpm exec nx release patch --skipPublish
# or a specific version:
pnpm exec nx release 1.2.3 --skipPublish
```

Then push the tag to trigger CI publish:

```bash
git push --follow-tags
```

## Checklist

- [ ] Clean working tree
- [ ] Lint, typecheck, tests pass
- [ ] Formatting clean
- [ ] Commit history follows conventional commits
- [ ] Version bump confirmed
- [ ] Tag pushed (CI handles publish)
