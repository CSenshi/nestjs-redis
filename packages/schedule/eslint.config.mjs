import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  {
    ignores: ['**/out-tsc'],
  },
];
