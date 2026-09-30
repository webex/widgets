export function loadWellnessSoundUrl(): Promise<string>;
export function loadWellnessAnimationData(theme: 'dark' | 'light'): Promise<unknown>;
export function loadLottie(): Promise<(typeof import('lottie-web'))['default']>;
