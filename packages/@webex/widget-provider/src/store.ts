import {makeAutoObservable, observable} from 'mobx';

import sdk from './sdk';

class Store {
  loginState = '';
  isAvailable = false;
  sdk = sdk;

  constructor() {
    const webexConfig = {}
    const token = ''
    makeAutoObservable(this, {sdk: observable.ref});

    sdk.init({accessToken: token, webexConfig});
    sdk.registerCC();
  }

  // setLoginState = (state) => {
  //   this.loginState = state;
  // };

  // setIsAvailable = (state) => {
  //   this.isAvailable = state;
  // };
}

const store = new Store();
export default store;
