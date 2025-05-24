const path = require('path');

module.exports = {
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^.+\\.(css|less|scss)$': 'babel-jest',
  },
  testEnvironment: 'jsdom',
  testMatch: ['**/tooling/tests/*.js'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@momentum-design/components|@momentum-ui/react-collaboration|@lit|lit|cheerio))',
  ],
  // Use babel-jest or ts-jest depending on your setup
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
    '\\.[jt]s?$': 'babel-jest',
  },
  moduleDirectories: ['node_modules', 'src'],
};
