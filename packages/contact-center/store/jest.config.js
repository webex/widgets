const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/store/tests/**/*.ts', '**/store/tests/**/*.tsx'];
jestConfig.setupFilesAfterEnv = [
  ...(jestConfig.setupFilesAfterEnv || []),
  '<rootDir>/packages/contact-center/store/tests/setupContactCenterMock.js',
];

module.exports = jestConfig;
