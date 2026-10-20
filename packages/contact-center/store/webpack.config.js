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
        // Emit the declarations required by downstream workspace type imports.
        use: 'ts-loader',
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js', // Set the output filename to index.js
    libraryTarget: 'commonjs2',
  },
});
