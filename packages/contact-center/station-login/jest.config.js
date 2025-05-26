const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/station-login/tests/**/*.ts', '**/station-login/tests/**/*.tsx'];

module.exports = jestConfig;
