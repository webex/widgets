import {
  CONSULT_STATE_COMPLETED,
  CONSULT_STATE_CONFERENCING,
  CONSULT_STATE_INITIATED,
  CUSTOMER,
  EXCLUDED_PARTICIPANT_TYPES,
  INTERACTION_STATE_CONFERENCE,
  INTERACTION_STATE_CONNECTED,
  INTERACTION_STATE_POST_CALL,
  INTERACTION_STATE_WRAPUP,
  MEDIA_TYPE_CONSULT,
  RELATIONSHIP_TYPE_CONSULT,
  SUPERVISOR,
  TASK_STATE_CONSULT,
  TASK_STATE_CONSULT_COMPLETED,
  TASK_STATE_CONSULTING,
  VVA,
} from './constants';
import {ConsultStatus, ITask, MEDIA_TYPE_TELEPHONY_LOWER, Participant} from './store.types';

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

export function getConsultMPCState(task: ITask, agentId: string): string {
  const consultMediaResourceId = findMediaResourceId(task, 'consult');

  const interaction = task.data.interaction;
  if (
    (!!consultMediaResourceId &&
      !!interaction.participants[agentId]?.consultState &&
      task.data.interaction.state !== INTERACTION_STATE_WRAPUP) ||
    (!consultMediaResourceId && interaction.participants[agentId]?.consultState === CONSULT_STATE_COMPLETED)
    // revisit below condition if needed for post_call scenarios in future
    //&& task.data.interaction.state !== INTERACTION_STATE_POST_CALL // If interaction.state is post_call, we want to return post_call.
  ) {
    // interaction state for all agents when consult is going on
    switch (interaction.participants[agentId]?.consultState) {
      case CONSULT_STATE_INITIATED:
        return TASK_STATE_CONSULT;
      case CONSULT_STATE_COMPLETED:
        return interaction.state === INTERACTION_STATE_CONNECTED
          ? INTERACTION_STATE_CONNECTED
          : TASK_STATE_CONSULT_COMPLETED;
      case CONSULT_STATE_CONFERENCING:
        return INTERACTION_STATE_CONFERENCE;
      default:
        return TASK_STATE_CONSULTING;
    }
  }

  return interaction?.state;
}

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
 * @param {Object} task - The task object containing interaction details
 * @returns {boolean} True if this is a secondary EP-DN agent in telephony consultation
 */
export function isSecondaryEpDnAgent(task: ITask): boolean {
  return task.data.interaction.mediaType === MEDIA_TYPE_TELEPHONY_LOWER && isSecondaryAgent(task);
}

export function getTaskStatus(task: ITask, agentId: string): string {
  const interaction = task.data.interaction;
  if (isSecondaryEpDnAgent(task)) {
    if (interaction.state === INTERACTION_STATE_CONFERENCE) {
      return INTERACTION_STATE_CONFERENCE;
    }
    return TASK_STATE_CONSULTING; // handle state of child agent case as we cant rely on interaction state.
  }
  if (
    (task.data.interaction.state === INTERACTION_STATE_WRAPUP ||
      task.data.interaction.state === INTERACTION_STATE_POST_CALL) &&
    interaction.participants[agentId]?.consultState === CONSULT_STATE_COMPLETED
  ) {
    return TASK_STATE_CONSULT_COMPLETED;
  }

  return getConsultMPCState(task, agentId);
}

export function getConsultStatus(task: ITask, agentId: string): string {
  if (!task || !task.data) {
    return ConsultStatus.NO_CONSULTATION_IN_PROGRESS;
  }

  const state = getTaskStatus(task, agentId);

  const {interaction} = task.data;
  const participants = interaction?.participants || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participant: any = Object.values(participants).find((p: any) => p.pType === 'Agent' && p.id === agentId);

  if (state === TASK_STATE_CONSULT) {
    if ((participant && participant.isConsulted) || isSecondaryEpDnAgent(task)) {
      return ConsultStatus.BEING_CONSULTED;
    }
    return ConsultStatus.CONSULT_INITIATED;
  } else if (state === TASK_STATE_CONSULTING) {
    if ((participant && participant.isConsulted) || isSecondaryEpDnAgent(task)) {
      return ConsultStatus.BEING_CONSULTED_ACCEPTED;
    }
    return ConsultStatus.CONSULT_ACCEPTED;
  } else if (state === INTERACTION_STATE_CONNECTED) {
    return ConsultStatus.CONNECTED;
  } else if (state === INTERACTION_STATE_CONFERENCE) {
    return ConsultStatus.CONFERENCE;
  } else if (state === TASK_STATE_CONSULT_COMPLETED) {
    return ConsultStatus.CONSULT_COMPLETED;
  }
  // Default return for states that don't match any condition (e.g., chat, email initial states)
  return state || ConsultStatus.NO_CONSULTATION_IN_PROGRESS;
}

export function getIsConferenceInProgress(task: ITask): boolean {
  // Early return if required data is missing
  if (!task?.data?.interaction?.media || !task?.data?.interactionId) {
    return false;
  }

  const mediaMainCall = task.data.interaction.media[task.data.interactionId];
  const participantsInMainCall = new Set(mediaMainCall?.participants);
  const participants = task?.data?.interaction?.participants;

  const agentParticipants = new Set();
  if (participantsInMainCall.size > 0 && participants) {
    participantsInMainCall.forEach((participantId: string) => {
      const participant = participants[participantId];
      if (participant && ![CUSTOMER, SUPERVISOR, VVA].includes(participant.pType) && !participant.hasLeft) {
        agentParticipants.add(participantId);
      }
    });
  }

  return agentParticipants.size >= 2;
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

/**
 * Counts the number of active agent participants in the conference
 * Excludes customers, supervisors, VVAs, and participants who have left
 *
 * @param task - The task object containing interaction data
 * @returns Count of active agent participants
 */
export function getConferenceParticipantsCount(task: ITask): number {
  const participantsList: Participant[] = [];

  // Early return if required data is missing
  if (!task?.data?.interaction?.media || !task?.data?.interactionId) {
    return 0;
  }

  const mediaMainCall = task.data.interaction.media?.[task.data.interactionId];
  const participantsInMainCall = new Set(mediaMainCall?.participants ?? []);
  const participants = task.data.interaction.participants ?? {};

  if (participantsInMainCall.size > 0 && participants) {
    participantsInMainCall.forEach((participantId: string) => {
      const participant = participants[participantId];
      // Count only active agent participants (excluding customers, supervisors, and VVAs)
      if (participant && !EXCLUDED_PARTICIPANT_TYPES.includes(participant.pType) && !participant.hasLeft) {
        participantsList.push({
          id: participant.id,
          pType: participant.pType,
          name: participant.name,
        });
      }
    });
  }

  return participantsList.length;
}

export function getIsCustomerInCall(task: ITask): boolean {
  // Early return if required data is missing
  if (!task?.data?.interaction?.media || !task?.data?.interactionId) {
    return false;
  }

  const mediaMainCall = task.data.interaction.media[task.data.interactionId];
  const participantsInMainCall = new Set(mediaMainCall?.participants);
  const participants = task?.data?.interaction?.participants;

  if (participantsInMainCall.size > 0 && participants) {
    return Array.from(participantsInMainCall).some((participantId: string) => {
      const participant = participants[participantId];
      return participant && participant.pType === CUSTOMER && !participant.hasLeft;
    });
  }

  return false;
}

export function getIsConsultInProgress(task: ITask): boolean {
  const mediaObject = task.data.interaction.media;
  return Object.values(mediaObject).some((media) => media.mType === MEDIA_TYPE_CONSULT);
}

export function isInteractionOnHold(task: ITask): boolean {
  if (!task || !task.data || !task.data.interaction) {
    return false;
  }
  const interaction = task.data.interaction;
  if (!interaction.media) {
    return false;
  }
  return Object.values(interaction.media).some((media) => media.isHold);
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

const isConsultOnHoldMPC = (task: ITask, agentId: string): boolean => {
  const isInConsultState = [TASK_STATE_CONSULT, TASK_STATE_CONSULTING].includes(getConsultMPCState(task, agentId));
  const consultMediaResourceId = task.data.consultMediaResourceId;
  const isConsultHold = consultMediaResourceId && task.data.interaction.media[consultMediaResourceId]?.isHold;

  return isInConsultState && !isConsultHold;
};

export const findHoldStatus = (task: ITask, mType: string, agentId: string): boolean => {
  const interaction = task.data.interaction;
  if (!interaction) {
    return false;
  }
  mType = setmTypeForEPDN(task, mType); // set mType if agent is secondary EPDN agent
  const mediaId = findMediaResourceId(task, mType);
  // custom mainCall hold status for agent who initiated the consult.
  if (
    mType === 'mainCall' &&
    interaction.media[mediaId]?.participants.includes(agentId) &&
    (isConsultOnHoldMPC(task, agentId) || [TASK_STATE_CONSULT_COMPLETED].includes(getConsultMPCState(task, agentId)))
  ) {
    return true;
  }

  // hold status for agents who are in consulting call(consulting agent | consulted agent)

  return mType === TASK_STATE_CONSULT && interaction.media[mediaId]
    ? interaction.media[mediaId].participants.includes(agentId)
      ? interaction.media[mediaId].isHold
      : false
    : (interaction.media[mediaId] && interaction.media[mediaId].isHold) || false; // For all the other agent for main whatever is the status of main call hold
};
