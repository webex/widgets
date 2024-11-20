/**
 * Interface representing the properties for the Station Login component.
 */
export interface IStationLoginProps {
  /**
   * The name of the station.
   */
  name: string;

  /**
   * The current login state of the station.
   */
  loginState: any;

  /**
   * Function to set the login state of the station.
   */
  setLoginState: any;

  /**
   * The Customer Care SDK instance.
   */
  ccSdk: any;

  /**
   * Indicates whether the station is available.
   */
  isAvailable: any;
}
