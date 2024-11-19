/**
 * Interface representing the state of a user.
 */
export interface IUserState {
  /**
   * The name of the user.
   */
  name: string;

  /**
   * Handler for agent state changes
   */
  handleAgentStatus: (event) => void;

  /**
   * Setter for agent state
   */
  setAgentStatus: () => void
}
