const path = require('path');
const webpack = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function(env, argv) {
  return {
    cache: true,
    output:
      argv.mode === 'production'
        ? {
            path: path.resolve(__dirname, './docs'),
            filename: 'demo.bundle.[hash].js',
          }
        : undefined, // Otherwise the CleanWebpackPlugin will wipe our build during devserver
    node: {
      fs: 'empty', // Webex SDK `fs` dependency does not exist in browser.
    },
    devtool: argv.mode === 'production' ? 'source-map' : 'inline-source-map',
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
          test: /\.html$/,
          use: [
            {
              loader: 'html-loader',
            },
          ],
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.scss$/,
          exclude: /node_modules/,
          use: ['style-loader', 'css-loader', 'sass-loader'],
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
    devServer:
      argv.mode === 'development'
        ? {
            contentBase: path.resolve(__dirname, './demo'),
            open: true,
            overlay: true,
            hot: true,
            port: 9000,
            stats: 'errors-warnings',
            https: true,
          }
        : undefined,
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: 'demo/index.html',
        favicon: 'demo/webex-logo.png',
      }),
      new webpack.HotModuleReplacementPlugin(),
    ],
  };
};
