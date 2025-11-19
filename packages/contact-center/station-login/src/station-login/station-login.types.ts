import {IStationLoginProps} from '@webex/cc-components';

export type UseStationLoginProps = Pick<
  IStationLoginProps,
  | 'cc'
  | 'onLogin'
  | 'onLogout'
  | 'logger'
  | 'deviceType'
  | 'dialNumber'
  | 'onSaveStart'
  | 'onSaveEnd'
  | 'teamId'
  | 'isAgentLoggedIn'
  | 'onCCSignOut'
  | 'doStationLogout'
>;

export type StationLoginProps = Pick<IStationLoginProps, 'profileMode'> &
  Partial<
    Pick<
      IStationLoginProps,
      | 'onLogin'
      | 'onLogout'
      | 'onCCSignOut'
      | 'onSaveStart'
      | 'onSaveEnd'
      | 'teamId'
      | 'doStationLogout'
      | 'hideDesktopLogin'
    >
  >;
