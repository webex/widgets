import {makeAutoObservable, observable} from 'mobx';
import Webex from 'webex';
import {
  AgentLogin,
  IContactCenter,
  IAgentProfile,
  Team,
  WithWebex,
  InitParams,
  IStore
} from './store.types';

class Store implements IStore {
  teams: Team[] = [];
  loginOptions: string[] = [];
  cc: IContactCenter;

  constructor() {
    makeAutoObservable(this, {cc: observable.ref});
  }

  registerCC(webex: WithWebex['webex']): Promise<IAgentProfile> {
    this.cc = webex.cc;
    console.trace(this.cc.register);
    return this.cc.register().then((response: IAgentProfile) => {
      this.teams = response.teams;
      this.loginOptions = response.loginVoiceOptions;
    }).catch((error) => {
      console.error('Error registering contact center', error);
    });
  }

  init(options: InitParams): Promise<void> {
    if('webex' in options) {
      return this.registerCC(options.webex);
    }
    return new Promise((resolve, reject) => {
      const webex = Webex.init({
        config: options.webexConfig,
        credentials: {
          access_token: options.access_token
        }
      });
  
      webex.once('ready', () => {
        this.registerCC(webex).then((response: IAgentProfile) => {
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
