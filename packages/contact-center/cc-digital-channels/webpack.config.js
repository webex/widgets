const {mergeWithCustomize, customizeArray} = require('webpack-merge');
const path = require('path');

const baseConfig = require('../../../webpack.config');

// Helper function to resolve paths relative to the monorepo root
const resolveMonorepoRoot = (...segments) => path.resolve(__dirname, '../../../', ...segments);

module.exports = mergeWithCustomize({
  customizeArray: customizeArray({
    'module.rules': 'replace',
  }),
})(baseConfig, {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.scss'],
    fallback: {
      ...baseConfig.resolve?.fallback,
      worker_threads: false,
    },
  },
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    '@webex/cc-store': '@webex/cc-store',
    '@momentum-ui/web-components': '@momentum-ui/web-components',
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        include: [
          resolveMonorepoRoot('node_modules/@momentum-ui/web-components'),
          path.resolve(__dirname, 'src'),
        ],
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ],
        include: [
          resolveMonorepoRoot('node_modules/@momentum-ui/web-components'),
          path.resolve(__dirname, 'src'),
        ],
      },
    ],
  },
});
