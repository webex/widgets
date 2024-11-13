/**
 * Interface representing the state of a user.
 */
export interface IUserState {
  /**
   * The name of the user.
   */
  name: string;

  /**
   * The current login state of the user.
   */
  loginState: any;

  /**
   * Function to set the login state of the user.
   */
  setLoginState: any;

  /**
   * The SDK instance for the contact center.
   */
  ccSdk: any;

  /**
   * Indicates whether the user is available.
   */
  isAvailable: any;
}
