const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {merge} = require('webpack-merge');

const baseConfig = require('../../../webpack.config');

module.exports = merge(baseConfig, {
  entry: './src/index.tsx', // Entry file for bundling
  resolve: {
    alias: {
      '@webex/cc-widgets': path.resolve(__dirname, '../../../packages/contact-center/cc-widgets/src'),
      '@webex/cc-station-login': path.resolve(__dirname, '../../../packages/contact-center/station-login/src'),
      '@webex/cc-user-state': path.resolve(__dirname, '../../../packages/contact-center/user-state/src'),
      '@webex/cc-task': path.resolve(__dirname, '../../../packages/contact-center/task/src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        include: [path.resolve(__dirname, '../../../packages/contact-center/**/src')],
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.scss$/,
        include: [path.join(__dirname, '../../../packages/contact-center/**/src')],
        use: [
          'style-loader', // Injects styles into DOM
          'css-loader', // Turns CSS into CommonJS
          'sass-loader', // Compiles Sass to CSS
        ],
        exclude: /node_modules/,
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
  },
});
