const { mergeWithCustomize, customizeObject } = require('webpack-merge');
const path = require('path');

const baseConfig = require('../../../webpack.config');

// Helper function to resolve paths relative to the monorepo root
const resolveMonorepoRoot = (...segments) => path.resolve(__dirname, '../../../', ...segments);

module.exports = mergeWithCustomize({
  customizeObject: customizeObject({
    'resolve.fallback': 'replace' // This will replace the fallback configuration
  })
})(baseConfig, {
  entry: {
    wc: {
      import: './src/wc.ts',
    },
    index: {
      import: './src/index.ts',
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    publicPath: '',
  },
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    '@webex/cc-store': '@webex/cc-store',
    "@emotion/react": "@emotion/react",
    "@emotion/styled": "@emotion/styled",
    "@mui/material": "@mui/material",
  },
  resolve: {
    fallback: {}
  },
});
