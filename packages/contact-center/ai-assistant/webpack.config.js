const {merge} = require('webpack-merge');
const path = require('path');

const baseConfig = require('../../../webpack.config');

// Preserve dynamic imports so animation data and audio are fetched only when a
// break is about to play.
baseConfig.module.rules = baseConfig.module.rules.map((rule) =>
  String(rule.test) === String(/\.(ts|tsx)$/)
    ? {...rule, use: {loader: 'ts-loader', options: {compilerOptions: {module: 'esnext'}}}}
    : rule
);

class CopyMatchingFilesPlugin {
  constructor(source, destination) {
    this.source = source;
    this.destination = destination;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tap('CopyMatchingFilesPlugin', () => {
      const fs = require('fs');
      if (!fs.existsSync(this.source)) return;
      fs.mkdirSync(this.destination, {recursive: true});
      fs.readdirSync(this.source)
        .filter((filename) => filename.includes('lottie-web'))
        .forEach((filename) => fs.copyFileSync(path.join(this.source, filename), path.join(this.destination, filename)));
    });
  }
}

module.exports = merge(baseConfig, {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    publicPath: 'auto',
    chunkFilename: 'assets/wellness/[name].[contenthash:8].js',
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
        test: /WellnessBreakSound\.mp3$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/wellness/[name][ext]',
        },
      },
    ],
  },
  plugins: [
    new CopyMatchingFilesPlugin(
      path.resolve(__dirname, '../cc-components/dist/assets/wellness'),
      path.resolve(__dirname, 'dist/assets/wellness')
    ),
  ],
});
