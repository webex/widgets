import {IUserState} from '@webex/cc-components';

export type IUserStateProps = Pick<IUserState, 'onStateChange'>;

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
  | 'lastIdleCodeChangeTimestamp'
> & {
  /** True when an SDK-owned lifecycle, rather than the dropdown, changed the current state. */
  isCurrentStateExternallyManaged?: boolean;
};
