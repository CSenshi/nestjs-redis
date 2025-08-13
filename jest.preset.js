const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.spec.ts',
    '!src/**/*.int.spec.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html', 'clover'],
};
