import {AgentLogin, IContactCenter, Profile, Team} from '@webex/plugin-cc';

interface WithWebex {
    webex: { cc: IContactCenter };
}

interface WithWebexConfig {
    webexConfig: any; // Replace 'any' with the actual type of webexConfig
    access_token: string;
}
  
type InitParams = WithWebex | WithWebexConfig;

interface IStore {
    teams: Team[];
    loginOptions: string[];
    cc: IContactCenter;
  
    registerCC(webex: WithWebex['webex']): Promise<Profile>;
    init(params: InitParams): Promise<void>;
}

export type {
    IContactCenter,
    Profile,
    Team,
    AgentLogin,
    WithWebex,
    InitParams,
    IStore
}