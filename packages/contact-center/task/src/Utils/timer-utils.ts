import {ITask, TaskUIControls} from '@webex/cc-store';
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
 * Find the latest (most recently added) consult media from the interaction.
 *
 * After transfer → re-consult the backend may leave the OLD consult media
 * in the interaction alongside the NEW one.  Using Array.find() would return
 * the first (stale) entry; we need the last one which is the active consult.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findLatestConsultMedia(interaction: any): any {
  if (!interaction?.media) return null;
  const allMedia = Object.values(interaction.media);
  let latest = null;
  for (const m of allMedia) {
    if ((m as {mType: string}).mType === 'consult') {
      latest = m;
    }
  }
  return latest;
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
  const defaultTimer: TimerData = {label: null, timestamp: 0};

  if (!currentTask || !controls) {
    return defaultTimer;
  }

  const interaction = currentTask.data?.interaction;
  const participant = interaction?.participants?.[agentId];

  if (!participant) {
    return defaultTimer;
  }

  let wrapUpTimestamp = 0;
  let postCallTimestamp = 0;

  if (participant.isWrapUp) {
    wrapUpTimestamp = participant.lastUpdated || 0;
  } else {
    wrapUpTimestamp = participant.wrapUpTimestamp || 0;
  }

  postCallTimestamp = participant.currentStateTimestamp || 0;

  if (controls.main?.wrapup?.isVisible) {
    const effectiveWrapUpTimestamp = wrapUpTimestamp || currentTask.data?.eventTime || 0;
    if (effectiveWrapUpTimestamp) {
      return {
        label: TIMER_LABEL_WRAP_UP,
        timestamp: effectiveWrapUpTimestamp,
      };
    }
  }

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
 * Approach mirrors the original next-branch pattern: derive consultCallHeld
 * from the consult media's isHold flag (task data), NOT from SDK uiControls
 * properties like activeLeg or switch button visibility.  Those UI properties
 * have different lifecycle timing and broader semantics that cause false
 * positives (e.g., switch.isVisible is true during CONSULT_INITIATING).
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

  let consultStartTimeStamp = 0;
  if (participant.consultTimestamp) {
    consultStartTimeStamp = participant.consultTimestamp;
  } else if (participant.lastUpdated) {
    consultStartTimeStamp = participant.lastUpdated;
  }

  if (!consultStartTimeStamp) {
    return defaultTimer;
  }

  // Use the LATEST consult media, not the first. After transfer → re-consult
  // the backend keeps the old consult media (with stale isHold=true) alongside
  // the new one. Array.find() would return the old stale entry.
  let consultMedia = findLatestConsultMedia(interaction);

  // Consulted agent (Agent 2): their call is mType "mainCall" not "consult".
  // When the initiator switches away, Agent 2's mainCall is put on hold.
  if (!consultMedia && interaction?.media) {
    const mainMedia = Object.values(interaction.media).find((m) => (m as {mType: string}).mType === 'mainCall');
    if (mainMedia) {
      consultMedia = mainMedia;
    }
  }

  const isConsultMediaHeld = consultMedia?.isHold === true;
  const consultHoldTimestamp = consultMedia?.holdTimestamp ?? null;
  const consultCallHeld = isConsultMediaHeld && consultHoldTimestamp !== null && consultHoldTimestamp > 0;

  if (consultCallHeld) {
    return {
      label: TIMER_LABEL_CONSULT_ON_HOLD,
      timestamp: consultHoldTimestamp,
    };
  }

  // Distinguish "Consult Requested" from "Consulting" using participant data.
  const isConsultInitiated =
    participant?.consultState === 'consultInitiated' || currentTask.data?.consultStatus === 'consultInitiated';
  const label = isConsultInitiated ? TIMER_LABEL_CONSULT_REQUESTED : TIMER_LABEL_CONSULTING;

  return {
    label,
    timestamp: consultStartTimeStamp,
  };
}
