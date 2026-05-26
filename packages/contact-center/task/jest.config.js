const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/task/tests/**/*.ts', '**/task/tests/**/*.tsx'];
jestConfig.setupFilesAfterEnv = [
  ...(jestConfig.setupFilesAfterEnv || []),
  '<rootDir>/packages/contact-center/task/tests/setupContactCenterMock.js',
];

module.exports = jestConfig;
