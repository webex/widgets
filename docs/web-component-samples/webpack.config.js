const path = require('path');

module.exports = {
  entry: './src/index.ts', // Entry file for bundling
  output: {
    path: path.resolve(__dirname, 'dist'), // Output directory
    filename: 'bundle.js', // Output bundle file name
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.tsx', '.ts'], // Resolve JS and JSX files
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'), // Serve static files from the public directory
    },
    open: true,
    port: 3000,
  },
  mode: 'development', // Set mode to development
};
