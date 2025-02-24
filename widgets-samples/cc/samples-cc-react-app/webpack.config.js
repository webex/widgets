const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {merge} = require('webpack-merge');

const baseConfig = require('../../../webpack.config');

module.exports = merge(baseConfig, {
  entry: './src/index.tsx', // Entry file for bundling
  resolve: {
    alias: {
      '@webex/cc-store': path.resolve(__dirname, '../../../packages/contact-center/store/src'),
      '@webex/cc-widgets': path.resolve(__dirname, '../../../packages/contact-center/cc-widgets/src'),
      '@webex/cc-station-login': path.resolve(__dirname, '../../../packages/contact-center/station-login/src'),
      '@webex/cc-user-state': path.resolve(__dirname, '../../../packages/contact-center/user-state/src'),
      '@webex/cc-task': path.resolve(__dirname, '../../../packages/contact-center/task/src'),
      '@webex/cc-components': path.resolve(__dirname, '../../../packages/contact-center/cc-components/src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
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
    liveReload: true, // Reload page on changes
  },
});
