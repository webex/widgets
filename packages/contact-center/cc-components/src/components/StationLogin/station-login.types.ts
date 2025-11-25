import {StationLoginSuccessResponse, LogoutSuccess} from '@webex/contact-center';
import {IContactCenter, ILogger} from '@webex/cc-store';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
import {Team} from '@webex/contact-center/dist/types/types';
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
  loginSuccess?: StationLoginSuccessResponse;

  /**
   * Error received on agent login failure
   */
  loginFailure?: Error;

  /**
   * Response data received on agent login success
   */
  logoutSuccess?: LogoutSuccess;

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
   * The regex provided by the API for validating Dial Number
   */
  dialNumberRegex?: RegExp | string;

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

  /**
   * If this boolean is false, the agent will not be logged out from the station but the onCCSignOut will be called.
   * By default, it is true which means the agent will be logged out from the station and onCCSignOut will be called.
   */
  doStationLogout?: boolean;

  /**
   * The team id for agent login
   */
  teamId: string;

  /**
   * Handler to set team Id
   */
  setTeamId: (teamId: string) => void;

  /**
   * Indicates if the agent login is in profile mode.
   */
  profileMode: boolean;

  /**
   * The original login options state.
   */
  originalLoginOptions: LoginOptionsState;

  /**
   * The current login options state.
   */
  currentLoginOptions: LoginOptionsState;

  /**
   * Handler to set the current login options state.
   */
  setCurrentLoginOptions: React.Dispatch<React.SetStateAction<LoginOptionsState>>;

  /**
   * Flag to indicate if the login options have changed.
   */
  isLoginOptionsChanged: boolean;

  /**
   * Handler to save the login options.
   */
  saveLoginOptions: () => void;

  /**
   * Error message when saving login options fails.
   */
  saveError: string;
  /**
   * Called when save starts (after confirm)
   */
  onSaveStart?: () => void;
  /**
   * Called when save ends (true=success, false=error)
   */
  onSaveEnd?: (isComplete: boolean) => void;

  /**
   * Handler to set the selected device type
   */
  setSelectedDeviceType: (deviceType: string) => void;

  /**
   * The selected device type for login
   */
  selectedDeviceType: string;

  /**
   * The entered dial number value
   */
  dialNumberValue: string;

  /**
   * Handler to set the entered dial number value
   */
  setDialNumberValue: (value: string) => void;

  /**
   * Handler to set the selected team ID
   */
  setSelectedTeamId: (teamId: string) => void;

  /**
   * The selected team ID for login
   */
  selectedTeamId: string;

  /**
   * If true, hides the Desktop login mode from the dropdown options.
   * Applies in both login screen and profile mode.
   * Default: undefined (shows Desktop mode)
   */
  hideDesktopLogin?: boolean;
}

export interface LoginOptionsState {
  deviceType: string;
  dialNumber: string;
  teamId: string;
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
  | 'dialNumberRegex'
  | 'showMultipleLoginAlert'
  | 'onCCSignOut'
  | 'setTeamId'
  | 'logger'
  | 'profileMode'
  | 'originalLoginOptions'
  | 'currentLoginOptions'
  | 'setCurrentLoginOptions'
  | 'isLoginOptionsChanged'
  | 'saveLoginOptions'
  | 'saveError'
  | 'setSelectedDeviceType'
  | 'selectedDeviceType'
  | 'dialNumberValue'
  | 'setDialNumberValue'
  | 'setSelectedTeamId'
  | 'selectedTeamId'
  | 'hideDesktopLogin'
>;
