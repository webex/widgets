const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/cc-digital-channels/tests/**/*.ts', '**/cc-digital-channels/tests/**/*.tsx'];

module.exports = jestConfig;
