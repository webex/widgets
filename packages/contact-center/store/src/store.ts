import {makeAutoObservable, observable} from 'mobx';
import Webex, {ITask} from '@webex/contact-center';
import {
  IContactCenter,
  Profile,
  Team,
  IdleCode,
  InitParams,
  IStore,
  ILogger,
  IWrapupCode,
  ICustomState,
  AgentLoginProfile,
  LoginOptions,
  WithWebex,
} from './store.types';

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
  teamId: string = '';
  taskList: Record<string, ITask> = {};
  dialNumber: string = '';
  currentState: string = '';
  customState: ICustomState = null;
  isQueueConsultInProgress = false;
  isDeclineButtonEnabled = false;
  currentConsultQueueId: string = '';
  consultStartTimeStamp = undefined;
  lastStateChangeTimestamp?: number;
  lastIdleCodeChangeTimestamp?: number;
  showMultipleLoginAlert: boolean = false;
  callControlAudio: MediaStream | null = null;
  featureFlags: {[key: string]: boolean} = {};
  isEndConsultEnabled: boolean = false;
  isAddressBookEnabled: boolean = false;
  allowConsultToQueue: boolean = false;
  agentProfile: AgentLoginProfile = {};
  isMuted: boolean = false;

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
    this.logger.info('CC-Widgets: Contact-center registerCC(): starting registration', {
      module: 'cc-store#store.ts',
      method: 'registerCC',
    });

    return this.cc
      .register()
      .then((response: Profile) => {
        this.logger.log('CC-Widgets: Contact-center registerCC(): registration successful', {
          module: 'cc-store#store.ts',
          method: 'registerCC',
        });
        // wire up logger into feature‐flag extraction
        this.featureFlags = getFeatureFlags(response);
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        this.teams = response.teams;
        this.loginOptions = response.webRtcEnabled
          ? response.loginVoiceOptions
          : response.loginVoiceOptions.filter((option) => option !== 'BROWSER');
        this.loginOptions.sort((a, b) => Object.keys(LoginOptions).indexOf(a) - Object.keys(LoginOptions).indexOf(b));
        this.idleCodes = response.idleCodes;
        this.agentId = response.agentId;
        this.wrapupCodes = response.wrapupCodes;
        this.isAgentLoggedIn = response.isAgentLoggedIn;
        this.deviceType = response.deviceType ?? this.loginOptions[0];
        this.dialNumber = response.dn;
        this.teamId = response.currentTeamId ?? '';
        this.currentState = response.lastStateAuxCodeId;
        this.lastStateChangeTimestamp = response.lastStateChangeTimestamp;
        this.lastIdleCodeChangeTimestamp = response.lastIdleCodeChangeTimestamp;
        this.isEndConsultEnabled = response.isEndConsultEnabled;
        // TODO: Remove this once SDK performs the validation
        this.isAddressBookEnabled = Boolean(response.addressBookId);
        this.allowConsultToQueue = response.allowConsultToQueue;
        this.agentProfile.agentName = response.agentName;
      })
      .catch((error) => {
        this.logger.error(`CC-Widgets: Contact-center registerCC(): failed - ${error}`, {
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

      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
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
            this.logger.log('CC-Widgets: Store init(): store initialization complete', {
              module: 'cc-store#store.ts',
              method: 'init',
            });
            resolve();
          })
          .catch((error) => {
            this.logger.error(`CC-Widgets: Store init(): registration failed - ${error}`, {
              module: 'cc-store#store.ts',
              method: 'init',
            });
            reject(error);
          });
      });
    });
  }
}

export default Store;
