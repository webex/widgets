const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = [
  '**/cc-components/tests/**/*.ts',
  '**/cc-components/tests/**/*.tsx',
  '!**/cc-components/tests/utils/**',
  '!**/cc-components/tests/fixtures/**',
  '!**/cc-components/tests/helpers/**',
];

module.exports = jestConfig;
