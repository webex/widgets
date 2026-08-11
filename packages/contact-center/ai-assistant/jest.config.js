const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/ai-assistant/tests/**/*.ts', '**/ai-assistant/tests/**/*.tsx'];

module.exports = jestConfig;
