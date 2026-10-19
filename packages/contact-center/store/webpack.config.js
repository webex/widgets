const {mergeWithCustomize, customizeArray} = require('webpack-merge');
const path = require('path');

const baseConfig = require('../../../webpack.config');

module.exports = mergeWithCustomize({
  customizeArray: customizeArray({
    'module.rules': 'replace',
  }),
})(baseConfig, {
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js', // Set the output filename to index.js
    libraryTarget: 'commonjs2',
  },
});
