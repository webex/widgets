const {merge} = require('webpack-merge');
const path = require('path');
const webpack = require('webpack');

const baseConfig = require('../../../webpack.config');

// Helper function to resolve paths relative to the monorepo root
const resolveMonorepoRoot = (...segments) => path.resolve(__dirname, '../../../', ...segments);

module.exports = merge(baseConfig, {
  entry: {
    wc: {
      import: './src/wc.ts',
    },
    index: {
      import: './src/index.ts',
    },
  },
  resolve: {
    alias: {
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
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js', // Set the output filename to index.js
    libraryTarget: 'commonjs2',
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
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        include: [
          resolveMonorepoRoot('node_modules/@momentum-ui'), // Include specific node module
          resolveMonorepoRoot('node_modules/@momentum-design'),
          path.resolve(__dirname, 'packages'), // Include all CSS from the local package
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
          resolveMonorepoRoot('node_modules/@momentum-ui/react-collaboration'), // Include specific node module
          path.resolve(__dirname, 'packages'), // Include all CSS from the local package
          resolveMonorepoRoot('node_modules/@momentum-design'),
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        include: [
          resolveMonorepoRoot('node_modules/@momentum-ui/react-collaboration'),
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
          resolveMonorepoRoot('node_modules/@momentum-ui/react-collaboration'),
          resolveMonorepoRoot('node_modules/@momentum-design'),
        ],

        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext][query]',
        },
      },
    ],
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
  ],
  // Ignore certain webpack warnings related to critical dependencies
  stats: {
    warningsFilter: [
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Error: Can't resolve 'process\/browser'/,
    ],
  },
});
