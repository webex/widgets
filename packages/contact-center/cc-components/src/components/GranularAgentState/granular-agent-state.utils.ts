import {IdleCode, ChannelType, AgentChannelTypeStates, ERROR_TRIGGERING_IDLE_CODES} from '@webex/cc-store';
import type {PresenceType} from '@momentum-design/components/dist/components/presence/presence.types';
import {
  AGENT_STATE_AVAILABLE,
  AGENT_STATE_IDLE,
  AVAILABLE_AUX_CODE_ID,
  CHANNEL_LABELS,
  CHANNEL_ORDER,
  granularAgentStateLabels,
} from './constant';
import {ChannelStateInfo, GranularAgentStateValue, SelectableChannelType} from './granular-agent-state.types';

type ChannelStatesMap = Partial<Record<ChannelType, AgentChannelTypeStates>>;

/**
 * Channels the agent can act on, in display order. Only channels present in the
 * state map with capacity > 0 are selectable.
 */
export const getSelectableChannelTypes = (channelStatesMap: ChannelStatesMap): SelectableChannelType[] =>
  CHANNEL_ORDER.filter((channelType) => {
    const state = channelStatesMap?.[channelType];
    return state && (state.totalChannelCount ?? 0) > 0;
  });

export const getIdleCodeName = (auxCodeId: string | undefined, idleCodes: IdleCode[]): string | undefined =>
  idleCodes?.find((code) => code.id === auxCodeId)?.name;

export const isChannelAvailable = (state?: AgentChannelTypeStates): boolean =>
  state?.agentState === AGENT_STATE_AVAILABLE && !state.pendingIdle;

export const getChannelDisplayState = (state: AgentChannelTypeStates, idleCodes: IdleCode[]): string => {
  const idleCodeName = getIdleCodeName(state.auxCodeId, idleCodes);
  if (state.pendingIdle) {
    return `${granularAgentStateLabels.pending} ${idleCodeName ?? granularAgentStateLabels.idle}`;
  }
  if (state.agentState === AGENT_STATE_IDLE) {
    return idleCodeName ?? granularAgentStateLabels.idle;
  }
  return state.agentState;
};

export const buildChannelStates = (
  channelStatesMap: ChannelStatesMap,
  idleCodes: IdleCode[],
  now: number
): ChannelStateInfo[] =>
  getSelectableChannelTypes(channelStatesMap)
    .filter((channelType) => Boolean(channelStatesMap?.[channelType]?.agentState))
    .map((channelType) => {
      const state = channelStatesMap[channelType];
      const elapsed = state.stateChangeTimestamp ? Math.floor((now - state.stateChangeTimestamp) / 1000) : 0;
      return {
        channelType,
        label: CHANNEL_LABELS[channelType],
        agentState: state.agentState,
        displayState: getChannelDisplayState(state, idleCodes),
        auxCodeId: state.auxCodeId,
        pendingIdle: Boolean(state.pendingIdle),
        elapsedTime: elapsed > 0 ? elapsed : 0,
        isAvailable: isChannelAvailable(state),
      };
    });

/**
 * Presence dot type for a channel avatar (mdc-presence types).
 * Channels with a pending idle transition show 'away' regardless of
 * the current agentState so the avatar reflects the upcoming state.
 */
export const getPresenceType = (agentState: string, pendingIdle?: boolean): PresenceType => {
  if (pendingIdle) return 'away';
  switch (agentState?.toLowerCase()) {
    case 'available':
      return 'active';
    case 'idle':
      return 'away';
    case 'rona':
      return 'dnd';
    default:
      return 'busy';
  }
};

/**
 * Idle codes an agent can pick: excludes Available and the system codes the platform assigns (e.g. RONA).
 */
export const getSelectableIdleCodes = (idleCodes: IdleCode[]): IdleCode[] => {
  const nonSelectableNames: string[] = Object.values(ERROR_TRIGGERING_IDLE_CODES ?? {});
  return (idleCodes ?? []).filter(
    (code) =>
      code.id !== AVAILABLE_AUX_CODE_ID &&
      code.name !== AGENT_STATE_AVAILABLE &&
      !nonSelectableNames.includes(code.name)
  );
};

export const filterIdleCodes = (idleCodes: IdleCode[], searchText: string): IdleCode[] => {
  const query = searchText.trim().toLowerCase();
  if (!query) return idleCodes;
  return idleCodes.filter((code) => code.name.toLowerCase().includes(query));
};

/**
 * Channels that are not already in the target state, so no-op requests are skipped.
 */
export const getChannelsToChange = (
  channelStatesMap: ChannelStatesMap,
  channelTypes: SelectableChannelType[],
  targetState: GranularAgentStateValue,
  auxCodeId: string
): SelectableChannelType[] =>
  channelTypes.filter((channelType) => {
    const state = channelStatesMap?.[channelType];
    if (!state) return true;
    if (targetState === AGENT_STATE_AVAILABLE) {
      return state.agentState !== AGENT_STATE_AVAILABLE || state.pendingIdle;
    }
    return state.agentState !== AGENT_STATE_IDLE || state.auxCodeId !== auxCodeId;
  });

/**
 * Idle code used when a channel is switched off in "Manage channel availability":
 * the most recently applied idle code on any channel, else the default idle code, else the first one.
 */
export const getLastSetIdleCode = (channelStatesMap: ChannelStatesMap, idleCodes: IdleCode[]): IdleCode | undefined => {
  const selectable = getSelectableIdleCodes(idleCodes);
  const lastIdle = Object.values(channelStatesMap ?? {})
    .filter((state) => state?.agentState === AGENT_STATE_IDLE && state.auxCodeId)
    .sort(
      (a, b) =>
        (b.lastIdleCodeChangeTimestamp ?? b.stateChangeTimestamp ?? 0) -
        (a.lastIdleCodeChangeTimestamp ?? a.stateChangeTimestamp ?? 0)
    )
    .map((state) => selectable.find((code) => code.id === state.auxCodeId))
    .find(Boolean);

  return lastIdle ?? selectable.find((code) => code.isDefault) ?? selectable[0];
};

/**
 * Formats seconds as hh:mm:ss (always including hours), as used in the channel preview.
 */
export const formatDuration = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return [hours, minutes, secs].map((part) => part.toString().padStart(2, '0')).join(':');
};
