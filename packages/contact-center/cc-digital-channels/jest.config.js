const path = require('path');

module.exports = {
  rootDir: '.',
  setupFilesAfterEnv: [path.join(__dirname, '../../../jest.setup.js')],
  moduleNameMapper: {
    '^.+\\.(css|less|scss)$': 'babel-jest',
  },
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.ts', '**/tests/**/*.tsx'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@momentum-design/components|@momentum-ui/web-components|@momentum-ui/react-collaboration|@lit|lit|cheerio|@popperjs|@webex-engage|@interactjs))',
  ],
  transform: {
    '\\.[jt]sx?$': 'ts-jest',
  },
  moduleDirectories: ['node_modules', 'src'],
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
