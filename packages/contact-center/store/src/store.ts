import {makeAutoObservable, observable} from 'mobx';
import Webex from 'webex';
import {AgentLogin, IContactCenter, IAgentProfile, Team} from '@webex/plugin-cc';

class Store {
  teams: Team[] = [];
  loginOptions: string[] = [];
  loginReqParam: AgentLogin = {teamId: '', loginOption: '', dialNumber: ''};
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
