import type {AnimationConfigWithData} from 'lottie-web';
import type {WellnessAnimationLoader} from '@webex/cc-components';
import {loadLottie} from './assets/media.cjs';

export const loadWellnessAnimation: WellnessAnimationLoader = async (container, animationData) => {
  const lottie = await loadLottie();
  return lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: animationData as AnimationConfigWithData['animationData'],
    rendererSettings: {preserveAspectRatio: 'xMidYMid slice'},
  });
};
