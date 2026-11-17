import {SelectableChannelType} from './granular-agent-state.types';

// Display order matches the Agent Desktop granular state selector.
export const CHANNEL_ORDER: SelectableChannelType[] = ['telephony', 'chat', 'email', 'social'];

export const CHANNEL_LABELS: Record<SelectableChannelType, string> = {
  telephony: 'Voice',
  chat: 'Chat',
  email: 'Email',
  social: 'Social',
};

// Filled icons match the Agent Desktop channel avatars (md-avatar channel-* types).
export const CHANNEL_AVATAR_ICONS: Record<SelectableChannelType, string> = {
  telephony: 'handset-filled',
  chat: 'chat-filled',
  email: 'email-filled',
  social: 'sms-message-filled',
};

// Regular icons match the Agent Desktop "Manage channel availability" rows.
export const CHANNEL_MANAGE_ICONS: Record<SelectableChannelType, string> = {
  telephony: 'handset-regular',
  chat: 'chat-regular',
  email: 'email-regular',
  social: 'sms-message-regular',
};

export const ALL_CHANNELS_ICON = 'checkbox-group-regular';
export const AVAILABLE_ICON = 'active-presence-small-filled';
export const IDLE_CODE_ICON = 'recents-presence-filled';

export const AVAILABLE_AUX_CODE_ID = '0';
export const AGENT_STATE_AVAILABLE = 'Available';
export const AGENT_STATE_IDLE = 'Idle';

export const granularAgentStateLabels = {
  searchPlaceholder: 'Search',
  setAvailableAllChannels: 'Set as Available (all channels)',
  manageChannelAvailability: 'Manage Channel Availability',
  setIdleAllChannels: 'Set as Idle (all channels)',
  selectReason: 'Select a reason:',
  available: 'Available',
  idle: 'Idle',
  pending: 'Pending',
  noMatchFound: 'No matches found',
  manageChannelAvailabilityTitle: 'Manage channel availability',
  allChannels: 'All',
  availableOnAllChannels: 'Available on all channels',
  stateLabel: 'State',
  cancel: 'Cancel',
  apply: 'Apply',
  goBack: 'Go back',
  stateSelector: 'State Selector',
  applyFailed: 'Failed to apply changes. Please try again.',
};
