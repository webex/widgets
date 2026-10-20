// The package build generates JavaScript modules for the checked-in media.
// Consumers can load them without an MP3 or JSON loader.
exports.loadWellnessSoundUrl = () => import('./WellnessBreakSound.mjs').then((module) => module.default);

exports.loadWellnessAnimationData = (theme) =>
  (theme === 'dark' ? import('./WellnessBreakAnimationDark.mjs') : import('./WellnessBreakAnimationLight.mjs')).then(
    (module) => module.default
  );

exports.loadLottie = () => import('lottie-web').then((module) => module.default ?? module);
