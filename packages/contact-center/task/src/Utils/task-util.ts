import {ILogger} from '@webex/cc-store';
import {ITask} from '@webex/contact-center';
import {
  CUSTOMER,
  SUPERVISOR,
  VVA,
  MAX_PARTICIPANTS_IN_MULTIPARTY_CONFERENCE,
  MAX_PARTICIPANTS_IN_THREE_PARTY_CONFERENCE,
} from './constants';
import {Participant, Visibility} from '@webex/cc-components';

//@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
export function findHoldTimestamp(interaction: Interaction, mType = 'mainCall', logger?: ILogger): number | null {
  try {
    if (!interaction?.media) return null;
    for (const key in interaction.media) {
      if (interaction.media[key].mType === mType) {
        return interaction.media[key].holdTimestamp ?? null;
      }
    }
    return null;
  } catch (error) {
    logger?.error(`CC-Widgets: Task: Error in findHoldTimestamp - ${error.message}`, {
      module: 'task-util',
      method: 'findHoldTimestamp',
    });
    return null;
  }
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
      if (
        participant &&
        participant.pType !== CUSTOMER &&
        participant.pType !== SUPERVISOR &&
        !participant.hasLeft &&
        participant.pType !== VVA
      ) {
        agentParticipants.add(participantId);
      }
    });
  }

  return agentParticipants.size >= 2;
}

export const getConferenceParticipants = (task: ITask, agentId: string): Participant[] => {
  const participantsList: Participant[] = [];

  // Early return if required data is missing
  if (!task?.data?.interaction?.media || !task?.data?.interactionId) {
    return participantsList;
  }

  const mediaMainCall = task.data.interaction.media[task.data.interactionId];
  const participantsInMainCall = new Set(mediaMainCall?.participants);
  const participants = task?.data?.interaction?.participants;

  if (participantsInMainCall.size > 0 && participants) {
    participantsInMainCall.forEach((participantId: string) => {
      const participant = participants[participantId];
      if (
        participant &&
        participant.pType !== CUSTOMER &&
        participant.pType !== SUPERVISOR &&
        !participant.hasLeft &&
        participant.pType !== VVA &&
        participant.id !== agentId
      ) {
        participantsList.push({
          id: participant.id,
          pType: participant.pType,
          name: participant.name,
        });
      }
    });
  }

  return participantsList;
};

export function getConferenceParticipantsCount(task: ITask): number {
  const participantsList: Participant[] = [];

  // Early return if required data is missing
  if (!task?.data?.interaction?.media || !task?.data?.interactionId) {
    return 0;
  }

  const mediaMainCall = task.data.interaction.media[task.data.interactionId];
  const participantsInMainCall = new Set(mediaMainCall?.participants);
  const participants = task?.data?.interaction?.participants;

  if (participantsInMainCall.size > 0 && participants) {
    participantsInMainCall.forEach((participantId: string) => {
      const participant = participants[participantId];
      if (participant && participant.pType !== SUPERVISOR && !participant.hasLeft && participant.pType !== VVA) {
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

export function getConsultMPCState(task: ITask, agentId: string): string {
  const interaction = task.data.interaction;
  if (
    !!task.data.consultMediaResourceId &&
    !!interaction.participants[agentId]?.consultState &&
    task.data.interaction.state !== 'wrapUp' &&
    task.data.interaction.state !== 'post_call' // If interaction.state is post_call, we want to return post_call.
  ) {
    // interaction state for all agents when consult is going on
    switch (interaction.participants[agentId]?.consultState) {
      case 'consultInitiated':
        return 'consult';
      case 'consultCompleted':
        return interaction.state === 'connected' ? 'connected' : 'consultCompleted';
      case 'conferencing':
        return 'conference';
      default:
        return 'consulting';
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
    interaction.callProcessingDetails.relationshipType === 'consult' &&
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
  return task.data.interaction.mediaType === 'telephony' && isSecondaryAgent(task);
}

export function getTaskStatus(task: ITask, agentId: string): string {
  const interaction = task.data.interaction;
  if (isSecondaryEpDnAgent(task)) {
    if (interaction.state === 'conference') {
      return 'conference';
    }
    return 'consulting'; // handle state of child agent case as we cant rely on interaction state.
  }
  if (
    (task.data.interaction.state === 'wrapUp' || task.data.interaction.state === 'post_call') &&
    interaction.participants[agentId]?.consultState === 'consultCompleted'
  ) {
    return 'consultCompleted';
  }

  return getConsultMPCState(task, agentId);
}

export function getConsultStatus(task: ITask, agentId: string): string {
  if (!task || !task.data) {
    return 'No consultation in progress';
  }

  const state = getTaskStatus(task, agentId);

  const {interaction} = task.data;
  const taskState = interaction?.state;
  const participants = interaction?.participants || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participant: any = Object.values(participants).find((p: any) => p.pType === 'Agent' && p.id === agentId);

  if (state === 'consult') {
    if (participant && participant.isConsulted) {
      return 'beingConsulted';
    }
    return 'consultInitiated';
  } else if (state === 'consulting') {
    if (participant && participant.isConsulted) {
      return 'beingConsultedAccepted';
    }
    return 'consultAccepted';
  } else if (state === 'connected') {
    return 'connected';
  } else if (state === 'conference') {
    return 'conference';
  } else if (state === 'consultCompleted') {
    return taskState;
  }
  // Default return for states that don't match any condition (e.g., chat, email initial states)
  return state || 'No consultation in progress';
}

export function getIsConsultInProgress(task: ITask): boolean {
  const mediaObject = task.data.interaction.media;
  return Object.values(mediaObject).some((media) => media.mType === 'consult');
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

/**
 * Helper interface for device type checks
 */
interface DeviceTypeFlags {
  isBrowser: boolean;
  isAgentDN: boolean;
  isExtension: boolean;
}

/**
 * Helper function to get device type flags to avoid repetition
 */
function getDeviceTypeFlags(deviceType: string): DeviceTypeFlags {
  return {
    isBrowser: deviceType === 'BROWSER',
    isAgentDN: deviceType === 'AGENT_DN',
    isExtension: deviceType === 'EXTENSION',
  };
}

/**
 * Helper function to check if telephony is supported for the device
 */
function isTelephonySupported(deviceType: string, webRtcEnabled: boolean): boolean {
  const {isBrowser, isAgentDN, isExtension} = getDeviceTypeFlags(deviceType);
  return (isBrowser && webRtcEnabled) || isAgentDN || isExtension;
}

/**
 * Get visibility for Accept button
 */
export function getAcceptButtonVisibility(
  deviceType: string,
  webRtcEnabled: boolean,
  isCall: boolean,
  isChat: boolean,
  isEmail: boolean
): Visibility {
  const {isBrowser, isAgentDN, isExtension} = getDeviceTypeFlags(deviceType);
  const isDigitalChannel = isChat || isEmail;

  const isBrowserVisible = isBrowser && ((webRtcEnabled && isCall) || isDigitalChannel);
  const isPhoneDeviceVisible = (isAgentDN || isExtension) && isDigitalChannel;
  const isVisible = isBrowserVisible || isPhoneDeviceVisible;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Decline button
 */
export function getDeclineButtonVisibility(deviceType: string, webRtcEnabled: boolean, isCall: boolean): Visibility {
  const {isBrowser} = getDeviceTypeFlags(deviceType);
  const isVisible = isBrowser && webRtcEnabled && isCall;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for End button
 */
export function getEndButtonVisibility(
  deviceType: string,
  isEndCallEnabled: boolean,
  isCall: boolean,
  isHeld: boolean,
  isConferenceInProgress: boolean,
  taskConsultStatus: string
): Visibility {
  const {isBrowser} = getDeviceTypeFlags(deviceType);
  const isVisible = isBrowser || (isEndCallEnabled && isCall) || !isCall;

  const isEnabled =
    !isHeld ||
    (isConferenceInProgress &&
      taskConsultStatus !== 'consultInitiated' &&
      taskConsultStatus !== 'consultAccepted' &&
      taskConsultStatus !== 'beingConsulted' &&
      taskConsultStatus !== 'beingConsultedAccepted');
  return {isVisible, isEnabled};
}

/**
 * Get visibility for Mute/Unmute button
 */
export function getMuteUnmuteButtonVisibility(deviceType: string, webRtcEnabled: boolean, isCall: boolean): Visibility {
  const {isBrowser} = getDeviceTypeFlags(deviceType);
  const isVisible = isBrowser && webRtcEnabled && isCall;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Hold/Resume button
 */
export function getHoldResumeButtonVisibility(
  deviceType: string,
  webRtcEnabled: boolean,
  isCall: boolean,
  isConferenceInProgress: boolean,
  isHeld: boolean
): Visibility {
  const isVisible = isCall && isTelephonySupported(deviceType, webRtcEnabled);

  const isEnabled = !isConferenceInProgress && !isHeld;
  return {isVisible, isEnabled};
}

/**
 * Get visibility for Consult button
 */
export function getConsultButtonVisibility(
  deviceType: string,
  webRtcEnabled: boolean,
  isCall: boolean,
  conferenceParticipantsCount: number,
  maxParticipantsInConference: number
): Visibility {
  const isVisible = isCall && isTelephonySupported(deviceType, webRtcEnabled);

  // Disable consult button when max participants reached in conference
  const isEnabled = conferenceParticipantsCount < maxParticipantsInConference;

  return {isVisible, isEnabled};
}

/**
 * Get visibility for Transfer button
 */
export function getTransferButtonVisibility(
  isTransferVisibility: boolean,
  isConferenceInProgress: boolean
): Visibility {
  const isVisible = isTransferVisibility && !isConferenceInProgress;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Conference button
 */
export function getConferenceButtonVisibility(
  deviceType: string,
  webRtcEnabled: boolean,
  isCall: boolean,
  isChat: boolean
): Visibility {
  const {isBrowser} = getDeviceTypeFlags(deviceType);
  const isVisible = (isBrowser && isCall && webRtcEnabled) || isChat;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Wrapup button
 */
export function getWrapupButtonVisibility(task: ITask): Visibility {
  const isVisible = task?.data?.wrapUpRequired ?? false;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Pause/Resume Recording button
 */
export function getPauseResumeRecordingButtonVisibility(
  deviceType: string,
  webRtcEnabled: boolean,
  isCall: boolean,
  isConferenceInProgress: boolean
): Visibility {
  const isVisible = isCall && isTelephonySupported(deviceType, webRtcEnabled) && !isConferenceInProgress;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for End Consult button
 */
export function getEndConsultButtonVisibility(
  isEndConsultEnabled: boolean,
  deviceType: string,
  webRtcEnabled: boolean,
  isCall: boolean,
  consultStatus: string
): Visibility {
  const consultVisibleCondition =
    consultStatus == 'consultInitiated' ||
    consultStatus == 'consultAccepted' ||
    consultStatus == 'beingConsultedAccepted';
  const isVisible =
    isEndConsultEnabled && isCall && isTelephonySupported(deviceType, webRtcEnabled) && consultVisibleCondition;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Recording Indicator
 */
export function getRecordingIndicatorVisibility(isCall: boolean): Visibility {
  return {isVisible: isCall, isEnabled: true};
}

/**
 * Get visibility for Conference In Progress indicator
 */
export function getConferenceInProgressVisibility(task: ITask): boolean {
  return task.data.isConferenceInProgress ?? false;
}

/**
 * Get visibility for Exit Conference button
 */
export function getExitConferenceButtonVisibility(isConferenceInProgress: boolean): Visibility {
  const isVisible = isConferenceInProgress;

  return {isVisible, isEnabled: true};
}
/**
 * Get visibility for Merge Conference button
 */
export function getMergeConferenceButtonVisibility(consultStatus: string): Visibility {
  const isVisible = consultStatus === 'consultAccepted' || consultStatus === 'consultInitiated';
  const isEnabled = consultStatus !== 'consultInitiated';
  return {isVisible, isEnabled};
}

export function getConsultTransferButtonVisibility(consultStatus: string): Visibility {
  const isVisible = consultStatus === 'consultAccepted' || consultStatus === 'consultInitiated';
  const isEnabled = consultStatus !== 'consultInitiated';
  return {isVisible, isEnabled};
}
/**
 * This function determines the visibility of various controls based on the task's data.
 * @param task The task object
 * @returns An object containing the visibility of various controls based on the task's data
 */
export function getControlsVisibility(
  deviceType: string,
  featureFlags: {[key: string]: boolean},
  task: ITask,
  agentId: string,
  multiPartyConferenceEnabled: boolean,
  logger?: ILogger
) {
  try {
    const {mediaType} = task?.data?.interaction || {};

    const isCall = mediaType === 'telephony';
    const isChat = mediaType === 'chat';
    const isEmail = mediaType === 'email';

    const {isBrowser} = getDeviceTypeFlags(deviceType);
    const {isEndCallEnabled, isEndConsultEnabled, webRtcEnabled} = featureFlags;

    const isTransferVisibility = isBrowser ? webRtcEnabled : true; // Applicable for all type of station login and media type
    const isConferenceInProgress = task.data.isConferenceInProgress ?? false;
    const isHeld = isInteractionOnHold(task);

    // Calculate conference participants for consult button enable/disable logic
    const conferenceParticipantsCount = getConferenceParticipantsCount(task);
    const maxParticipantsInConference = multiPartyConferenceEnabled
      ? MAX_PARTICIPANTS_IN_MULTIPARTY_CONFERENCE
      : MAX_PARTICIPANTS_IN_THREE_PARTY_CONFERENCE;

    const taskConsultStatus = getConsultStatus(task, agentId);
    // Use dedicated visibility functions for each button
    const controls = {
      accept: getAcceptButtonVisibility(deviceType, webRtcEnabled, isCall, isChat, isEmail),
      decline: getDeclineButtonVisibility(deviceType, webRtcEnabled, isCall),
      end: getEndButtonVisibility(
        deviceType,
        isEndCallEnabled,
        isCall,
        isHeld,
        isConferenceInProgress,
        taskConsultStatus
      ),
      muteUnmute: getMuteUnmuteButtonVisibility(deviceType, webRtcEnabled, isCall),
      holdResume: getHoldResumeButtonVisibility(deviceType, webRtcEnabled, isCall, isConferenceInProgress, isHeld),
      consult: getConsultButtonVisibility(
        deviceType,
        webRtcEnabled,
        isCall,
        conferenceParticipantsCount,
        maxParticipantsInConference
      ),
      transfer: getTransferButtonVisibility(isTransferVisibility, isConferenceInProgress),
      conference: getConferenceButtonVisibility(deviceType, webRtcEnabled, isCall, isChat),
      wrapup: getWrapupButtonVisibility(task),
      pauseResumeRecording: getPauseResumeRecordingButtonVisibility(
        deviceType,
        webRtcEnabled,
        isCall,
        isConferenceInProgress
      ),
      endConsult: getEndConsultButtonVisibility(
        isEndConsultEnabled,
        deviceType,
        webRtcEnabled,
        isCall,
        taskConsultStatus
      ),
      recordingIndicator: getRecordingIndicatorVisibility(isCall),
      exitConference: getExitConferenceButtonVisibility(isConferenceInProgress),
      mergeConference: getMergeConferenceButtonVisibility(taskConsultStatus),
      consultTransfer: getConsultTransferButtonVisibility(taskConsultStatus),
      isConferenceInProgress: getConferenceInProgressVisibility(task),
      isConsultInitiatedOrAccepted:
        (taskConsultStatus === 'consultInitiated' ||
          taskConsultStatus === 'beingConsultedAccepted' ||
          taskConsultStatus === 'consultAccepted') &&
        !task.data.wrapUpRequired &&
        isCall,
      hideCallControls: taskConsultStatus == 'beingConsultedAccepted',
      isHeld,
    };

    return controls;
  } catch (error) {
    logger?.error(`CC-Widgets: Task: Error in getControlsVisibility - ${error.message}`, {
      module: 'task-util',
      method: 'getControlsVisibility',
    });
    // Return safe default controls
    const defaultVisibility: Visibility = {isVisible: false, isEnabled: false};
    return {
      accept: defaultVisibility,
      decline: defaultVisibility,
      end: defaultVisibility,
      muteUnmute: defaultVisibility,
      holdResume: defaultVisibility,
      consult: defaultVisibility,
      transfer: defaultVisibility,
      conference: defaultVisibility,
      wrapup: {isVisible: false, isEnabled: true}, // Wrapup is always enabled
      pauseResumeRecording: defaultVisibility,
      endConsult: defaultVisibility,
      recordingIndicator: defaultVisibility,
      exitConference: defaultVisibility,
      mergeConference: defaultVisibility,
      consultTransfer: defaultVisibility,
      isConferenceInProgress: false,
      isConsultInitiatedOrAccepted: false,
      hideCallControls: false,
      isHeld: false,
    };
  }
}
