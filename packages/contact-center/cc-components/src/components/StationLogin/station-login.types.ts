import {IContactCenter, StationLoginSuccess, StationLogoutSuccess, Team} from '@webex/plugin-cc';
import {ILogger} from '@webex/cc-store';
/**
 * Interface representing the properties for the Station Login component.
 */
export interface IStationLoginProps {
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
   *
   * Array of keys for login options (i.e. AGENT_DN)
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
   * Flag to indicate if the agent is logged in
   */
  isAgentLoggedIn: boolean;

  /**
   * The selected device type for agent login
   */
  deviceType: string;

  /**
   * The saved dial number for agent login
   */
  dialNumber: string;

  /**
   * Callback function to be invoked once the agent login is successful
   */
  onLogin?: () => void;

  /**
   * Callback function to be invoked once the agent login is successful
   */
  onLogout?: () => void;

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

  /**
   * The logger instance from SDK
   */
  logger: ILogger;

  /**
   * Handler to relogin the agent when the agent is already logged in
   */
  handleContinue: () => void;

  /**
   * Flag to indicate if the alert should be shown
   */
  showMultipleLoginAlert: boolean;

  /**
   * Handler for Contact Center logout
   */
  onCCSignOut?: () => void;
}

export type StationLoginComponentProps = Pick<
  IStationLoginProps,
  | 'teams'
  | 'loginOptions'
  | 'login'
  | 'logout'
  | 'loginSuccess'
  | 'loginFailure'
  | 'logoutSuccess'
  | 'setDeviceType'
  | 'setDialNumber'
  | 'setTeam'
  | 'isAgentLoggedIn'
  | 'handleContinue'
  | 'deviceType'
  | 'dialNumber'
  | 'showMultipleLoginAlert'
  | 'onCCSignOut'
>;
