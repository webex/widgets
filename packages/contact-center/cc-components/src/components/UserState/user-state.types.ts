import {IdleCode} from '@webex/cc-store';

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
  setAgentStatus: (status: {auxCodeId: string; state: string}) => void;

  /**
   * Boolean indicating if the agent status is being set.
   */
  isSettingAgentStatus: boolean;

  /**
   * The error message to display
   */
  errorMessage: string;

  /**
   * The duration of the current user state
   */
  elapsedTime: number;

  /**
   * The idle code of the current user state
   */
  currentState: string;

  /**
   * The preferred theme
   */
  currentTheme: string;

  /**
   * Boolean indicating if the user is in RONA state.
   */
  customStatus: string;

  setCustomStatus: (customStatus: string) => void;
}
