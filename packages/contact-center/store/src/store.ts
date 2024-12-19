import {makeAutoObservable, observable} from 'mobx';
import Webex from 'webex';
import {IContactCenter, Profile, Team, WithWebex, IdleCode, InitParams, IStore} from './store.types';

class Store implements IStore {
  teams: Team[] = [];
  loginOptions: string[] = [];
  cc: IContactCenter;
  idleCodes: IdleCode[] = [];
  agentId: string = '';
  selectedLoginOption: string = '';

  constructor() {
    makeAutoObservable(this, {cc: observable.ref});
  }

  registerCC(webex: WithWebex['webex']): Promise<void> {
    this.cc = webex.cc;
    return this.cc
      .register()
      .then((response: Profile) => {
        this.teams = response.teams;
        this.loginOptions = response.loginVoiceOptions;
        this.idleCodes = response.idleCodes;
        this.agentId = response.agentId;
      })
      .catch((error) => {
        console.error('Error registering contact center', error);
        return Promise.reject(error);
      });
  }

  init(options: InitParams): Promise<void> {
    if ('webex' in options) {
      // If devs decide to go with webex, they will have to listen to the ready event before calling init
      // This has to be documented
      return this.registerCC(options.webex);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Webex SDK failed to initialize'));
      }, 6000);

      const webex = Webex.init({
        config: options.webexConfig,
        credentials: {
          access_token: options.access_token,
        },
      });

      webex.once('ready', () => {
        clearTimeout(timer);
        this.registerCC(webex)
          .then(() => {
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  }
}

const store = new Store();
export default store;
