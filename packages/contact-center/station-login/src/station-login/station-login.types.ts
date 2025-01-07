import {AgentLogin, IContactCenter, StationLoginSuccess, StationLogoutSuccess, Team} from '@webex/plugin-cc';
/**
 * Interface representing the properties for the Station Login component.
 */
export interface IStationLoginProps {
  /**
   * The name of the station.
   */
  name: string;

  /**
   * Webex instance.
   */
  cc: IContactCenter;

  /**
   * Array of the team IDs that agent belongs to
   */
  teams: Team[];

  /**
   * Station login options available for the agent
   */
  loginOptions: string[];

  /**
   * Handler to initiate the agent login
   */
  login: (teamId: string, loginOption: string, dialNumber: string) => void;

  /**
   * Handler for agent logout
   */
  logout: () => void;

  /**
   * Response data received on agent login success
   */
  loginSuccess?: StationLoginSuccess;

  /**
   * Error received on agent login failure
   */
  loginFailure?: Error;

  /**
   * Response data received on agent login success
   */
  logoutSuccess?: StationLogoutSuccess;

  /**
   * Callback function to be invoked once the agent login is successful
   */
  onLogin?: () => void;

  /**
   * Callback function to be invoked once the agent login is successful
   */
  onLogout?: () => void;
}

export type StationLoginPresentationalProps = Pick<
  IStationLoginProps,
  'name' | 'teams' | 'loginOptions' | 'login' | 'logout' | 'loginSuccess' | 'loginFailure' | 'logoutSuccess'
>;

export type UseStationLoginProps = Pick<IStationLoginProps, 'cc' | 'onLogin' | 'onLogout'>;

export type StationLoginProps = Pick<IStationLoginProps, 'onLogin' | 'onLogout'>;
