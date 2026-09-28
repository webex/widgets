const {merge} = require('webpack-merge');
const path = require('path');

const baseConfig = require('../../../webpack.config');

// Preserve lazy media imports in the wellness hook and renderer loader.
const wellnessModuleFile = /wellness\/(?:useWellnessBreak|animation)\.ts$/;
baseConfig.module.rules = baseConfig.module.rules.flatMap((rule) =>
  String(rule.test) === String(/\.(ts|tsx)$/)
    ? [
        {...rule, exclude: [rule.exclude, wellnessModuleFile]},
        {...rule, test: wellnessModuleFile, use: {loader: 'ts-loader', options: {compilerOptions: {module: 'esnext'}}}},
      ]
    : [rule]
);

module.exports = merge(baseConfig, {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    publicPath: 'auto',
    chunkFilename: 'assets/wellness/[name].[contenthash:8].js',
  },
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    '@webex/cc-store': '@webex/cc-store',
    '@momentum-ui/react-collaboration': '@momentum-ui/react-collaboration',
  },
  module: {
    rules: [
      {
        test: /WellnessBreakSound\.mp3$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/wellness/[name][ext]',
        },
      },
    ],
  },
});
