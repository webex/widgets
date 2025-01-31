import {AgentLogin, IContactCenter, Profile, Team, LogContext} from '@webex/plugin-cc';
import {ITask} from '@webex/plugin-cc';

type ILogger = {
    log: (message: string, context?: LogContext) => void;
    info: (message: string, context?: LogContext) => void;
    warn: (message: string, context?: LogContext) => void;
    trace: (message: string, context?: LogContext) => void;
    error: (message: string, context?: LogContext) => void;
}

interface WithWebex {
    webex: { cc: IContactCenter, logger: ILogger };
}

interface WithWebexConfig {
    webexConfig: any; // Replace 'any' with the actual type of webexConfig
    access_token: string;
}
  
type InitParams = WithWebex | WithWebexConfig;

type IdleCode = {
    name: string;
    id: string;
    isSystem: boolean;
    isDefault: boolean;
}

interface IStore {
    teams: Team[];
    loginOptions: string[];
    cc: IContactCenter;
    idleCodes: IdleCode[];
    agentId: string;
    logger: ILogger;
    selectedLoginOption: string;
    wrapupCodes: IWrapupCode[];
    currentTask: ITask;
    incomingTask: ITask;
    taskList: ITask[]
    isAgentLoggedIn: boolean;
    deviceType: string;
    init(params: InitParams): Promise<void>;
    setCurrentTask(task: any): void;
    setSelectedLoginOption(option: string): void;
    wrapupRequired: boolean;
}

interface IStoreWrapper {
    teams: Team[];
    loginOptions: string[];
    cc: IContactCenter;
    idleCodes: IdleCode[];
    agentId: string;
    logger: ILogger;
    selectedLoginOption: string;
    wrapupCodes: IWrapupCode[];
    currentTask: ITask;
    incomingTask: ITask;
    taskList: ITask[]
    isAgentLoggedIn: boolean;
    deviceType: string;
    wrapupRequired: boolean;
    init(params: InitParams): Promise<void>;
    setCurrentTask(task: any): void;
    setSelectedLoginOption(option: string): void;
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
TASK_CONSULT_ACCEPT = 'task:consultAccepted',
TASK_PAUSE = 'task:pause',
TASK_RESUME = 'task:resume',
TASK_END = 'task:end',
TASK_WRAPUP = 'task:wrapup',
} // TODO: remove this once cc sdk exports this enum

export type {
    IContactCenter,
    Profile,
    Team,
    AgentLogin,
    WithWebex,
    IdleCode,
    InitParams,
    IStore,
    ILogger,
    IWrapupCode,
    IStoreWrapper
}

export {
    TASK_EVENTS,
}
