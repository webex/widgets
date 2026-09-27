const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/store/tests/**/*.ts', '**/store/tests/**/*.tsx'];
// The real SDK contract suite imports SDK modules whose dependencies include ES modules.
jestConfig.transformIgnorePatterns = jestConfig.transformIgnorePatterns.map((pattern) =>
  pattern.replace('(?!(', '(?!(@webex/|')
);
jestConfig.setupFilesAfterEnv = [
  ...(jestConfig.setupFilesAfterEnv || []),
  '<rootDir>/packages/contact-center/store/tests/setupContactCenterMock.js',
];

module.exports = jestConfig;
