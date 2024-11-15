/**
 * Interface representing the properties for the Station Login component.
 */
export interface IStationLoginPresentationalProps {
  /**
   * The name of the station.
   */
  name: string;

  /**
   * The Customer Care SDK instance.
   */
  sdk: any;

  /**
   * Array of the team IDs that agent belongs to
   */
  teams: [];

   /**
   * Station login options available for the agent
   */
  loginOptions: [];


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
}