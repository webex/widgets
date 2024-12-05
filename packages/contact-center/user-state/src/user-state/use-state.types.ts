import { IdleCode } from '@webex/cc-store';

/**
 * Interface representing the state of a user.
 */
export interface IUserState {
  /**
   * The list of idle codes.
   */
  idleCodes: IdleCode[];

  setAgentStatus: (status: { auxCodeId: string; state: string }) => void;

  isSettingAgentStatus: boolean;

  errorMessage: string;

  elapsedTime: number;
}
