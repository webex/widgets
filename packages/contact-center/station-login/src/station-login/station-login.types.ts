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
  login: () => void;

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
  onLogin: () => void;

  /**
   * Callback function to be invoked once the agent login is successful
   */
  onLogout: () => void;

  /**
   * Handler to set device type
   */
  setDeviceType: (deviceType: string) => void;

  /**
   * Handler to set the entered dial number
   */
  setDialNumber: (dn: string) => void;

  /**
   * Handler to set the selected agent team
   */
  setTeam: (team: string) => void;
}

export type StationLoginPresentationalProps = Pick<IStationLoginProps, 'name' | 'teams' | 'loginOptions' | 'login' | 'logout' | 'loginSuccess' | 'loginFailure' | 'logoutSuccess' | 'setDeviceType' | 'setDialNumber' | 'setTeam'>;

export type UseStationLoginProps = Pick<IStationLoginProps, 'cc' | 'onLogin' | 'onLogout'>;

export type StationLoginProps = Pick<IStationLoginProps, 'onLogin' | 'onLogout'>;