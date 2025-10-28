import {
  CONSULT_STATE_COMPLETED,
  CONSULT_STATE_CONFERENCING,
  CONSULT_STATE_INITIATED,
  INTERACTION_STATE_CONFERENCE,
  INTERACTION_STATE_CONNECTED,
  INTERACTION_STATE_POST_CALL,
  INTERACTION_STATE_WRAPUP,
  RELATIONSHIP_TYPE_CONSULT,
  TASK_STATE_CONSULT,
  TASK_STATE_CONSULT_COMPLETED,
  TASK_STATE_CONSULTING,
} from './constants';
import {ConsultStatus, ITask, MEDIA_TYPE_TELEPHONY_LOWER} from './store.types';

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
  const interaction = task.data.interaction;
  if (
    !!task.data.consultMediaResourceId &&
    !!interaction.participants[agentId]?.consultState &&
    task.data.interaction.state !== INTERACTION_STATE_WRAPUP &&
    task.data.interaction.state !== INTERACTION_STATE_POST_CALL // If interaction.state is post_call, we want to return post_call.
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
  const taskState = interaction?.state;
  const participants = interaction?.participants || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participant: any = Object.values(participants).find((p: any) => p.pType === 'Agent' && p.id === agentId);

  if (state === TASK_STATE_CONSULT) {
    if (participant && participant.isConsulted) {
      return ConsultStatus.BEING_CONSULTED;
    }
    return ConsultStatus.CONSULT_INITIATED;
  } else if (state === TASK_STATE_CONSULTING) {
    if (participant && participant.isConsulted) {
      return ConsultStatus.BEING_CONSULTED_ACCEPTED;
    }
    return ConsultStatus.CONSULT_ACCEPTED;
  } else if (state === INTERACTION_STATE_CONNECTED) {
    return ConsultStatus.CONNECTED;
  } else if (state === INTERACTION_STATE_CONFERENCE) {
    return ConsultStatus.CONFERENCE;
  } else if (state === TASK_STATE_CONSULT_COMPLETED) {
    return taskState;
  }
  // Default return for states that don't match any condition (e.g., chat, email initial states)
  return state || ConsultStatus.NO_CONSULTATION_IN_PROGRESS;
}
