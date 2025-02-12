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
  currentTheme: string = 'LIGHT';
  wrapupCodes: IWrapupCode[] = [];
  incomingTask: ITask = null;
  currentTask: ITask = null;
  isAgentLoggedIn = false;
  deviceType: string = '';
  taskList: ITask[] = [];
  wrapupRequired: boolean = false;
  currentState: string = '';
  lastStateChangeTimestamp: Date = new Date();
  showMultipleLoginAlert: boolean = false;

  constructor() {
    makeAutoObservable(this, {
      cc: observable.ref,
      currentTask: observable, // Make currentTask observable
      incomingTask: observable,
      taskList: observable,
      wrapupRequired: observable,
      currentState: observable,
    });
  }

  setWrapupRequired(value: boolean): void {
    this.wrapupRequired = value;
  }

  setCurrentTask(task: ITask): void {
    this.currentTask = task;
  }

  setIncomingTask(task: ITask): void {
    this.incomingTask = task;
  }

  setTaskList(taskList: ITask[]): void {
    this.taskList = taskList;
  }

  setDeviceType(option: string): void {
    this.deviceType = option;
  }

  setCurrentState(state: string): void {
    this.currentState = state;
  }

  setLastStateChangeTimestamp(timestamp: Date): void {
    this.lastStateChangeTimestamp = timestamp;
  }

  setShowMultipleLoginAlert(value: boolean): void {
    this.showMultipleLoginAlert = value;
  }

  setIsAgentLoggedIn(value: boolean): void {
    this.isAgentLoggedIn = value;
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      console.log('Creating new store instance');
      Store.instance = new Store();
    }

    console.log('Returning store instance');
    return Store.instance;
  }

  setCurrentTheme(theme: string): void {
    this.currentTheme = theme;
  }

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
        this.currentState = response.lastStateAuxCodeId;
        this.lastStateChangeTimestamp = response.lastStateChangeTimestamp;
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

export default Store;
