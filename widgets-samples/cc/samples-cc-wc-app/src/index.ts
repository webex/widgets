import {store} from '@webex/cc-widgets/wc';

if (process.env.NODE_ENV !== 'production') {
  // @ts-expect-error: expose store for debugging in non-production builds only
  window.store = store;
}
