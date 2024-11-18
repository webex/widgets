import Webex from 'webex';
import {StationLoginSuccess, Team} from '@webex/plugin-cc';
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
  webex: Webex;

  /**
   * Array of the team IDs that agent belongs to
   */
  teams: Team[];

   /**
   * Station login options available for the agent
   */
  loginOptions: string[];


  /**
   * Handler to select login type
   */
  selectLoginOption: (event) => void;

  /**
   * Handler to initiate the agent login
   */
  login: () => void

  /**
   * Handler for agent logout
   */
  logout: () => void

  /**
   * Response data received on agent login success
   */
  loginSuccess: StationLoginSuccess;

  /**
   * Eroor received on agent login failure
   */
  loginFailure: Error;
}

export type StationLoginPresentationalProps = Pick<IStationLoginProps, 'name' | 'selectLoginOption' | 'login' | 'logout'>;

export type UseStationLoginProps = Pick<IStationLoginProps, 'webex' | 'teams' | 'loginOptions'>;

