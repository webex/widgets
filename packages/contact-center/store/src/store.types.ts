import {
  AgentLogin,
  Profile,
  BuddyDetails,
  ContactServiceQueue,
  ITask,
  BuddyAgents,
  BuddyAgentsResponse,
  StateChange,
  Logout,
  EntryPointRecord,
  EntryPointListResponse,
  EntryPointSearchParams,
  AddressBookEntry,
  AddressBookEntriesResponse,
  AddressBookEntrySearchParams,
  ContactServiceQueuesResponse,
  ContactServiceQueueSearchParams,
  AddressBook,
} from '@webex/contact-center';
import {
  OutdialAniEntriesResponse,
  OutdialAniParams,
} from 'node_modules/@webex/contact-center/dist/types/services/config/types';
import {DestinationType} from 'node_modules/@webex/contact-center/dist/types/services/task/types';
import {
  AgentProfileUpdate,
  LogContext,
  SetStateResponse,
  StationLoginResponse,
  StationLogoutResponse,
  Team,
  UpdateDeviceTypeResponse,
} from 'node_modules/@webex/contact-center/dist/types/types';

//  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
interface IContactCenter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (event: string, callback: (data: any) => void) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off: (event: string, callback?: (data: any) => void) => void;
  updateAgentProfile(data: AgentProfileUpdate): Promise<UpdateDeviceTypeResponse>;
  stationLogin(data: AgentLogin): Promise<StationLoginResponse>;
  deregister(): Promise<void>;
  stationLogout(data: Logout): Promise<StationLogoutResponse>;
  LoggerProxy: ILogger;
  register(): Promise<Profile>;
  taskManager: {
    getAllTasks: () => Record<string, ITask>;
  };
  getBuddyAgents(data: BuddyAgents): Promise<BuddyAgentsResponse>;
  getQueues(params?: ContactServiceQueueSearchParams): Promise<ContactServiceQueuesResponse>;
  getEntryPoints(params?: EntryPointSearchParams): Promise<EntryPointListResponse>;
  addressBook: AddressBook;
  agentConfig?: {
    regexUS: RegExp | string;
    agentId: string;
    outdialANIId: string;
  };
  setAgentState(data: StateChange): Promise<SetStateResponse>;
  getOutdialAniEntries(params: OutdialAniParams): Promise<OutdialAniEntriesResponse>;
}
//  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
type IWebex = {
  cc: IContactCenter;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once: (event: string, callback: (data: any) => void) => void;
};

type ILogger = {
  log: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  trace: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
};

type WithWebex = {
  webex: {cc: IContactCenter; logger: ILogger};
};

type WithWebexConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webexConfig: any;
  access_token: string;
};

type InitParams = WithWebex | WithWebexConfig;

type IdleCode = {
  name: string;
  id: string;
  isSystem: boolean;
  isDefault: boolean;
};

interface IStore {
  featureFlags: {[key: string]: boolean};
  teams: Team[];
  loginOptions: string[];
  cc: IContactCenter;
  idleCodes: IdleCode[];
  agentId: string;
  logger: ILogger;
  wrapupCodes: IWrapupCode[];
  currentTask: ITask;
  taskList: Record<string, ITask>;
  isAgentLoggedIn: boolean;
  deviceType: string;
  teamId: string;
  dialNumber: string;
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
  currentConsultQueueId: string;
  consultStartTimeStamp?: number;
  callControlAudio: MediaStream | null;
  consultOfferReceived: boolean;
  isEndConsultEnabled: boolean;
  allowConsultToQueue: boolean;
  agentProfile: AgentLoginProfile;
  isMuted: boolean;
  isAddressBookEnabled: boolean;
  init(params: InitParams, callback: (ccSDK: IContactCenter) => void): Promise<void>;
  registerCC(webex?: WithWebex['webex']): Promise<void>;
}

interface IStoreWrapper extends IStore {
  store: IStore;
  onErrorCallback?: (widgetName: string, error: Error) => void;
  setCurrentTask(task: ITask): void;
  refreshTaskList(): void;
  getBuddyAgents(mediaType?: string): Promise<BuddyDetails[]>;
  getQueues(mediaType?: string, params?: ContactServiceQueueSearchParams): Promise<ContactServiceQueuesResponse>;
  getEntryPoints(params?: EntryPointSearchParams): Promise<EntryPointListResponse>;
  getAddressBookEntries(params?: AddressBookEntrySearchParams): Promise<AddressBookEntriesResponse>;
  setDeviceType(option: string): void;
  setDialNumber(input: string): void;
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
  setAgentProfile(profile: Profile): void;
  setTeamId(id: string): void;
  setIsMuted(value: boolean): void;
  setOnError(callback: (widgetName: string, error: Error) => void): void;
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
  AGENT_OFFER_CONTACT = 'AgentOfferContact',
  AGENT_CONSULT_CREATED = 'AgentConsultCreated',
  TASK_RECORDING_PAUSED = 'task:recordingPaused',
  TASK_RECORDING_RESUMED = 'task:recordingResumed',
  TASK_OFFER_CONSULT = 'task:offerConsult',
} // TODO: remove this once cc sdk exports this enum

// Events that are received on the contact center SDK
// TODO: Export & Import these constants from SDK
enum CC_EVENTS {
  AGENT_DN_REGISTERED = 'agent:dnRegistered',
  AGENT_LOGOUT_SUCCESS = 'agent:logoutSuccess',
  AGENT_STATION_LOGIN_SUCCESS = 'agent:stationLoginSuccess',
  AGENT_MULTI_LOGIN = 'agent:multiLogin',
  AGENT_STATE_CHANGE = 'agent:stateChange',
  AGENT_RELOGIN_SUCCESS = 'agent:reloginSuccess',
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

type AgentLoginProfile = {
  agentName?: string;
  orgId?: string;
  profileType?: string;
  deviceType?: string;
  roles?: Array<string>;
  mmProfile?: {
    chat: number;
    email: number;
    social: number;
    telephony: number;
  };
};

// Generic pagination params for list-fetching APIs
type PaginatedListParams = {
  page: number;
  pageSize: number;
  search?: string;
};

// Generic fetch/transform helpers for paginated APIs
type FetchPaginatedList<T> = (
  params: PaginatedListParams
) => Promise<{data: T[]; meta?: {page?: number; totalPages?: number}}>;

// Generic transform function for paginated APIs
type TransformPaginatedData<T, U> = (item: T, page: number, index: number) => U;

// Utility consts
const DIALNUMBER: string = 'AGENT_DN';
const EXTENSION: string = 'EXTENSION';
const DESKTOP: string = 'BROWSER';

// Common string constants used across the store wrapper
const MEDIA_TYPE_TELEPHONY_LOWER = 'telephony';
const MEDIA_TYPE_TELEPHONY_UPPER = 'TELEPHONY';
const DEVICE_TYPE_BROWSER = 'BROWSER';
const AGENT_STATE_AVAILABLE = 'Available';

const LoginOptions: {[key: string]: string} = {
  [DIALNUMBER]: 'Dial Number',
  [EXTENSION]: 'Extension',
  [DESKTOP]: 'Desktop',
};

const ERROR_TRIGGERING_IDLE_CODES = {
  INVALID_NUMBER: 'Invalid_Number',
  UNAVAILABLE: 'Agent_Unavailable',
  DECLINED: 'Agent_Declined',
  BUSY: 'Agent_Busy',
  CHANNEL_FAILURE: 'Channel_Failure',
  RONA: 'RONA',
};

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
  AgentLoginProfile,
  EntryPointRecord,
  EntryPointListResponse,
  EntryPointSearchParams,
  AddressBookEntry,
  AddressBookEntriesResponse,
  AddressBookEntrySearchParams,
  ContactServiceQueuesResponse,
  ContactServiceQueueSearchParams,
  IWebex,
  PaginatedListParams,
  FetchPaginatedList,
  TransformPaginatedData,
};

export {
  CC_EVENTS,
  TASK_EVENTS,
  ENGAGED_LABEL,
  ENGAGED_USERNAME,
  DIALNUMBER,
  EXTENSION,
  DESKTOP,
  MEDIA_TYPE_TELEPHONY_LOWER,
  MEDIA_TYPE_TELEPHONY_UPPER,
  DEVICE_TYPE_BROWSER,
  AGENT_STATE_AVAILABLE,
  LoginOptions,
  ERROR_TRIGGERING_IDLE_CODES,
};
