import {makeAutoObservable, observable} from 'mobx';
import Webex from 'webex';
import {
  IContactCenter,
  Profile,
  Team,
  WithWebex,
  IdleCode,
  InitParams,
  IStore,
  ILogger,
  IWrapupCode,
} from './store.types';
import {ITask} from '@webex/plugin-cc';

class Store implements IStore {
  private static instance: Store;
  teams: Team[] = [];
  loginOptions: string[] = [];
  cc: IContactCenter;
  logger: ILogger;
  idleCodes: IdleCode[] = [];
  agentId: string = '';
  selectedLoginOption: string = '';
  currentTheme: string = 'LIGHT';
  wrapupCodes: IWrapupCode[] = [];
  currentTask: ITask = null;
  isAgentLoggedIn = false;
  deviceType: string = '';
  customStatus: 'RONA' | 'WRAPUP' | '' = '';

  constructor() {
    makeAutoObservable(this, {
      cc: observable.ref,
      currentTask: observable, // Make currentTask observable
    });
  }

  setCurrentTask(task: ITask): void {
    this.currentTask = task;
  }

  setCustomStatus(status: 'RONA' | 'WRAPUP' | ''): void {
    this.customStatus = status;
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      console.log('Creating new store instance');
      Store.instance = new Store();
    }

    console.log('Returning store instance');
    return Store.instance;
  }

  setSelectedLoginOption(option: string): void {
    this.selectedLoginOption = option;
  }

  setCurrentTheme(theme: string): void {
    this.currentTheme = theme;
  }

  setDeviceType = function(deviceType: string): void {
    this.deviceType = deviceType;
  }.bind(this);

  registerCC(webex: WithWebex['webex']): Promise<void> {
    this.cc = webex.cc;
    this.logger = this.cc.LoggerProxy;
    return this.cc
      .register()
      .then((response: Profile) => {
        this.teams = response.teams;
        this.loginOptions = response.loginVoiceOptions;
        this.idleCodes = response.idleCodes;
        this.agentId = response.agentId;
        this.wrapupCodes = response.wrapupCodes;
        this.isAgentLoggedIn = response.isAgentLoggedIn;
        this.deviceType = response.deviceType;
      })
      .catch((error) => {
        this.logger.error(`Error registering contact center: ${error}`, {
          module: 'cc-store#store.ts',
          method: 'registerCC',
        });
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

const store = Store.getInstance();
export default store;
