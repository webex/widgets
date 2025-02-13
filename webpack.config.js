const webpack = require('webpack');
const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/index.ts',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.scss'],
    fallback: {
      fs: false,
      process: require.resolve('process/browser'),
      crypto: require.resolve('crypto-browserify'),
      querystring: require.resolve('querystring-es3'),
      os: require.resolve('os-browserify/browser'),
      stream: require.resolve('stream-browserify'),
      vm: require.resolve('vm-browserify'),
      util: require.resolve('util/'),
      url: require.resolve('url/'),
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",  // Injects styles into DOM
          "css-loader",    // Turns CSS into CommonJS
          "sass-loader"    // Compiles Sass to CSS
        ],
        exclude: /node_modules/
      }
    ],
  },
};
