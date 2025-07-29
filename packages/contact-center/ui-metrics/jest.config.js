const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/ui-metrics/tests/**/*.ts', '**/ui-metrics/tests/**/*.tsx'];

module.exports = jestConfig;
