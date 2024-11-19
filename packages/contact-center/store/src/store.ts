import {makeAutoObservable, observable} from 'mobx';

import sdk from './sdk';

class Store {
  loginState = '';
  isAvailable = false;
  isSdkInitialised = false;
  ccSdk = sdk;
  sdkConfig: {
    config: any;
    from: String;
  } = undefined;

  constructor() {
    makeAutoObservable(this, {ccSdk: observable.ref, sdkConfig: observable.ref});

    this.ccSdk.on('presence:state', (payload) => {
      this.setIsAvailable(payload === 'available');
    });
  }

  setLoginState = (state) => {
    this.loginState = state;
  };

  setIsAvailable = (state) => {
    this.isAvailable = state;
  };

  setSdkConfig = ({config, from}: {config?: Object; from?: String}) => {
    if (typeof config === 'undefined') {
      console.log(`sdkConfig is not provided via ${from} widget`);
      return;
    } else {
      if (typeof this.sdkConfig !== 'undefined') {
        console.log(`sdkConfig already provided via ${this.sdkConfig.from} widget`);
        return;
      }
      this.sdkConfig = {
        config,
        from,
      };
      this.ccSdk.on('ready', () => {
        this.isSdkInitialised = true;
      });
      this.ccSdk.init(this.sdkConfig.config);
    }
  };
}

const store = new Store();
export default store;
