const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/ai-assistant/tests/**/*.ts', '**/ai-assistant/tests/**/*.tsx'];
jestConfig.moduleNameMapper['^@webex/cc-components$'] =
  '<rootDir>/packages/contact-center/cc-components/src/index.ts';

module.exports = jestConfig;
