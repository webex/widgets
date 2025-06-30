const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {merge} = require('webpack-merge');
const webpack = require('webpack');

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
      // Add process alias to help with problematic packages
      'process/browser': require.resolve('process/browser.js'),
    },
    fallback: {
      ...baseConfig.resolve?.fallback,
      process: require.resolve('process/browser.js'),
      'process/browser': require.resolve('process/browser.js'),
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util/'),
      url: require.resolve('url/'),
      fs: false,
      path: require.resolve('path-browserify'),
    },
    // Add main fields to resolve modules properly
    mainFields: ['browser', 'module', 'main'],
    // Add symlinks resolution
    symlinks: false,
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
      'process.browser': true,
      'process.version': JSON.stringify(process.version),
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html', // Template HTML file
      filename: 'index.html',
    }),
  ],
  // Add external configuration for problematic modules
  externals: {
    // If process issues persist, we can externalize it
  },
  // Ignore certain webpack warnings related to critical dependencies
  stats: {
    warningsFilter: [
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Error: Can't resolve 'process\/browser'/,
    ],
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
          resolveMonorepoRoot('node_modules/@webex-engage'),
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
          resolveMonorepoRoot('node_modules/@momentum-design'),
          resolveMonorepoRoot('node_modules/@webex-engage'),
          path.resolve(__dirname, 'widgets-samples/cc'), // Include all CSS from the local package
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        include: [
          resolveMonorepoRoot('node_modules/@momentum-ui'),
          resolveMonorepoRoot('node_modules/@momentum-design'),
          resolveMonorepoRoot('node_modules/@webex-engage'),
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
          resolveMonorepoRoot('node_modules/@webex-engage'),
        ],
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext][query]',
        },
      },
      // Handle JS files from problematic packages
      {
        test: /\.js$/,
        include: [resolveMonorepoRoot('node_modules/@webex-engage')],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, '../../../docs/samples-cc-react-app'), // Output directory
    filename: '[name].[contenthash].js', // Output bundle file name with hashes to avoid conflicts
    clean: true, // Clean dist folder before each build
    globalObject: 'this', // Ensure compatibility with web workers
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        webexEngage: {
          test: /[\\/]node_modules[\\/]@webex-engage[\\/]/,
          name: 'webex-engage',
          chunks: 'all',
          priority: 10,
        },
      },
    },
  },
  devServer: {
    static: path.join(__dirname, 'public'), // Serve files from public folder
    compress: true, // Enable gzip compression
    port: 3000, // Port for the dev server
    hot: true, // Enable hot module replacement
    open: false, // Open the app in browser on start
    liveReload: true, // Reload page on changes
  },
});
