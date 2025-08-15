const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/ui-logging/tests/**/*.ts', '**/ui-logging/tests/**/*.tsx'];

module.exports = jestConfig;
