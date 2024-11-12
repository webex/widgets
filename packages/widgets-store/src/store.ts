import {makeAutoObservable, observable} from 'mobx';

import sdk from './sdk';

class Store {
  loginState = '';
  isAvailable = false;
  ccSdk = sdk;

  constructor() {
    makeAutoObservable(this, {ccSdk: observable.ref});

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
}

const store = new Store();
export default store;
