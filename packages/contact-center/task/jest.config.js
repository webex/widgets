const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/task/tests/**/*.ts', '**/task/tests/**/*.tsx'];

module.exports = jestConfig;
