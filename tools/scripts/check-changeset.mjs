#!/usr/bin/env node
/**
 * Fail when publishable packages change without a changeset note or no-release marker
 * in the same PR/diff range. Used by PR CI.
 *
 * Base ref: CHANGESET_BASE, else origin/$GITHUB_BASE_REF, else origin/main.
 */
import { execSync } from 'node:child_process';

const root = process.cwd();
const base =
  process.env.CHANGESET_BASE ??
  (process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : 'origin/main');

function git(args) {
  return execSync(`git ${args}`, { encoding: 'utf8', cwd: root }).trim();
}

function changedFiles() {
  try {
    const out = git(`diff --name-only ${base}...HEAD`);
    if (out) return out.split('\n').filter(Boolean);
  } catch {
    // base may be missing locally
  }
  try {
    const out = git(`diff --name-only ${base}`);
    return out ? out.split('\n').filter(Boolean) : [];
  } catch {
    console.warn(`Could not diff against ${base}; skipping changeset check.`);
    process.exit(0);
  }
}

const files = changedFiles();
const packageTouched = files.some(
  (f) => f.startsWith('packages/') && !f.endsWith('.md'),
);

if (!packageTouched) {
  console.log('No publishable package source changes; changeset not required.');
  process.exit(0);
}

// Only count notes/markers introduced in this change range (not leftovers on main)
const changesetChanges = files.filter((f) => f.startsWith('.changeset/'));
const hasNote = changesetChanges.some(
  (f) => f.endsWith('.md') && !f.toLowerCase().endsWith('readme.md'),
);
const hasNoRelease = changesetChanges.includes('.changeset/no-release');

if (!hasNote && !hasNoRelease) {
  console.error(
    [
      'Publishable packages changed without a Changeset.',
      'Run `pnpm changeset` and commit the generated file under .changeset/,',
      'or add an empty `.changeset/no-release` marker for non-releasing PRs.',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(
  hasNoRelease
    ? 'Found .changeset/no-release marker in this change; OK.'
    : 'Found changeset note(s) in this change; OK.',
);
