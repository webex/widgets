const {merge} = require('webpack-merge');
const path = require('path');

const baseConfig = require('../../../webpack.config');

module.exports = merge(baseConfig, {
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
    filename: '[name].js', // Set the output filename to index.js
    libraryTarget: 'commonjs2',
  },
});
