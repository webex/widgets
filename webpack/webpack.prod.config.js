const path = require('path');
const webpack = require('webpack');
const commonConfig = require('./webpack.config');

function createConfig(affix, format) {
  const prodConfig = {
    externals: {
      react: 'react',
      'react-dom': 'reactDom',
      'prop-types': 'propTypes',
    },
    mode: 'production',
    entry: path.resolve(__dirname, './../src/index.js'),
    output: {
      path: path.resolve(__dirname, './../dist'),
      filename: `webexWidgets.${affix}.js`,
      library: 'WebexWidgets',
      libraryTarget: format,
    },
  };

  return Object.assign(prodConfig, commonConfig);
}

module.exports = [createConfig('cjs', 'commonjs'), createConfig('umd', 'umd'), createConfig('esm', 'var')];
