const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

module.exports = function() {
  return {
    mode: 'production',
    cache: true,
    output:
    {
      path: path.resolve(__dirname, './build.cdn'),
      filename: 'webexWidgets.bundle.js',
    },
    node: {
      fs: 'empty', // Webex SDK `fs` dependency does not exist in browser.
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
          },
        },
        {
          test: /\.css$/, 
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        {
          test: /\.(woff(2)?|ttf|eot|svg|png|gif)(\?v=\d+\.\d+\.\d+)?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                outputPath: 'assets/',
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'webexWidgets.css'
      }),
      new CleanWebpackPlugin(),
    ],
  };
};
