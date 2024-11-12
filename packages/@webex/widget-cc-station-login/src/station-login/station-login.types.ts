/**
 * Interface representing the properties for the Station Login component.
 */
export interface IStationLoginPresentationalProps {
  /**
   * The name of the station.
   */
  name: string;

  // /**
  //  * The current login state of the station.
  //  */
  // loginState: any;

  // /**
  //  * Function to set the login state of the station.
  //  */
  // setLoginState: any;

  /**
   * The Customer Care SDK instance.
   */
  sdk: any;

  /**
   * Indicates whether the station is available.
   */
  isAvailable: boolean;

  /**
   * Handler to select login type
   */
  selectLoginOption: (event) => void;

  /**
   * Handler to initiate the agent login
   */
  login: () => void
}
