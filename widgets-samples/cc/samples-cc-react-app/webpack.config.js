const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {merge} = require('webpack-merge');

const baseConfig = require('../../../webpack.config');

// Helper function to resolve paths relative to the monorepo root
const resolveMonorepoRoot = (...segments) => path.resolve(__dirname, '../../../', ...segments);

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
      '@webex/cc-ui-logging': path.resolve(__dirname, '../../../packages/contact-center/ui-metrics/src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        include: [
          resolveMonorepoRoot('node_modules/@momentum-ui'), // Include specific node module,
          resolveMonorepoRoot('node_modules/react-toastify'), // Include specific node module
          resolveMonorepoRoot('node_modules/@momentum-design'),
          path.resolve(__dirname, 'widgets-samples/cc'), // Include all CSS from the local package
        ],
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader', // Injects styles into DOM
          'css-loader', // Turns CSS into CommonJS
          'sass-loader', // Compiles Sass to CSS
        ],
        include: [
          resolveMonorepoRoot('node_modules/@momentum-ui'), // Include specific node module
          path.resolve(__dirname, 'widgets-samples/cc'), // Include all CSS from the local package
          resolveMonorepoRoot('node_modules/@momentum-design'),
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        include: [
          resolveMonorepoRoot('node_modules/@momentum-ui'),
          resolveMonorepoRoot('node_modules/@momentum-design'),
        ],
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext][query]',
        },
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        include: [
          resolveMonorepoRoot('node_modules/@momentum-ui'),
          resolveMonorepoRoot('node_modules/@momentum-design'),
        ],

        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext][query]',
        },
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
