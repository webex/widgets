const path = require('path');
const webpack = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {version} = require('./package.json');

const widgetsDir = path.dirname(require.resolve('@webex/widgets/package.json'));

module.exports = function(env, argv) {
  return {
    cache: true,
    entry: './src/App.jsx', // Entry file for bundling
    output:
      argv.mode === 'production'
        ? {
            path: path.resolve(__dirname, '../../docs/samples-meeting-app'), // Output directory
            filename: 'bundle.[hash].js',
          }
        : undefined, // Otherwise the CleanWebpackPlugin will wipe our build during devserver
    devtool: argv.mode === 'production' ? 'source-map' : 'inline-source-map',
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: {
        react: path.dirname(require.resolve('react/package.json', { paths: [widgetsDir] })),
        'react-dom': path.dirname(require.resolve('react-dom/package.json', { paths: [widgetsDir] })),
        'prop-types': path.dirname(require.resolve('prop-types/package.json', { paths: [widgetsDir] })),
        webex: path.dirname(require.resolve('webex/package.json', { paths: [widgetsDir] })),
        '@webex/common': path.dirname(require.resolve('@webex/common/package.json', { paths: [widgetsDir] })),
      },
      fallback: {
        "buffer": require.resolve("buffer/"),
        "crypto": require.resolve("crypto-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "stream": require.resolve("stream-browserify"),
        "util": require.resolve("util/"),
        "url": require.resolve("url/"),
        "vm": require.resolve("vm-browserify"),
        "querystring": require.resolve('querystring-es3'),
        "fs": false
      } /*
         * In order to include polyfills for node.js core modules, we need to add a fallback 
         * for the relevant packages as webpack 5 doesn't include them by default
         */ 
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
        // {
        //   test: /\.(woff(2)?|ttf|eot|svg|png|gif)(\?v=\d+\.\d+\.\d+)?$/,
        //   use: [
        //     {
        //       loader: 'file-loader',
        //       options: {
        //         outputPath: 'assets/',
        //       },
        //     },
        //   ],
        // },
      ],
    },
    devServer:
      argv.mode === 'development'
        ? {
            static: {
              directory: path.resolve(__dirname, './src '),
            },
            open: false,
            hot: true,
            port: 9000,
            client: {
              overlay: false,
            },
            server: {
              type: 'https',
            },
          } // After upgrading webpack dev server to the latest version, config required changes as existing options were deprecated
        : undefined,
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: 'src/index.html',
        favicon: 'src/webex-logo.png',
      }),
      new webpack.HotModuleReplacementPlugin(),
      new webpack.DefinePlugin({
        __appVersion__: JSON.stringify(version)
      }),
      new webpack.ProvidePlugin({  //Fixes 'process is not defined' and 'Buffer not defined' errors
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      }),
    ],
  };
};
