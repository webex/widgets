import {IdleCode, ICustomState, ILogger, IContactCenter} from '@webex/cc-store';

/**
 * Interface representing the state of a user.
 */
export interface IUserState {
  /**
   * The list of idle codes.
   */
  idleCodes: IdleCode[];

  /**
   * Function to set the agent
   * status.
   * @param status The status to set.
   * @param status.auxCodeId The aux code id.
   * @param status.state The state to set.
   * @returns void
   */
  setAgentStatus: (auxCodeId: string) => void;

  /**
   * Boolean indicating if the agent status is being set.
   */
  isSettingAgentStatus: boolean;

  /**
   * The duration of the current user state
   */
  elapsedTime: number;

  /**
   * The duration since the last idle code change
   */
  lastIdleStateChangeElapsedTime: number;

  /**
   * The idle code of the current user state
   */
  currentState: string;

  /**
   * The custom state of the current user state
   */
  customState: ICustomState;

  /**
   * The preferred theme
   */
  currentTheme: string;

  /**
   * Logger instance
   */
  logger: ILogger;

  /**
   * Callback function to be called when the state changes.
   * @param state The new state.
   */
  onStateChange?: (state: string) => void;

  /**
   * The agent ID.
   */
  agentId: string;

  /**
   * CC SDK Instance.
   */
  cc: IContactCenter;

  /**
   * The timestamp of the last state change.
   */
  lastStateChangeTimestamp?: number;

  /**
   * The timestamp of the last idle code change.
   */
  lastIdleCodeChangeTimestamp?: number;
}

export type UserStateComponentsProps = Pick<
  IUserState,
  | 'idleCodes'
  | 'setAgentStatus'
  | 'isSettingAgentStatus'
  | 'elapsedTime'
  | 'lastIdleStateChangeElapsedTime'
  | 'currentState'
  | 'customState'
  | 'logger'
>;

export enum AgentUserState {
  Available = 'Available',
  RONA = 'RONA',
  Engaged = 'ENGAGED',
}
