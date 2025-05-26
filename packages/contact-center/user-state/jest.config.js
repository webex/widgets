const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/user-state/tests/**/*.ts', '**/user-state/tests/**/*.tsx'];

module.exports = jestConfig;
