/**
 * State Control V2 shapes used only by the first-party Wellness Break integration.
 * They intentionally do not flow through any package barrel or host-facing prop.
 * @internal
 */
export interface AgentChannelStateDetail {
  agentState: string;
  pendingIdle: boolean;
  auxCodeId?: string | null;
  stateChangeTimestamp: number;
  stateChangeReason: string;
}

/** @internal */
export interface SetAgentChannelStateParams {
  channelTypes: string[];
  state: 'Available' | 'Idle';
  auxCodeId?: string;
  reason?: string;
  agentId?: string;
}

/** @internal */
export type WellnessStateModel = 'legacy' | 'agent-state-control';

/** @internal */
export type WellnessCapturedChannelState = Pick<AgentChannelStateDetail, 'agentState' | 'auxCodeId'>;

/** @internal */
export interface WellnessBreakRecoveryMarkerV1 {
  version: 1;
  agentSessionId: string;
  stateModel: WellnessStateModel;
  channelTypes?: string[];
  preBreakChannelStates?: Record<string, WellnessCapturedChannelState>;
}

/** @internal */
export interface WellnessStoreBridge {
  isAgentStateControlEnabled: boolean;
  agentChannelTypes: string[];
  agentChannelStateDetails: Record<string, AgentChannelStateDetail>;
  agentChannelReloginSequence: number;
  cc: {
    setAgentChannelState(params: SetAgentChannelStateParams): Promise<unknown>;
  };
}
