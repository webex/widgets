const {merge} = require('webpack-merge');
const path = require('path');

const baseConfig = require('../../../webpack.config');

module.exports = merge(baseConfig, {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js', // Set the output filename to index.js
    libraryTarget: 'commonjs2',
  },
  module: {
    rules: [
      {
        test: /\.module\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
            },
          },
          'sass-loader',
        ],
        include: path.resolve(__dirname, 'src')
      },
    ],
  }
});
