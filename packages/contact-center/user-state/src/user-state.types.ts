import {IUserState} from '@webex/cc-components';

export type IUserStateProps = Pick<IUserState, 'onStateChange' | 'onVoiceReconnect'>;

export type UseUserStateProps = Pick<
  IUserState,
  | 'idleCodes'
  | 'agentId'
  | 'cc'
  | 'currentState'
  | 'customState'
  | 'lastStateChangeTimestamp'
  | 'logger'
  | 'onStateChange'
  | 'onVoiceReconnect'
  | 'lastIdleCodeChangeTimestamp'
> & {
  /** True when an SDK-owned lifecycle, rather than the dropdown, changed the current state. */
  isCurrentStateExternallyManaged?: boolean;
  /** True until the SDK identifies the system-owned wellness idle code. */
  wellnessIdleCodeLookupPending?: boolean;
  /** True when the registered agent session is using browser voice. */
  isBrowserVoiceSession?: boolean;
  /** True while the agent remains logged in to Contact Center. */
  isAgentLoggedIn?: boolean;
};
