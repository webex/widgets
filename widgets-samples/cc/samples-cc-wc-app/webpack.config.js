const path = require('path');
const {merge} = require('webpack-merge');

const baseConfig = require('../../../webpack.config');

// Helper function to resolve paths relative to the monorepo root
const resolveMonorepoRoot = (...segments) => path.resolve(__dirname, '../../../', ...segments);

module.exports = merge(baseConfig, {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },

  resolve: {
    extensions: ['.js', '.jsx', '.tsx', '.ts'],
  },
  devServer: {
    static: {
      directory: path.join(__dirname),
    },
    open: false,
    port: 4000,
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
});
