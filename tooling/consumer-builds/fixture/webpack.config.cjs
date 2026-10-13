const path = require('node:path');

module.exports = {
  mode: 'production',
  entry: './src/main.js',
  module: {
    rules: [
      {test: /\.s?css$/, use: ['style-loader', 'css-loader', 'sass-loader']},
      {test: /\.(woff2?|ttf|eot|otf|png|jpe?g|gif|svg)$/, type: 'asset/resource'},
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist/webpack'),
    filename: 'main.js',
    chunkFilename: '[name].[contenthash].js',
    publicPath: 'auto',
    clean: true,
  },
};
