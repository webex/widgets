// Keep these CommonJS requests visible to the consuming Webpack build. The
// assistant's package build leaves this file alongside its published assets.
exports.loadWellnessSoundUrl = () => Promise.resolve(require('!!./emit-wellness-asset.cjs!./WellnessBreakSound.mp3'));

exports.loadWellnessAnimationData = (theme) =>
  new Promise((resolve, reject) => {
    if (theme === 'dark') {
      require.ensure(
        [],
        (require) => resolve(require('./WellnessBreakAnimationDark.json')),
        reject,
        'wellness-animation-dark'
      );
    } else {
      require.ensure(
        [],
        (require) => resolve(require('./WellnessBreakAnimationLight.json')),
        reject,
        'wellness-animation-light'
      );
    }
  });

exports.loadLottie = () =>
  new Promise((resolve, reject) => {
    require.ensure([], (require) => resolve(require('lottie-web')), reject, 'lottie-web');
  });
