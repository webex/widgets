import {makeAutoObservable, observable} from 'mobx';
import Webex from 'webex';
import {IContactCenter, IAgentProfile, Team} from '@webex/plugin-cc';

class Store {
  teams: Team[] = [];
  loginOptions: string[] = [];
  cc: IContactCenter;

  constructor() {
    makeAutoObservable(this, {cc: observable.ref});
  }

  init(webexConfig: any, access_token: string): Promise<void> { 
    return new Promise((resolve, reject) => {
      const webex = Webex.init({
        config: webexConfig,
        credentials: {
          access_token: access_token
        }
      });
  
      webex.once('ready', () => {
        this.cc = webex.cc;
        this.cc.register().then((response: IAgentProfile) => {
          this.teams = response.teams;
          this.loginOptions = response.loginVoiceOptions;
          resolve();
        })
        .catch((error) => {
          reject(error);
        })
      })
    });
  }
}

const store = new Store();
export default store;
