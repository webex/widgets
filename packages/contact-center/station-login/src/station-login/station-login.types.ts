import {IStationLoginProps} from '@webex/cc-components';

export type UseStationLoginProps = Pick<
  IStationLoginProps,
  'cc' | 'onLogin' | 'onLogout' | 'logger' | 'deviceType' | 'dialNumber' | 'onSaveStart' | 'onSaveEnd' | 'teamId'
>;

export type StationLoginProps = Pick<
  IStationLoginProps,
  'onLogin' | 'onLogout' | 'onCCSignOut' | 'profileMode' | 'onSaveStart' | 'onSaveEnd'
>;
