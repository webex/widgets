const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/cc-digital-channels/tests/**/*.ts', '**/cc-digital-channels/tests/**/*.tsx'];
jestConfig.transformIgnorePatterns = [
  '/node_modules/(?!(@momentum-design/components|@momentum-ui/web-components|@momentum-ui/react-collaboration|@lit|lit|cheerio|@popperjs|@webex-engage|@interactjs|react-error-boundary))',
];

module.exports = jestConfig;
