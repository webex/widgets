const path = require('path');
const {merge} = require('webpack-merge');

const baseConfig = require('../../../webpack.config');

module.exports = merge(baseConfig, {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },

  resolve: {
    extensions: ['.js', '.jsx', '.tsx', '.ts'],
  },
  devServer: {
    static: {
      directory: path.join(__dirname),
    },
    open: false,
    port: 4000,
  },
});
