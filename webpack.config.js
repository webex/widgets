const baseConfig = require('./tooling/webpack/base.config');

module.exports = {
  ...baseConfig,
  entry: './src/index.ts',
};
