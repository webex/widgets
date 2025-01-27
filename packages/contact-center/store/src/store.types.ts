import {AgentLogin, IContactCenter, Profile, Team, LogContext} from '@webex/plugin-cc';

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
    registerCC(webex: WithWebex['webex']): Promise<Profile>;
    init(params: InitParams): Promise<void>;
}

interface IWrapupCode {
    id: string;
    name: string;
  }
  

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
    IWrapupCode
}
