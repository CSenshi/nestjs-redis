#!/usr/bin/env node
/**
 * After `changeset version`, fold per-package changelogs into the root CHANGELOG.md
 * (fixed mode: all packages share one suite version / one release note block).
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const packagesDir = join(root, 'packages');
const rootChangelog = join(root, 'CHANGELOG.md');

function firstSection(markdown) {
  // Split on version headings like "## 1.4.0" or "## 1.4.0\n"
  const lines = markdown.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+\d+\.\d+\.\d+/.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+\d+\.\d+\.\d+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim() + '\n';
}

let section = null;
const packageChangelogs = [];

for (const dir of readdirSync(packagesDir)) {
  const changelogPath = join(packagesDir, dir, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) continue;
  packageChangelogs.push(changelogPath);
  if (!section) {
    section = firstSection(readFileSync(changelogPath, 'utf8'));
  }
}

if (!section) {
  console.log('No package changelog sections to consolidate.');
  process.exit(0);
}

const existing = existsSync(rootChangelog)
  ? readFileSync(rootChangelog, 'utf8')
  : '';

// Avoid duplicating if already prepended
const heading = section.split('\n')[0];
if (existing.startsWith(heading) || existing.includes(`\n${heading}\n`)) {
  console.log(
    'Root CHANGELOG already has this version section; skipping prepend.',
  );
} else {
  const next = existing
    ? `${section}\n${existing.replace(/^\uFEFF?/, '')}`
    : section;
  writeFileSync(rootChangelog, next);
  console.log('Prepended release notes to root CHANGELOG.md');
}

for (const p of packageChangelogs) {
  unlinkSync(p);
  console.log(`Removed ${p}`);
}
