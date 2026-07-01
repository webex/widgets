import {ITask, TaskUIControls} from '@webex/cc-store';
import {Interaction} from '@webex/contact-center';
import {
  TIMER_LABEL_WRAP_UP,
  TIMER_LABEL_POST_CALL,
  TIMER_LABEL_CONSULT_ON_HOLD,
  TIMER_LABEL_CONSULT_REQUESTED,
  TIMER_LABEL_CONSULTING,
} from './constants';
import {resolveConsultHoldTimestampMs} from './task-util';

/**
 * Timer data structure containing label and timestamp
 */
export interface TimerData {
  label: string | null;
  timestamp: number;
}

type MediaEntry = {
  mType?: string;
  isHold?: boolean;
  holdTimestamp?: number | null;
  lastUpdated?: number;
  joinTimestamp?: number;
  eventTime?: number;
  createdAt?: number;
  mediaResourceId?: string;
  participants?: string[];
};

type InteractionParticipant = {
  consultTimestamp?: number;
  lastUpdated?: number;
  consultState?: string;
  isConsulted?: boolean;
  isWrapUp?: boolean;
  wrapUpTimestamp?: number | null;
  currentState?: string | null;
  currentStateTimestamp?: number | null;
};

type InteractionWithMedia = Interaction & {
  media?: Record<string, MediaEntry>;
  participants?: Record<string, InteractionParticipant>;
};

type TaskStateSnapshot = {
  interaction?: InteractionWithMedia;
};

type TaskWithStateSnapshot = ITask & {
  state?: {
    context?: {
      taskData?: TaskStateSnapshot;
    };
  };
};

const getMediaEntries = (media: InteractionWithMedia['media']): MediaEntry[] =>
  media ? (Object.values(media) as MediaEntry[]) : [];

const getMediaRecencyScore = (media: MediaEntry, fallbackIndex = 0): number => {
  const candidateTimestamps = [
    media.lastUpdated,
    media.holdTimestamp,
    media.joinTimestamp,
    media.eventTime,
    media.createdAt,
  ];

  for (const value of candidateTimestamps) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return fallbackIndex;
};

/**
 * Find the latest (most recently added) consult media from the interaction.
 *
 * After transfer → re-consult the backend may leave the OLD consult media
 * in the interaction alongside the NEW one. Prefer held consult entries when
 * present (switch-to-main), otherwise pick the most recent consult leg.
 */
export function findLatestConsultMedia(interaction: InteractionWithMedia | undefined): MediaEntry | null {
  if (!interaction?.media) {
    return null;
  }

  const consultEntries = getMediaEntries(interaction.media).filter((media) => media.mType === 'consult');

  if (consultEntries.length === 0) {
    return null;
  }

  if (consultEntries.length === 1) {
    return consultEntries[0];
  }

  const heldEntries = consultEntries.filter((media) => media.isHold === true);
  const candidates = heldEntries.length > 0 ? heldEntries : consultEntries;

  return candidates.reduce((latest, current, index) => {
    const latestScore = getMediaRecencyScore(latest, index - 1);
    const currentScore = getMediaRecencyScore(current, index);
    return currentScore >= latestScore ? current : latest;
  });
}

const resolveConsultInteraction = (
  currentTask: ITask,
  agentId: string
): {
  interaction: InteractionWithMedia | undefined;
  participant: InteractionParticipant | undefined;
  isConsultedAgent: boolean;
} => {
  const taskWithSnapshot = currentTask as TaskWithStateSnapshot;
  const latestTaskData = taskWithSnapshot.state?.context?.taskData;
  const snapInteraction = latestTaskData?.interaction;
  const dataInteraction = currentTask.data?.interaction as InteractionWithMedia | undefined;
  const participant = dataInteraction?.participants?.[agentId] ?? snapInteraction?.participants?.[agentId];

  const isConsultedAgent = Boolean(currentTask.data?.isConsulted || participant?.isConsulted === true);

  // Initiator (Agent 1): snapshot is fresher on switch-to-main. Consulted (Agent 2): task.data is fresher.
  const interaction = isConsultedAgent ? (dataInteraction ?? snapInteraction) : (snapInteraction ?? dataInteraction);

  return {interaction, participant, isConsultedAgent};
};

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

  const interaction = currentTask.data?.interaction as InteractionWithMedia | undefined;
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
 * Derives consult on hold from consult media isHold (not uiControls alone).
 * EP/DN and agent-name: isHold may be true before holdTimestamp arrives — still show Consult on Hold.
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

  const {interaction, participant, isConsultedAgent} = resolveConsultInteraction(currentTask, agentId);

  if (!participant || !interaction) {
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

  let consultMedia = findLatestConsultMedia(interaction);

  // Consulted agent (Agent 2 EP/DN): single mainCall leg — only when no consult media exists.
  if (!consultMedia && isConsultedAgent && interaction.media) {
    const mainMedia = getMediaEntries(interaction.media).find((media) => media.mType === 'mainCall');
    if (mainMedia) {
      consultMedia = mainMedia;
    }
  }

  const isConsultMediaHeld = consultMedia?.isHold === true;
  const isConsultInitiated =
    participant.consultState === 'consultInitiated' || currentTask.data?.consultStatus === 'consultInitiated';
  const consultAccepted = !isConsultInitiated && Boolean(participant.consultTimestamp);

  // Initiator parked on main before media catches up (common in EP/DN switch-to-main).
  const consultParkedByActiveLeg =
    !isConsultedAgent &&
    consultAccepted &&
    controls.activeLeg === 'main' &&
    Boolean(controls.consult?.endConsult?.isVisible || controls.main?.endConsult?.isVisible);

  const isConsultOnHold = isConsultMediaHeld || consultParkedByActiveLeg;

  if (isConsultOnHold) {
    return {
      label: TIMER_LABEL_CONSULT_ON_HOLD,
      timestamp: resolveConsultHoldTimestampMs(consultMedia, interaction.interactionId),
    };
  }

  const label = isConsultInitiated ? TIMER_LABEL_CONSULT_REQUESTED : TIMER_LABEL_CONSULTING;

  return {
    label,
    timestamp: consultStartTimeStamp,
  };
}
