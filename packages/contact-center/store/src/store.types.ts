import {
  AgentLogin,
  IContactCenter,
  Profile,
  Team,
  LogContext,
  BuddyDetails,
  DestinationType,
  ContactServiceQueue,
} from '@webex/plugin-cc';
import {ITask} from '@webex/plugin-cc';

type ILogger = {
  log: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  trace: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
};

interface WithWebex {
  webex: {cc: IContactCenter; logger: ILogger};
}

interface WithWebexConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webexConfig: any; // TODO: Replace 'any' with the actual type of webexConfig
  access_token: string;
}

type InitParams = WithWebex | WithWebexConfig;

type IdleCode = {
  name: string;
  id: string;
  isSystem: boolean;
  isDefault: boolean;
};

interface IStore {
  teams: Team[];
  loginOptions: string[];
  cc: IContactCenter;
  idleCodes: IdleCode[];
  agentId: string;
  logger: ILogger;
  wrapupCodes: IWrapupCode[];
  currentTask: ITask;
  incomingTask: ITask;
  taskList: ITask[];
  isAgentLoggedIn: boolean;
  deviceType: string;
  wrapupRequired: boolean;
  currentState: string;
  lastStateChangeTimestamp?: number;
  lastIdleCodeChangeTimestamp?: number;
  showMultipleLoginAlert: boolean;
  currentTheme: string;
  customState: ICustomState;
  consultCompleted: boolean;
  consultInitiated: boolean;
  consultAccepted: boolean;
  isQueueConsultInProgress: boolean;
  currentConsultQueueId: string | null;
  consultStartTimeStamp?: number;
  callControlAudio: MediaStream | null;
  consultOfferReceived: boolean;
  init(params: InitParams, callback: (ccSDK: IContactCenter) => void): Promise<void>;
  registerCC(webex?: WithWebex['webex']): Promise<void>;
}

interface IStoreWrapper extends IStore {
  store: IStore;
  setCurrentTask(task: ITask): void;
  setWrapupRequired(value: boolean): void;
  setTaskList(taskList: ITask[]): void;
  setIncomingTask(task: ITask): void;
  setDeviceType(option: string): void;
  setCurrentState(state: string): void;
  setLastStateChangeTimestamp(timestamp: number): void;
  setLastIdleCodeChangeTimestamp(timestamp: number): void;
  setShowMultipleLoginAlert(value: boolean): void;
  setCurrentTheme(theme: string): void;
  setIsAgentLoggedIn(value: boolean): void;
  setWrapupCodes(wrapupCodes: IWrapupCode[]): void;
  setState(state: IdleCode | ICustomState): void;
  setConsultCompleted(value: boolean): void;
  setConsultInitiated(value: boolean): void;
  setConsultAccepted(value: boolean): void;
  setConsultStartTimeStamp(timestamp: number): void;
}

interface IWrapupCode {
  id: string;
  name: string;
}

enum TASK_EVENTS {
  TASK_INCOMING = 'task:incoming',
  TASK_ASSIGNED = 'task:assigned',
  TASK_MEDIA = 'task:media',
  TASK_HOLD = 'task:hold',
  TASK_UNHOLD = 'task:unhold',
  TASK_CONSULT = 'task:consult',
  TASK_CONSULT_END = 'task:consultEnd',
  TASK_CONSULT_ACCEPTED = 'task:consultAccepted',
  TASK_PAUSE = 'task:pause',
  TASK_RESUME = 'task:resume',
  TASK_END = 'task:end',
  TASK_WRAPUP = 'task:wrapup',
  TASK_REJECT = 'task:rejected',
  TASK_HYDRATE = 'task:hydrate',
  TASK_CONSULTING = 'task:consulting',
  TASK_CONSULT_QUEUE_CANCELLED = 'task:consultQueueCancelled',
  AGENT_CONTACT_ASSIGNED = 'AgentContactAssigned',
  CONTACT_RECORDING_PAUSED = 'ContactRecordingPaused',
  CONTACT_RECORDING_RESUMED = 'ContactRecordingResumed',
  AGENT_WRAPPEDUP = 'AgentWrappedUp',
  AGENT_CONSULT_CREATED = 'AgentConsultCreated',
} // TODO: remove this once cc sdk exports this enum

// Events that are received on the contact center SDK
// TODO: Export & Import these constants from SDK
enum CC_EVENTS {
  AGENT_DN_REGISTERED = 'AgentDNRegistered',
  AGENT_LOGOUT_SUCCESS = 'AgentLogoutSuccess',
  AGENT_STATION_LOGIN_SUCCESS = 'AgentStationLoginSuccess',
  AGENT_MULTI_LOGIN = 'agent:multiLogin',
  AGENT_STATE_CHANGE = 'agent:stateChange',
  AGENT_RELOGIN_SUCCESS = 'AgentReloginSuccess',
  AGENT_OFFER_CONSULT = 'AgentOfferConsult',
}

interface ICustomStateSet {
  name: string;
  developerName: string;
}
interface ICustomStateReset {
  reset: boolean;
}

type ICustomState = ICustomStateSet | ICustomStateReset;

const ENGAGED_LABEL = 'ENGAGED';
const ENGAGED_USERNAME = 'Engaged';

export type {
  IContactCenter,
  ITask,
  Profile,
  Team,
  AgentLogin,
  WithWebex,
  IdleCode,
  InitParams,
  IStore,
  ILogger,
  IWrapupCode,
  IStoreWrapper,
  ICustomState,
  DestinationType,
  BuddyDetails,
  ContactServiceQueue,
};

export {CC_EVENTS, TASK_EVENTS, ENGAGED_LABEL, ENGAGED_USERNAME};
