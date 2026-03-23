const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/@webex/widgets/tests/**/*.test.{js,jsx}'];
jestConfig.globals = {
  ...jestConfig.globals,
  __appVersion__: '1.0.0-test',
};
jestConfig.coveragePathIgnorePatterns = [
  ...(jestConfig.coveragePathIgnorePatterns || []),
  'WebexLogo\\.jsx$',
];

module.exports = jestConfig;
