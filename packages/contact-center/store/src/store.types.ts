import {AgentLogin, IContactCenter, IAgentProfile, Team} from '@webex/plugin-cc';

interface WithWebex {
    webex: { cc: IContactCenter };
}

interface WithWebexConfigAndToken {
    webexConfig: any; // Replace 'any' with the actual type of webexConfig
    access_token: string;
}
  
type InitParams = WithWebex | WithWebexConfigAndToken;

interface IStore {
    teams: Team[];
    loginOptions: string[];
    cc: IContactCenter;
  
    registerCC(webex: WithWebex['webex']): Promise<IAgentProfile>;
    init(params: InitParams): Promise<void>;
}

export type {
    IContactCenter,
    IAgentProfile,
    Team,
    AgentLogin,
    WithWebex,
    InitParams,
    IStore
}