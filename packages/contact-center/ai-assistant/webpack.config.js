const {merge} = require('webpack-merge');
const path = require('path');
const fs = require('fs');

const baseConfig = require('../../../webpack.config');

const wellnessAssets = [
  'media.cjs',
  'emit-wellness-asset.cjs',
  'WellnessBreakSound.mp3',
  'WellnessBreakAnimationDark.json',
  'WellnessBreakAnimationLight.json',
];

class EmitWellnessAssetsPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('EmitWellnessAssetsPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'EmitWellnessAssetsPlugin',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        () => {
          for (const filename of wellnessAssets) {
            const sourcePath = path.resolve(__dirname, 'src/wellness/assets', filename);
            compilation.emitAsset(
              `assets/wellness/${filename}`,
              new compiler.webpack.sources.RawSource(fs.readFileSync(sourcePath)),
              // A consuming Webpack build must still recognize require.ensure's require callback.
              {minimized: filename.endsWith('.cjs')}
            );
          }
        }
      );
    });
  }
}

module.exports = merge(baseConfig, {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
  },
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    '@webex/cc-store': '@webex/cc-store',
    '@momentum-ui/react-collaboration': '@momentum-ui/react-collaboration',
    './assets/media.cjs': 'commonjs ./assets/wellness/media.cjs',
  },
  plugins: [new EmitWellnessAssetsPlugin()],
});
