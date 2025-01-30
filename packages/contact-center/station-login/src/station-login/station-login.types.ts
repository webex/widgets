import {IContactCenter, StationLoginSuccess, StationLogoutSuccess, Team} from '@webex/plugin-cc';
import {ILogger} from '@webex/cc-store';
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
   * Flag to indicate if the agent is logged in
   */
  isAgentLoggedIn: boolean;

  /**
   * The selected device type for agent login
   */
  deviceType: string;

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
   * Handler to relogin the agent
   */
  relogin: () => void;

  /**
   * Handler to relogin the agent when the agent is already logged in
   */
  handleContinue: () => void;

  /**
   * Reference to the modal element
   */
  modalRef: React.RefObject<HTMLDialogElement>;

  /**
   * Flag to indicate if the alert should be shown
   */
  showMultipleLoginAlert: boolean;
}

export type StationLoginPresentationalProps = Pick<
  IStationLoginProps,
  | 'name'
  | 'teams'
  | 'loginOptions'
  | 'login'
  | 'logout'
  | 'relogin'
  | 'loginSuccess'
  | 'loginFailure'
  | 'logoutSuccess'
  | 'setDeviceType'
  | 'setDialNumber'
  | 'setTeam'
  | 'isAgentLoggedIn'
  | 'handleContinue'
  | 'deviceType'
  | 'modalRef'
> & {
  showMultipleLoginAlert: boolean;
};

export type UseStationLoginProps = Pick<
  IStationLoginProps,
  | 'cc'
  | 'onLogin'
  | 'onLogout'
  | 'logger'
  | 'isAgentLoggedIn'
  | 'handleContinue'
  | 'modalRef'
  | 'showMultipleLoginAlert'
>;

export type StationLoginProps = Pick<IStationLoginProps, 'onLogin' | 'onLogout'>;
