const path = require('path');

let momentumPath = '<rootDir>/node_modules/@momentum-design/components/dist/react';
module.exports = {
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    'cheerio/lib/utils': '<rootDir>/node_modules/enzyme/build/Utils.js',
    '^@momentum-design/components/dist/react(.*)$': momentumPath,
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
