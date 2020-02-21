const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const commonConfig = require('./webpack.config');

const devConfig = {
  mode: 'development',
  devServer: {
    contentBase: path.resolve(__dirname, './../demo'),
    open: true,
    overlay: true,
    hot: true,
    port: 9000,
    stats: 'errors-warnings',
    https: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'demo/index.html',
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
};

module.exports = Object.assign(devConfig, commonConfig);
