const path = require('path');

module.exports = function emitWellnessAsset(source) {
  const filename = `assets/wellness/${path.basename(this.resourcePath)}`;
  this.emitFile(filename, source);
  return `module.exports = __webpack_public_path__ + ${JSON.stringify(filename)};`;
};

module.exports.raw = true;
