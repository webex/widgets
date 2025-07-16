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
>;
