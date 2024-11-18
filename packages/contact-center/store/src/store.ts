import {makeAutoObservable, observable} from 'mobx';

import sdk from './sdk';

class Store {
  sdk = sdk;
  teams = [];
  loginOptions = [];
  agent = {};

  constructor() {
    const webexConfig = {
      fedramp: false,
      logger: {
        level: 'log'
      },
    }
 
    makeAutoObservable(this, {sdk: observable.ref, teams: observable, loginOptions: observable});

    sdk.init(webexConfig, this.updateTeamsList.bind(this), this.updateLoginVoiceOptions.bind(this));
  }

  updateTeamsList(teams: any) {
    this.teams = teams;
  }

  updateLoginVoiceOptions(options: string[]) {
    this.loginOptions = options;
  }

  setAgentDetails(agentData: any) {
    this.agent = agentData;
  }
}

const store = new Store();
export default store;
