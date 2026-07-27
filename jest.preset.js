/** @type {import('jest').Config} */
module.exports = {
  testMatch: ['**/?(*.)+(spec|test).?([mc])[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'js', 'html', 'mts', 'mjs', 'cts', 'cjs'],
  testEnvironment: 'node',
  // nodenext-style relative imports use .js; map to TS sources for Jest
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.spec.ts',
    '!src/**/*.int.spec.ts',
  ],
  coverageReporters: ['lcov'],
  collectCoverage: true,
};
