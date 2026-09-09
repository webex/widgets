import type {ITask, WellnessBreakPhase} from '@webex/cc-store';
import type {
  AgentChannelStateDetail,
  WellnessBreakRecoveryMarkerV1,
  WellnessCapturedChannelState,
} from './wellness-internal.types';

const TERMINAL_TASK_STATES = new Set(['completed', 'disconnected', 'ended', 'terminated', 'wrappedup']);
const BUSY_CHANNEL_STATES = new Set(['engaged', 'engagedother', 'reserved', 'wrapup', 'wrappingup']);
const PRE_PLAY_PHASES = new Set<WellnessBreakPhase>(['changing-to-break', 'waiting-for-safe-state', 'starting']);

/** @internal */
export interface IWellnessRestoreGroup {
  state: 'Available' | 'Idle';
  auxCodeId?: string;
  channelTypes: string[];
}

/** @internal */
export type WellnessRecoveryDecision = 'discard' | 'wait' | 'clear' | 'restore';

/** @internal */
export const normalizeWellnessState = (value?: string): string =>
  typeof value === 'string' ? value.replace(/[\s_-]/g, '').toLowerCase() : '';

/** @internal */
export const isTaskBlockingWellness = (task?: ITask | null): boolean => {
  if (!task) return false;
  if (!task.data) return true;
  if (task.data.wrapUpRequired === true) return true;

  const state = normalizeWellnessState(task.data.interaction?.state);
  return !state || !TERMINAL_TASK_STATES.has(state);
};

/** @internal */
export const areAllTasksSafeForWellness = (taskList: Record<string, ITask>): boolean =>
  Object.values(taskList || {}).every((task) => !isTaskBlockingWellness(task));

/** @internal */
export const cloneWellnessChannelStates = (
  channelTypes: string[],
  channelStateDetails: Record<string, AgentChannelStateDetail>
): Record<string, WellnessCapturedChannelState> =>
  [...new Set(channelTypes)].reduce<Record<string, WellnessCapturedChannelState>>((snapshot, channelType) => {
    const detail = channelStateDetails[channelType];
    if (detail) {
      snapshot[channelType] = {
        agentState: detail.agentState,
        auxCodeId: detail.auxCodeId ?? null,
      };
    }
    return snapshot;
  }, {});

/** @internal */
export const isWellnessChannelState = (
  detail: AgentChannelStateDetail | undefined,
  wellnessAuxCodeId?: string
): boolean =>
  Boolean(
    wellnessAuxCodeId &&
      normalizeWellnessState(detail?.agentState) === 'idle' &&
      detail?.pendingIdle === false &&
      detail?.auxCodeId === wellnessAuxCodeId
  );

/** @internal */
export const shouldCancelWellnessBeforePlayback = (
  phase: WellnessBreakPhase,
  detail: AgentChannelStateDetail | undefined,
  wellnessAuxCodeId?: string
): boolean => {
  if (!PRE_PLAY_PHASES.has(phase) || !detail) return false;
  return !isWellnessChannelState(detail, wellnessAuxCodeId) && detail.pendingIdle !== true;
};

/** @internal */
export const areWellnessChannelsConfirmed = (
  channelTypes: string[],
  channelStateDetails: Record<string, AgentChannelStateDetail>,
  wellnessAuxCodeId?: string
): boolean =>
  channelTypes.length > 0 &&
  channelTypes.every((channelType) => isWellnessChannelState(channelStateDetails[channelType], wellnessAuxCodeId));

/** @internal */
export const buildWellnessRestoreGroups = ({
  channelTypes,
  currentChannelStates,
  preBreakChannelStates,
  wellnessAuxCodeId,
  validIdleCodeIds,
  defaultIdleCodeId,
  includeUnconfirmedChannels = false,
}: {
  channelTypes: string[];
  currentChannelStates: Record<string, AgentChannelStateDetail>;
  preBreakChannelStates: Record<string, WellnessCapturedChannelState>;
  wellnessAuxCodeId?: string;
  validIdleCodeIds: string[];
  defaultIdleCodeId?: string;
  includeUnconfirmedChannels?: boolean;
}): IWellnessRestoreGroup[] => {
  const validIdleCodes = new Set(validIdleCodeIds);
  const groups = new Map<string, IWellnessRestoreGroup>();

  [...new Set(channelTypes)].forEach((channelType) => {
    const current = currentChannelStates[channelType];
    const currentState = normalizeWellnessState(current?.agentState);
    let target: Omit<IWellnessRestoreGroup, 'channelTypes'> | undefined;

    if (BUSY_CHANNEL_STATES.has(currentState) || current?.pendingIdle === true) {
      target = {state: 'Available'};
    } else if (
      current &&
      normalizeWellnessState(current.agentState) === 'idle' &&
      Boolean(current.auxCodeId) &&
      current.auxCodeId !== wellnessAuxCodeId
    ) {
      // RONA and any other externally-owned state must not be overwritten.
      return;
    } else if (!isWellnessChannelState(current, wellnessAuxCodeId) && !includeUnconfirmedChannels) {
      return;
    } else {
      const captured = preBreakChannelStates[channelType];
      const capturedState = normalizeWellnessState(captured?.agentState);
      const capturedAuxCodeId = captured?.auxCodeId;

      if (
        capturedState === 'idle' &&
        capturedAuxCodeId &&
        capturedAuxCodeId !== wellnessAuxCodeId &&
        validIdleCodes.has(capturedAuxCodeId)
      ) {
        target = {state: 'Idle', auxCodeId: capturedAuxCodeId};
      } else if (capturedState === 'idle' && defaultIdleCodeId && validIdleCodes.has(defaultIdleCodeId)) {
        target = {state: 'Idle', auxCodeId: defaultIdleCodeId};
      } else {
        target = {state: 'Available'};
      }
    }

    if (!target) return;
    const key = `${target.state}:${target.auxCodeId || ''}`;
    const group = groups.get(key) || {...target, channelTypes: []};
    group.channelTypes.push(channelType);
    groups.set(key, group);
  });

  return [...groups.values()];
};

/** @internal */
export const createWellnessRecoveryMarker = ({
  agentSessionId,
  stateModel,
  channelTypes = [],
  preBreakChannelStates = {},
}: Omit<WellnessBreakRecoveryMarkerV1, 'version'>): WellnessBreakRecoveryMarkerV1 => ({
  version: 1,
  agentSessionId,
  stateModel,
  ...(stateModel === 'agent-state-control'
    ? {
        channelTypes: [...new Set<string>(channelTypes ?? [])],
        preBreakChannelStates: [...new Set<string>(channelTypes ?? [])].reduce<
          Record<string, WellnessCapturedChannelState>
        >((snapshot, channelType) => {
          const detail = preBreakChannelStates?.[channelType];
          if (detail) snapshot[channelType] = {...detail};
          return snapshot;
        }, {}),
      }
    : {}),
});

/** @internal */
export const parseWellnessRecoveryMarker = (serialized: string | null): WellnessBreakRecoveryMarkerV1 | undefined => {
  if (!serialized) return undefined;
  try {
    const marker = JSON.parse(serialized) as Partial<WellnessBreakRecoveryMarkerV1>;
    if (
      marker.version !== 1 ||
      typeof marker.agentSessionId !== 'string' ||
      !marker.agentSessionId ||
      (marker.stateModel !== 'legacy' && marker.stateModel !== 'agent-state-control')
    ) {
      return undefined;
    }
    if (
      marker.stateModel === 'agent-state-control' &&
      (!Array.isArray(marker.channelTypes) ||
        marker.channelTypes.some((channelType) => typeof channelType !== 'string'))
    ) {
      return undefined;
    }
    return createWellnessRecoveryMarker({
      agentSessionId: marker.agentSessionId,
      stateModel: marker.stateModel,
      channelTypes: marker.channelTypes,
      preBreakChannelStates: marker.preBreakChannelStates,
    });
  } catch {
    return undefined;
  }
};

/** @internal */
export const getWellnessRecoveryDecision = ({
  marker,
  agentSessionId,
  wellnessAuxCodeId,
  legacyStateKnown,
  legacyAuxCodeId,
  ascSnapshotKnown,
  currentChannelStates,
}: {
  marker?: WellnessBreakRecoveryMarkerV1;
  agentSessionId: string;
  wellnessAuxCodeId?: string;
  legacyStateKnown: boolean;
  legacyAuxCodeId?: string;
  ascSnapshotKnown: boolean;
  currentChannelStates: Record<string, AgentChannelStateDetail>;
}): WellnessRecoveryDecision => {
  if (!marker || marker.agentSessionId !== agentSessionId) return 'discard';
  if (marker.stateModel === 'legacy') {
    if (!legacyStateKnown) return 'wait';
    return legacyAuxCodeId === wellnessAuxCodeId ? 'restore' : 'clear';
  }
  if (!ascSnapshotKnown) return 'wait';

  const requiresRestore = (marker.channelTypes || []).some((channelType) => {
    const detail = currentChannelStates[channelType];
    return isWellnessChannelState(detail, wellnessAuxCodeId) || detail?.pendingIdle === true;
  });
  return requiresRestore ? 'restore' : 'clear';
};
