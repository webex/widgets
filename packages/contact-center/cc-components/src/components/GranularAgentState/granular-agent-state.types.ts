import {IdleCode, ILogger, ChannelType, AgentChannelTypeStates} from '@webex/cc-store';

/**
 * Channels an agent can toggle in a granular (V2) agent state session.
 */
export type SelectableChannelType = Extract<ChannelType, 'telephony' | 'chat' | 'email' | 'social'>;

export type GranularAgentStateValue = 'Available' | 'Idle';

/**
 * View model for a single channel row, derived from the SDK's AgentChannelTypeStates.
 */
export interface ChannelStateInfo {
  channelType: SelectableChannelType;
  /** Display name of the channel, e.g. "Voice". */
  label: string;
  /** Raw SDK agent state for the channel, e.g. "Available", "Idle", "RONA". */
  agentState: string;
  /** User-facing state text: idle code name when Idle, "Pending <code>" when pending idle. */
  displayState: string;
  auxCodeId?: string;
  pendingIdle: boolean;
  /** Seconds elapsed since the channel's last state change. */
  elapsedTime: number;
  /** True when the channel is counted as available in the "Manage channel availability" view. */
  isAvailable: boolean;
}

/**
 * Payload passed to `onStateChange` after a granular state change request succeeds.
 */
export interface GranularStateChangePayload {
  state: GranularAgentStateValue;
  auxCodeId: string;
  channelTypes: SelectableChannelType[];
  idleCode?: IdleCode;
}

/**
 * Interface representing the granular (V2) agent state widget.
 */
export interface IGranularAgentState {
  /**
   * Per-channel states as reported by the SDK (`cc.getChannelStates()`).
   */
  channelStatesMap: Partial<Record<ChannelType, AgentChannelTypeStates>>;

  /**
   * The list of idle codes.
   */
  idleCodes: IdleCode[];

  /**
   * Channels assigned to the agent, in display order, with their current state.
   */
  channels: ChannelStateInfo[];

  /**
   * Channel whose state and timer are shown on the header pill.
   */
  primaryChannel?: ChannelStateInfo;

  /**
   * Sets the given channels (all selectable channels when omitted) to Available.
   */
  setAllAvailable: () => void;

  /**
   * Sets all selectable channels to Idle with the given idle code.
   */
  setAllIdle: (idleCode: IdleCode) => void;

  /**
   * Applies per-channel availability from the "Manage channel availability" view.
   * @param availability Map of channel type to desired availability.
   */
  applyChannelAvailability: (availability: Partial<Record<SelectableChannelType, boolean>>) => Promise<boolean>;

  /**
   * Boolean indicating if a state change request is in flight.
   */
  isSettingAgentState: boolean;

  /**
   * Logger instance
   */
  logger: ILogger;

  /**
   * Callback invoked after a granular state change request succeeds.
   */
  onStateChange?: (payload: GranularStateChangePayload) => void;
}

export type GranularAgentStateComponentProps = Pick<
  IGranularAgentState,
  | 'idleCodes'
  | 'channels'
  | 'primaryChannel'
  | 'setAllAvailable'
  | 'setAllIdle'
  | 'applyChannelAvailability'
  | 'isSettingAgentState'
  | 'logger'
>;

export interface ChannelAvatarProps {
  channel: ChannelStateInfo;
  size?: 24 | 32;
}

export interface ChannelStatePreviewProps {
  channels: ChannelStateInfo[];
}

export interface GranularStateMenuProps {
  idleCodes: IdleCode[];
  isMultiChannel: boolean;
  isSettingAgentState: boolean;
  onSetAllAvailable: () => void;
  onSetAllIdle: (idleCode: IdleCode) => void;
  onManageChannels: () => void;
}

export interface ManageChannelAvailabilityProps {
  channels: ChannelStateInfo[];
  isSettingAgentState: boolean;
  /** Error message shown to the user when the last apply attempt failed. */
  applyError?: string | null;
  onApply: (availability: Partial<Record<SelectableChannelType, boolean>>) => void;
  onCancel: () => void;
}
