import type {AnimationConfigWithData} from 'lottie-web';
import type {WellnessAnimationLoader} from '@webex/cc-components';

export const loadWellnessAnimation: WellnessAnimationLoader = async (container, animationData) => {
  const {default: lottie} = await import(/* webpackChunkName: "lottie-web" */ 'lottie-web');
  return lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: animationData as AnimationConfigWithData['animationData'],
    rendererSettings: {preserveAspectRatio: 'xMidYMid slice'},
  });
};
