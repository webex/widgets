const path = require('path');
const webpack = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  cache: true,
  node: {
    fs: 'empty',
  },
  stats: 'errors-only',
  devtool: 'inline-source-map',
  externals: {
    react: 'react',
    'react-dom': 'reactDom',
    'prop-types': 'propTypes',
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: {
              minimize: true,
              interpolation: true,
              removeAttributeQuotes: false,
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: ['to-string-loader', 'style-loader', 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: ['to-string-loader', 'style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg|png)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/',
            },
          },
        ],
      },
    ],
  },
  devServer: {
    contentBase: path.resolve(__dirname, './src'),
    open: true,
    overlay: true,
    hot: true,
    port: 1234,
  },
  plugins: [
    new CleanWebpackPlugin({}),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/index.html',
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
};
