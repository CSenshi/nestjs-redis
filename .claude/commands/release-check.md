# Release Checklist

Run before cutting a release. Publishing is handled by GitHub CI after pushing the tag.

## 1. Ensure clean working tree

```bash
git status
```

No uncommitted changes should be present.

## 2. Lint, typecheck, and test

Redis must be running (`docker compose up redis -d`; cluster suites need `redis-cluster` too):

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

## 3. Review commits / pending changesets

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
ls .changeset/
```

Confirm conventional commits and that pending `.changeset/*.md` notes describe the release.

## 4. Bump version, tag, and push

```bash
pnpm release:version   # lockstep bump + root CHANGELOG.md
git add -A
git commit -m "chore(release): X.Y.Z"
git tag vX.Y.Z
git push --follow-tags
```

Tag `v*.*.*` triggers the Publish workflow (build + npm publish with provenance). There is no Version Packages bot PR.

## Checklist

- [ ] Clean working tree
- [ ] Lint, typecheck, tests pass
- [ ] Formatting clean
- [ ] Changeset notes reviewed / applied via `release:version`
- [ ] Tag pushed (CI handles publish)
