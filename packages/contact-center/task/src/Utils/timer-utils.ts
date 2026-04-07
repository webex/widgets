import {ITask, findHoldTimestamp, TaskUIControls} from '@webex/cc-store';
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
 */
export function calculateStateTimerData(
  currentTask: ITask | null,
  controls: TaskUIControls | null,
  agentId: string
): TimerData {
  // Default return value
  const defaultTimer: TimerData = {label: null, timestamp: 0};

  if (!currentTask || !controls) {
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
  if (controls.wrapup?.isVisible && wrapUpTimestamp) {
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
 */
export function calculateConsultTimerData(
  currentTask: ITask | null,
  controls: TaskUIControls | null,
  agentId: string
): TimerData {
  const defaultTimer: TimerData = {label: TIMER_LABEL_CONSULTING, timestamp: 0};

  if (!currentTask || !controls) {
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

  // Derive consultCallHeld from controls: switchToConsult.isVisible means consult call is held
  const consultCallHeld = controls.switchToConsult?.isVisible ?? false;

  if (consultCallHeld) {
    const consultHoldTimestamp = findHoldTimestamp(currentTask, 'consult');

    return {
      label: TIMER_LABEL_CONSULT_ON_HOLD,
      timestamp: consultHoldTimestamp && consultHoldTimestamp > 0 ? consultHoldTimestamp : consultStartTimeStamp,
    };
  }

  // Use task.data.consultStatus for consult phase distinction
  const isConsultInitiated = currentTask.data?.consultStatus === 'consultInitiated';
  const label = isConsultInitiated ? TIMER_LABEL_CONSULT_REQUESTED : TIMER_LABEL_CONSULTING;

  return {
    label,
    timestamp: consultStartTimeStamp,
  };
}
