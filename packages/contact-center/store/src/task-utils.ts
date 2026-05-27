import {EXCLUDED_PARTICIPANT_TYPES, RELATIONSHIP_TYPE_CONSULT} from './constants';
import {ITask, MEDIA_TYPE_TELEPHONY_LOWER, Participant} from './store.types';

/**
 * Determines if a task is an incoming task
 * @param task - The task object
 * @returns Whether the task is incoming
 */
export const isIncomingTask = (task: ITask, agentId: string): boolean => {
  const taskData = task?.data;
  const taskState = taskData?.interaction?.state;
  const participants = taskData?.interaction?.participants;
  const hasJoined = agentId && participants?.[agentId]?.hasJoined;

  return (
    !taskData?.wrapUpRequired &&
    !hasJoined &&
    (taskState === 'new' || taskState === 'consult' || taskState === 'connected' || taskState === 'conference')
  );
};

/**
 * Checks if the current agent is a secondary agent in a consultation scenario.
 * Secondary agents are those who were consulted (not the original call owner).
 * @param {Object} task - The task object containing interaction details
 * @returns {boolean} True if this is a secondary agent (consulted party)
 */
export function isSecondaryAgent(task: ITask): boolean {
  const interaction = task.data.interaction;

  return (
    !!interaction.callProcessingDetails &&
    interaction.callProcessingDetails.relationshipType === RELATIONSHIP_TYPE_CONSULT &&
    interaction.callProcessingDetails.parentInteractionId &&
    interaction.callProcessingDetails.parentInteractionId !== interaction.interactionId
  );
}

/**
 * Checks if the current agent is a secondary EP-DN (Entry Point Dial Number) agent.
 * This is specifically for telephony consultations to external numbers/entry points.
 */
export function isSecondaryEpDnAgent(task: ITask): boolean {
  return task.data.interaction.mediaType === MEDIA_TYPE_TELEPHONY_LOWER && isSecondaryAgent(task);
}

/**
 * Retrieves the list of active conference participants excluding the current agent
 * Filters out customers, supervisors, VVAs, and participants who have left
 *
 * @param task - The task object containing interaction data
 * @param agentId - The ID of the current agent to exclude from results
 * @returns Array of active agent participants in the conference
 */
export const getConferenceParticipants = (task: ITask, agentId: string): Participant[] => {
  const participantsList: Participant[] = [];

  // Early return if required data is missing
  if (!task?.data?.interaction?.media || !task?.data?.interactionId) {
    return participantsList;
  }

  const mediaMainCall = task.data.interaction.media?.[task.data.interactionId];
  const participantsInMainCall = new Set(mediaMainCall?.participants ?? []);
  const participants = task.data.interaction.participants ?? {};

  if (participantsInMainCall.size > 0 && participants) {
    participantsInMainCall.forEach((participantId: string) => {
      const participant = participants[participantId];
      // Include only active agent participants (excluding current agent, customers, supervisors, and VVAs)
      if (
        participant &&
        !EXCLUDED_PARTICIPANT_TYPES.includes(participant.pType) &&
        !participant.hasLeft &&
        participant.id !== agentId
      ) {
        participantsList.push({
          id: participant.id,
          pType: participant.pType,
          name: participant.name ? participant.name : participant.id,
        });
      }
    });
  }

  return participantsList;
};

export function isInteractionOnHold(task: ITask): boolean {
  if (!task || !task.data || !task.data.interaction) {
    return false;
  }
  const interaction = task.data.interaction;
  if (!interaction.media) {
    return false;
  }
  // Only check the main call media — consult hold is handled separately
  // in the consulting section UI. Without this filter, switching to
  // main call during a consult would incorrectly show the hold indicator
  // because the consult media has isHold: true.
  return Object.values(interaction.media).some((media) => media.mType === 'mainCall' && media.isHold);
}

export const setmTypeForEPDN = (task: ITask, mType: string) => {
  if (isSecondaryEpDnAgent(task)) {
    return 'mainCall';
  }

  return mType;
};
export const findMediaResourceId = (task: ITask, mType: string) => {
  for (const key in task.data.interaction.media) {
    if (task.data.interaction.media[key].mType === mType) {
      return task.data.interaction.media[key].mediaResourceId;
    }
  }

  return '';
};

/**
 * Finds the hold timestamp for a specific media type (mainCall, consult, etc.)
 * Used for timer alignment in Consult & Conference scenarios to match Agent Desktop behavior.
 *
 * @param task - The task object containing interaction data
 * @param mType - The media type to search for ('mainCall', 'consult', 'conference')
 * @returns The hold timestamp in milliseconds or null if not on hold
 */
export const findHoldTimestamp = (task: ITask, mType: string): number | null => {
  const interaction = task?.data?.interaction;

  if (!interaction || !interaction.media) {
    return null;
  }

  // Adjust mType if agent is secondary EPDN agent
  mType = setmTypeForEPDN(task, mType);

  // Find media ID for the specified type (mainCall, consult, etc.)
  const mediaId = findMediaResourceId(task, mType);

  // Return the holdTimestamp if media exists and has a hold timestamp
  if (mediaId && interaction.media[mediaId]?.holdTimestamp !== undefined) {
    return interaction.media[mediaId].holdTimestamp;
  }

  return null;
};
