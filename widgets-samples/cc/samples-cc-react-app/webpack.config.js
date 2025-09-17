const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {HotModuleReplacementPlugin, ProvidePlugin} = require('webpack');
// Helper function to resolve paths relative to the monorepo root
const resolveMonorepoRoot = (...segments) => path.resolve(__dirname, '../../../', ...segments);

// Workspaces we want to alias/include
const PKG_SRC = [
  'packages/contact-center/store/src',
  'packages/contact-center/cc-widgets/src',
  'packages/contact-center/station-login/src',
  'packages/contact-center/user-state/src',
  'packages/contact-center/task/src',
  'packages/contact-center/cc-components/src',
  'packages/contact-center/ui-logging/src',
].map((p) => resolveMonorepoRoot(p));

module.exports = {
  mode: process.env.NODE_ENV || 'development',

  entry: './src/index.tsx', // Entry file for bundling

  output: {
    path: path.resolve(__dirname, '../../../docs/samples-cc-react-app'),
    filename: 'bundle.js',
    clean: true,
  },

  resolve: {
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
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@webex/cc-store': path.resolve(__dirname, '../../../packages/contact-center/store/src'),
      '@webex/cc-widgets': path.resolve(__dirname, '../../../packages/contact-center/cc-widgets/src'),
      '@webex/cc-station-login': path.resolve(__dirname, '../../../packages/contact-center/station-login/src'),
      '@webex/cc-user-state': path.resolve(__dirname, '../../../packages/contact-center/user-state/src'),
      '@webex/cc-task': path.resolve(__dirname, '../../../packages/contact-center/task/src'),
      '@webex/cc-components': path.resolve(__dirname, '../../../packages/contact-center/cc-components/src'),
      '@webex/cc-ui-logging': path.resolve(__dirname, '../../../packages/contact-center/ui-logging/src'),
    },
    symlinks: true,
  },
  module: {
    rules: [
      // TS/TSX → transpile only (skip type-checking)
      {
        test: /\.[jt]sx?$/,
        include: [path.resolve(__dirname, 'src'), ...PKG_SRC],
        loader: 'ts-loader',
        options: {
          transpileOnly: true, // ✅ disables type-checking
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        include: [
          resolveMonorepoRoot('node_modules/@momentum-ui'), // Include specific node module,
          resolveMonorepoRoot('node_modules/react-toastify'), // Include specific node module
          resolveMonorepoRoot('node_modules/@momentum-design'),
          path.resolve(__dirname, 'src'),
          ...PKG_SRC,
        ],
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          {loader: 'css-loader', options: {importLoaders: 1}},
          {loader: 'sass-loader', options: {implementation: require('sass')}},
        ],
        include: [
          resolveMonorepoRoot('node_modules/@momentum-ui'), // Include specific node module
          path.resolve(__dirname, 'widgets-samples/cc'), // Include all CSS from the local package
          resolveMonorepoRoot('node_modules/@momentum-design'),
          path.resolve(__dirname, 'src'), // your app
          ...PKG_SRC, // all workspace packages
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
    new ProvidePlugin({
      process: 'process/browser',
    }),
    new HotModuleReplacementPlugin(),
  ],

  devServer: {
    static: path.join(__dirname, 'public'), // Serve files from public folder
    compress: true, // Enable gzip compression
    port: 3000, // Port for the dev server
    hot: true, // Enable hot module replacement
    open: false, // Open the app in browser on start
    liveReload: true, // Reload page on changes
    watchFiles: {
      paths: [path.resolve(__dirname, 'src'), ...PKG_SRC],
    },
  },

  watchOptions: {
    followSymlinks: true,
    ignored: /node_modules\/(?!@webex)/,
  },
  stats: {
    // While building and running the sample app when sass-loader is used we get a lot of deprecation warnings
    // This is a workaround to suppress them untill we move away from sass-loader
    warningsFilter: [/sass-loader/],
  },
};
