const { mergeWithCustomize, customizeObject } = require('webpack-merge');
const path = require('path');

const baseConfig = require('../../../webpack.config');

// Helper function to resolve paths relative to the monorepo root
const resolveMonorepoRoot = (...segments) => path.resolve(__dirname, '../../../', ...segments);

module.exports = mergeWithCustomize({
  customizeObject: customizeObject({
    'resolve.fallback': 'replace' // This will replace the fallback configuration
  })
})(baseConfig, {
  entry: {
    wc: {
      import: './src/wc.ts',
    },
    index: {
      import: './src/index.ts',
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    publicPath: '',
  },
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    '@webex/cc-store': '@webex/cc-store',
    '@momentum-design/components': '@momentum-design/components',
  },
  resolve: {
    fallback: {}
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        include: [
          resolveMonorepoRoot('node_modules/@momentum-design'), // Include specific node module
          path.resolve(__dirname, 'packages') // Include all CSS from the local package
        ],
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",  // Injects styles into DOM
          "css-loader",    // Turns CSS into CommonJS
          "sass-loader"    // Compiles Sass to CSS
        ],
        include: [
          resolveMonorepoRoot('node_modules/@momentum-design'), // Include specific node module
          path.resolve(__dirname, 'packages') // Include all CSS from the local package
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        include: [resolveMonorepoRoot('node_modules/@momentum-design')],
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext][query]'
        }
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        include: [resolveMonorepoRoot('node_modules/@momentum-design')],
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext][query]'
        }
      }
    ],
  },
});
