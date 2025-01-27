const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {merge} = require('webpack-merge');

const baseConfig = require('../../../webpack.config');

module.exports = merge(baseConfig, {
  entry: './src/index.tsx', // Entry file for bundling
  output: {
    path: path.resolve(__dirname, '../../../docs/samples-cc-react-app'), // Output directory
    filename: 'bundle.js', // Output bundle file name
    clean: true, // Clean dist folder before each build
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // Template HTML file
      filename: 'index.html',
    }),
  ],
  devServer: {
    static: path.join(__dirname, 'public'), // Serve files from public folder
    compress: true, // Enable gzip compression
    port: 3000, // Port for the dev server
    hot: true, // Enable hot module replacement
    open: false, // Open the app in browser on start
  },
});
