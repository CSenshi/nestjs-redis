import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

/**
 * Shared Vitest config for all packages/* (NestJS needs SWC for decorator metadata).
 */
export function createVitestConfig(packageName: string) {
  return defineConfig({
    // Disable default Oxc/esbuild transform; SWC handles TS + decorator metadata
    oxc: false,
    plugins: [
      swc.vite({
        jsc: {
          target: 'es2022',
          parser: {
            syntax: 'typescript',
            decorators: true,
            dynamicImport: true,
          },
          transform: {
            decoratorMetadata: true,
            legacyDecorator: true,
          },
          keepClassNames: true,
          externalHelpers: true,
          loose: true,
        },
        module: { type: 'es6' },
      }),
    ],
    test: {
      name: packageName,
      globals: true,
      environment: 'node',
      include: ['src/**/*.spec.ts'],
      passWithNoTests: true,
      setupFiles: [join(rootDir, 'vitest.setup.ts')],
      coverage: {
        provider: 'v8',
        reportsDirectory: `../../test-output/${packageName}`,
        include: ['src/**/*.{ts,js}'],
        exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
      },
    },
    // nodenext-style relative imports use .js; map to TS sources
    resolve: {
      extensions: ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs', '.json'],
    },
  });
}
