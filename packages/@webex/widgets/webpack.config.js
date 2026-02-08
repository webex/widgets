const path = require('path');
const webpack = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const {version} = require('./package.json');
const merge = require('webpack-merge').merge;

const baseConfigOriginal = require('../../../webpack.config');

const resolveMonorepoRoot = (...segments) => path.resolve(__dirname, '../../../', ...segments);

const {entry, ...baseConfig} = baseConfigOriginal;

const outputConfig = {
  dist: {
    path: path.resolve(__dirname, './dist'),
    filename: 'webexWidgets.mjs',
    library: {
      type: 'module',
    },
  },
  demo: {
    path: path.resolve(__dirname, './docs'),
    filename: 'demo.bundle.[contenthash].js',
  },
};

module.exports = function(env, argv) {
  const buildType = env.buildType;
  const mode = argv.mode;
  const isDemo = buildType === 'demo';
  const isDist = buildType === 'dist';

  const entryPoint = env.entry;

  return merge(baseConfig, {
    cache: true,
    entry: entryPoint,
    output: mode === 'development' ? undefined : outputConfig[buildType],

    // Enable ESM output
    experiments: isDist
      ? {
          outputModule: true,
        }
      : {},

    devtool: mode === 'production' ? 'source-map' : 'inline-source-map',

    externals: isDemo ? {} : ['prop-types', 'react', 'react-dom', 'webex', '@webex/common'],

    // // CSS minimization for dist builds
    optimization: isDist
      ? {
          minimizer: [
            `...`, // Keep default JS minimizer
            new CssMinimizerPlugin(),
          ],
        }
      : {},
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
          use: [isDemo ? 'style-loader' : MiniCssExtractPlugin.loader, 'css-loader'],
          include: [
            resolveMonorepoRoot('node_modules/@momentum-ui'),
            resolveMonorepoRoot('node_modules/@webex/components'),
            path.resolve(__dirname, 'packages'),
          ],
        },
        {
          test: /\.scss$/,
          use: [isDemo ? 'style-loader' : MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
          include: [path.resolve(__dirname, 'packages')],
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
          test: /\.(woff(2)?|ttf|eot|svg|png|gif)(\?v=\d+\.\d+\.\d+)?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                outputPath: isDemo ? 'assets/' : 'css/assets/',
                name: '[name].[contenthash].[ext]',
              },
            },
          ],
        },
      ],
    },
    devServer:
      argv.mode === 'development'
        ? {
            static: {
              directory: path.resolve(__dirname, './demo'),
            },
            open: true,
            hot: true,
            port: 9000,
            client: {
              overlay: false,
            },
            server: {
              type: 'https',
            },
          }
        : undefined,
    plugins: [
      new CleanWebpackPlugin(),
      isDemo &&
        new HtmlWebpackPlugin({
          filename: 'index.html',
          template: 'demo/index.html',
          favicon: 'demo/webex-logo.png',
        }),
      isDemo && new webpack.HotModuleReplacementPlugin(),
      !isDemo &&
        new MiniCssExtractPlugin({
          filename: 'css/webex-widgets.css',
        }),
      new webpack.DefinePlugin({
        __appVersion__: JSON.stringify(version),
      }),
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
    ],
  });
};
