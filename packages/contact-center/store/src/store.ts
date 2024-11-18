import {makeAutoObservable, observable} from 'mobx';
import Webex from 'webex';
import {IAgentProfile, Team} from '@webex/plugin-cc';

class Store {
  teams: Team[] = [];
  loginOptions = [];
  webex: Webex = {};
  token = '';  // TODO: Please add your access token here for testing. In next PR, fetching token and passing it will be taken care

  constructor() {
    const webexConfig = {
      fedramp: false,
      logger: {
        level: 'log'  // TODO: We will add more logging levels later and set the righ levels
      },
    }
 
    makeAutoObservable(this, {teams: observable, loginOptions: observable});

    this.init(webexConfig).catch((error) => {
      console.error('CC SDK initialization failed:', error);
    });
  }

  async init(webexConfig: any) { 
    this.webex = Webex.init({
      config: webexConfig,
      credentials: {
        access_token: this.token
      }
    });

    this.webex.once('ready', () => {
      this.webex.cc.register(true).then((response: IAgentProfile) => {
        this.teams = response.teams;
        this.loginOptions = response.loginVoiceOptions;
      })
      .catch((error) => {
        console.log('Websocket subscription failed', error);
      })
    })
  }
}

const store = new Store();
export default store;
