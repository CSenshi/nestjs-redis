import type { Config } from 'jest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// Multi-project Jest config for all packages/* (no Nx discovery).
const projects = readdirSync(join(__dirname, 'packages'), {
  withFileTypes: true,
})
  .filter((d) => d.isDirectory())
  .map((d) => `<rootDir>/packages/${d.name}`);

export default {
  projects,
} satisfies Config;
