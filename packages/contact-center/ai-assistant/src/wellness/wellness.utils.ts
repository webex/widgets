import type {ITask} from '@webex/cc-store';
import type {WellnessBreakRecoveryMarkerV1} from './wellness-internal.types';

const TERMINAL_TASK_STATES = new Set(['completed', 'disconnected', 'ended', 'terminated', 'wrappedup']);

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
export const createWellnessRecoveryMarker = ({
  agentSessionId,
  preBreakLegacyState,
  preBreakLegacyAuxCodeId,
}: Omit<WellnessBreakRecoveryMarkerV1, 'version'>): WellnessBreakRecoveryMarkerV1 => ({
  version: 1,
  agentSessionId,
  ...(typeof preBreakLegacyState === 'string' ? {preBreakLegacyState} : {}),
  ...(typeof preBreakLegacyAuxCodeId === 'string' ? {preBreakLegacyAuxCodeId} : {}),
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
      (marker.preBreakLegacyState !== undefined && typeof marker.preBreakLegacyState !== 'string') ||
      (marker.preBreakLegacyAuxCodeId !== undefined && typeof marker.preBreakLegacyAuxCodeId !== 'string')
    ) {
      return undefined;
    }

    return createWellnessRecoveryMarker({
      agentSessionId: marker.agentSessionId,
      preBreakLegacyState: marker.preBreakLegacyState,
      preBreakLegacyAuxCodeId: marker.preBreakLegacyAuxCodeId,
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
}: {
  marker?: WellnessBreakRecoveryMarkerV1;
  agentSessionId: string;
  wellnessAuxCodeId?: string;
  legacyStateKnown: boolean;
  legacyAuxCodeId?: string;
}): WellnessRecoveryDecision => {
  if (!marker || marker.agentSessionId !== agentSessionId) return 'discard';
  if (!legacyStateKnown) return 'wait';
  return legacyAuxCodeId === wellnessAuxCodeId ? 'restore' : 'clear';
};
