import {IStationLoginProps} from '@webex/cc-components';

export type UseStationLoginProps = Pick<IStationLoginProps, 'cc' | 'onLogin' | 'onLogout' | 'logger' | 'deviceType'>;

export type StationLoginProps = Pick<IStationLoginProps, 'onLogin' | 'onLogout'>;
