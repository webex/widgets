const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/granular-agent-state/tests/**/*.ts', '**/granular-agent-state/tests/**/*.tsx'];

module.exports = jestConfig;
