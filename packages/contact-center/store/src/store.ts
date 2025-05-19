import {makeAutoObservable, observable} from 'mobx';
import Webex from 'webex/contact-center';
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
  ICustomState,
  TaskMetaData,
  AgentLoginProfile,
} from './store.types';
import {ITask} from '@webex/plugin-cc';

import {getFeatureFlags} from './util';

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
  currentTask: ITask = null;
  isAgentLoggedIn = false;
  deviceType: string = '';
  taskList: Record<string, ITask> = {};
  dialNumber: string = '';
  currentState: string = '';
  customState: ICustomState = null;
  consultCompleted = false;
  consultInitiated = false;
  consultAccepted = false;
  isQueueConsultInProgress = false;
  currentConsultQueueId: string = '';
  consultStartTimeStamp = undefined;
  lastStateChangeTimestamp?: number;
  lastIdleCodeChangeTimestamp?: number;
  showMultipleLoginAlert: boolean = false;
  callControlAudio: MediaStream | null = null;
  consultOfferReceived: boolean = false;
  featureFlags: {[key: string]: boolean} = {};
  isEndConsultEnabled: boolean = false;
  allowConsultToQueue: boolean = false;
  agentProfile: AgentLoginProfile = {};

  taskMetaData: Record<string, TaskMetaData> = {};

  constructor() {
    makeAutoObservable(this, {
      cc: observable.ref,
    });
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      console.log('Creating new store instance');
      Store.instance = new Store();
    }

    console.log('Returning store instance');
    return Store.instance;
  }
  registerCC(webex?: WithWebex['webex']): Promise<void> {
    if (webex) {
      this.cc = webex.cc;
    }

    if (typeof webex === 'undefined' && typeof this.cc === 'undefined') {
      throw new Error('Webex SDK not initialized');
    }

    this.logger = this.cc.LoggerProxy;
    return this.cc
      .register()
      .then((response: Profile) => {
        this.featureFlags = getFeatureFlags(response);
        this.teams = response.teams;
        this.loginOptions = response.webRtcEnabled
          ? response.loginVoiceOptions
          : response.loginVoiceOptions.filter((option) => option !== 'BROWSER');
        this.idleCodes = response.idleCodes;
        this.agentId = response.agentId;
        this.wrapupCodes = response.wrapupCodes;
        this.isAgentLoggedIn = response.isAgentLoggedIn;
        this.deviceType = response.deviceType ?? 'AGENT_DN';
        this.dialNumber = response.defaultDn;
        this.currentState = response.lastStateAuxCodeId;
        this.lastStateChangeTimestamp = response.lastStateChangeTimestamp;
        this.lastIdleCodeChangeTimestamp = response.lastIdleCodeChangeTimestamp;
        this.isEndConsultEnabled = response.isEndConsultEnabled;
        this.allowConsultToQueue = response.allowConsultToQueue;
        this.agentProfile.agentName = response.agentName;
      })
      .catch((error) => {
        this.logger.error(`Error registering contact center: ${error}`, {
          module: 'cc-store#store.ts',
          method: 'registerCC',
        });
        return Promise.reject(error);
      });
  }

  init(options: InitParams, setupEventListeners): Promise<void> {
    if ('webex' in options) {
      // If devs decide to go with webex, they will have to listen to the ready event before calling init
      // This has to be documented
      setupEventListeners(options.webex.cc);
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
        setupEventListeners(webex.cc);
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
