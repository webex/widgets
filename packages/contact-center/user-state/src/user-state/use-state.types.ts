/**
 * Interface representing the state of a user.
 */
export interface IUserState {
  /**
   * The name of the user.
   */
  name: string;

    /**
   * Handler to refelct the agent state changes
   */
    handleAgentStatus: (event) => void;

    /**
     * Handler to set agent state
     */
    setAgentStatus: () => void

    loginState: string
}
