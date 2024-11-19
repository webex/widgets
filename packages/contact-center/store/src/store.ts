import {makeAutoObservable, observable} from 'mobx';
import Webex from 'webex';
import {AgentLogin, IAgentProfile, Team} from '@webex/plugin-cc';

class Store {
  teams: Team[] = [];
  loginOptions: string[] = [];
  loginReqParam: AgentLogin = {teamId: '', loginOption: '', dialNumber: ''};
  webex: Webex = {};
  token = '';

  constructor() {
    const webexConfig = {
      fedramp: false,
      logger: {
        level: 'log'  // TODO: We will add more logging levels later and set the righ levels
      },
    }
 
    makeAutoObservable(this);

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
        console.error('Websocket subscription failed', error);
      })
    })
  }

  setDeviceType = (deviceType: string) => {
    this.loginReqParam.loginOption = deviceType;
  }

  setDialNumber = (dn: string) => {
    this.loginReqParam.dialNumber = dn;
  }

  setTeam = (team: string) => {
    this.loginReqParam.teamId = team;
  }
}

const store = new Store();
export default store;
