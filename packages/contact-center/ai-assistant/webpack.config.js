const {merge} = require('webpack-merge');
const path = require('path');
const fs = require('fs');

const baseConfig = require('../../../webpack.config');

const wellnessAssets = [
  'media.cjs',
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
            compilation.fileDependencies.add(sourcePath);
            const source = fs.readFileSync(sourcePath);
            compilation.emitAsset(`assets/wellness/${filename}`, new compiler.webpack.sources.RawSource(source), {
              minimized: filename.endsWith('.cjs'),
            });
            if (filename.endsWith('.mp3') || filename.endsWith('.json')) {
              const data = filename.endsWith('.mp3')
                ? `data:audio/mpeg;base64,${source.toString('base64')}`
                : JSON.parse(source.toString('utf8'));
              compilation.emitAsset(
                `assets/wellness/${filename.replace(/\.(mp3|json)$/, '.mjs')}`,
                new compiler.webpack.sources.RawSource(`export default ${JSON.stringify(data)};\n`),
                {minimized: true}
              );
            }
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
