const {merge} = require('webpack-merge');
const path = require('path');

const baseConfig = require('../../../webpack.config');

module.exports = merge(baseConfig, {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js', // Set the output filename to index.js
    libraryTarget: 'commonjs2',
  },
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    '@webex/cc-store': '@webex/cc-store',
  },
});
