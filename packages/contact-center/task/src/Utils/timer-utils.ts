import {ITask, findHoldTimestamp} from '@webex/cc-store';
import {ControlVisibility} from '@webex/cc-components';
import {
  TIMER_LABEL_WRAP_UP,
  TIMER_LABEL_POST_CALL,
  TIMER_LABEL_CONSULT_ON_HOLD,
  TIMER_LABEL_CONSULT_REQUESTED,
  TIMER_LABEL_CONSULTING,
} from './constants';

/**
 * Timer data structure containing label and timestamp
 */
export interface TimerData {
  label: string | null;
  timestamp: number;
}

/**
 * Calculate state timer label and timestamp based on task state.
 * Priority: Wrap Up > Post Call
 *
 * @param currentTask - The current task object
 * @param controlVisibility - Control visibility flags
 * @param agentId - The current agent ID
 * @returns TimerData object with label and timestamp
 */
export function calculateStateTimerData(
  currentTask: ITask | null,
  controlVisibility: ControlVisibility | null,
  agentId: string
): TimerData {
  // Default return value
  const defaultTimer: TimerData = {label: null, timestamp: 0};

  if (!currentTask || !controlVisibility) {
    return defaultTimer;
  }

  const interaction = currentTask.data?.interaction;
  const participant = interaction?.participants?.[agentId];

  if (!participant) {
    return defaultTimer;
  }

  // Extract timestamps from participant data
  let wrapUpTimestamp = 0;
  let postCallTimestamp = 0;

  // Wrap-up timestamp: use lastUpdated if currently in wrap-up, otherwise use wrapUpTimestamp
  if (participant.isWrapUp) {
    wrapUpTimestamp = participant.lastUpdated || 0;
  } else {
    wrapUpTimestamp = participant.wrapUpTimestamp || 0;
  }

  // Post-call timestamp: use currentStateTimestamp
  postCallTimestamp = participant.currentStateTimestamp || 0;

  // Priority 1: Wrap-up state (highest priority)
  if (controlVisibility.wrapup?.isVisible && wrapUpTimestamp) {
    return {
      label: TIMER_LABEL_WRAP_UP,
      timestamp: wrapUpTimestamp,
    };
  }

  // Priority 2: Post-call state (only if not in wrap-up)
  const isInPostCall = interaction?.state === 'post_call' || participant?.currentState === 'post_call';
  if (isInPostCall && postCallTimestamp) {
    return {
      label: TIMER_LABEL_POST_CALL,
      timestamp: postCallTimestamp,
    };
  }

  return defaultTimer;
}

/**
 * Calculate consult timer label and timestamp based on consult state.
 * Handles consult on hold vs active consulting states.
 *
 * @param currentTask - The current task object
 * @param controlVisibility - Control visibility flags
 * @param agentId - The current agent ID
 * @returns TimerData object with label and timestamp
 */
export function calculateConsultTimerData(
  currentTask: ITask | null,
  controlVisibility: ControlVisibility | null,
  agentId: string
): TimerData {
  // Default return value
  const defaultTimer: TimerData = {label: TIMER_LABEL_CONSULTING, timestamp: 0};

  if (!currentTask || !controlVisibility) {
    return defaultTimer;
  }

  const interaction = currentTask.data?.interaction;
  const participant = interaction?.participants?.[agentId];

  if (!participant) {
    return defaultTimer;
  }

  // Extract consult start timestamp
  let consultStartTimeStamp = 0;
  if (participant.consultTimestamp) {
    consultStartTimeStamp = participant.consultTimestamp;
  } else if (participant.lastUpdated) {
    consultStartTimeStamp = participant.lastUpdated;
  }

  // If no consult timestamp, return default
  if (!consultStartTimeStamp) {
    return defaultTimer;
  }

  // Check if consult call is on hold
  if (controlVisibility.consultCallHeld) {
    // Extract consult hold timestamp
    const consultHoldTimestamp = findHoldTimestamp(currentTask, 'consult');

    return {
      label: TIMER_LABEL_CONSULT_ON_HOLD,
      // Use consultHoldTimestamp when on hold, fallback to consult start time
      timestamp: consultHoldTimestamp && consultHoldTimestamp > 0 ? consultHoldTimestamp : consultStartTimeStamp,
    };
  }

  // Active consulting - determine label based on consult state
  const label = controlVisibility.isConsultInitiated ? TIMER_LABEL_CONSULT_REQUESTED : TIMER_LABEL_CONSULTING;

  return {
    label,
    timestamp: consultStartTimeStamp,
  };
}
