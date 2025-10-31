import {
  ILogger,
  DIALNUMBER,
  EXTENSION,
  DESKTOP,
  ConsultStatus,
  getConsultStatus,
  getIsConsultInProgress,
  isInteractionOnHold,
  getIsCustomerInCall,
  getConferenceParticipantsCount,
  findHoldStatus,
} from '@webex/cc-store';
import {ITask} from '@webex/contact-center';
import {
  MEDIA_TYPE_TELEPHONY,
  MEDIA_TYPE_CHAT,
  MEDIA_TYPE_EMAIL,
  MAX_PARTICIPANTS_IN_MULTIPARTY_CONFERENCE,
  MAX_PARTICIPANTS_IN_THREE_PARTY_CONFERENCE,
} from './constants';
import {Visibility} from '@webex/cc-components';

// ==================== UTILITY FUNCTIONS ====================

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
    isBrowser: deviceType === DESKTOP,
    isAgentDN: deviceType === DIALNUMBER,
    isExtension: deviceType === EXTENSION,
  };
}

/**
 * Helper function to check if telephony is supported for the device
 */
function isTelephonySupported(deviceType: string, webRtcEnabled: boolean): boolean {
  const {isBrowser, isAgentDN, isExtension} = getDeviceTypeFlags(deviceType);
  return (isBrowser && webRtcEnabled) || isAgentDN || isExtension;
}

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

// ==================== CALL CONTROL BUTTON VISIBILITY FUNCTIONS ====================

/**
 * Get visibility for Accept button
 */
export function getAcceptButtonVisibility(
  isBrowser: boolean,
  isPhoneDevice: boolean,
  webRtcEnabled: boolean,
  isCall: boolean,
  isDigitalChannel: boolean
): Visibility {
  const isVisible =
    (isBrowser && ((webRtcEnabled && isCall) || isDigitalChannel)) || (isPhoneDevice && isDigitalChannel);

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Decline button
 */
export function getDeclineButtonVisibility(isBrowser: boolean, webRtcEnabled: boolean, isCall: boolean): Visibility {
  const isVisible = isBrowser && webRtcEnabled && isCall;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for End button
 */
export function getEndButtonVisibility(
  isBrowser: boolean,
  isEndCallEnabled: boolean,
  isCall: boolean,
  isHeld: boolean,
  isConsultInitiatedOrAcceptedOrBeingConsulted: boolean,
  isConferenceInProgress: boolean,
  isConsultInitiatedOrAccepted: boolean,
  consultCallHeld: boolean
): Visibility {
  const isVisible = isBrowser || (isEndCallEnabled && isCall) || !isCall;
  const isConferenceWithConsultNotHeld = isConferenceInProgress && isConsultInitiatedOrAccepted && !consultCallHeld;
  const isEnabled = !isHeld && !isConsultInitiatedOrAcceptedOrBeingConsulted && !isConferenceWithConsultNotHeld;

  return {isVisible, isEnabled};
}

/**
 * Get visibility for Mute/Unmute button
 */
export function getMuteUnmuteButtonVisibility(
  isBrowser: boolean,
  webRtcEnabled: boolean,
  isCall: boolean,
  isConsultInitiatedOrAccepted: boolean
): Visibility {
  const isVisible = isBrowser && webRtcEnabled && isCall && isConsultInitiatedOrAccepted;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Hold/Resume button
 */
export function getHoldResumeButtonVisibility(
  isTelephonySupported: boolean,
  isCall: boolean,
  isConferenceInProgress: boolean,
  isConsultInProgress: boolean,
  isHeld: boolean,
  isBeingConsulted: boolean
): Visibility {
  const isVisible = isCall && isTelephonySupported && !isBeingConsulted;
  const isEnabled = (!isConferenceInProgress || isHeld) && !isConsultInProgress;

  return {isVisible, isEnabled};
}

// ==================== RECORDING FUNCTIONS ====================

/**
 * Get visibility for Pause/Resume Recording button
 */
export function getPauseResumeRecordingButtonVisibility(
  isTelephonySupported: boolean,
  isCall: boolean,
  isConferenceInProgress: boolean,
  isConsultInitiatedOrAccepted: boolean
): Visibility {
  const isVisible = isCall && isTelephonySupported && !isConferenceInProgress && !isConsultInitiatedOrAccepted;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Recording Indicator
 */
export function getRecordingIndicatorVisibility(isCall: boolean): Visibility {
  return {isVisible: isCall, isEnabled: true};
}

// ==================== TRANSFER AND CONFERENCE FUNCTIONS ====================

/**
 * Get visibility for Transfer button
 */
export function getTransferButtonVisibility(
  isTransferVisibility: boolean,
  isConferenceInProgress: boolean,
  isConsultInitiatedOrAccepted: boolean
): Visibility {
  const isVisible = isTransferVisibility && !isConferenceInProgress && !isConsultInitiatedOrAccepted;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Conference button
 */
export function getConferenceButtonVisibility(
  isBrowser: boolean,
  webRtcEnabled: boolean,
  isCall: boolean,
  isChat: boolean,
  isBeingConsulted: boolean
): Visibility {
  const isVisible = ((isBrowser && isCall && webRtcEnabled) || isChat) && !isBeingConsulted;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Conference In Progress indicator
 */
export function getConferenceInProgressVisibility(task: ITask): boolean {
  return task?.data?.isConferenceInProgress ?? false;
}

/**
 * Get visibility for Exit Conference button
 */
export function getExitConferenceButtonVisibility(
  isConferenceInProgress: boolean,
  isConsultInitiatedOrAccepted: boolean,
  consultCallHeld: boolean
): Visibility {
  const isVisible = isConferenceInProgress && !isConsultInitiatedOrAccepted;
  const isConferenceWithConsultNotHeld = isConferenceInProgress && isConsultInitiatedOrAccepted && !consultCallHeld;
  const isEnabled = !isConferenceWithConsultNotHeld;

  return {isVisible, isEnabled};
}

/**
 * Get visibility for Merge Conference button
 */
export function getMergeConferenceButtonVisibility(
  isConsultInitiatedOrAccepted: boolean,
  isConsultAccepted: boolean,
  consultCallHeld: boolean,
  isConferenceInProgress: boolean
): Visibility {
  const isVisible = isConsultInitiatedOrAccepted;
  const isConferenceWithConsultNotHeld = isConferenceInProgress && isConsultInitiatedOrAccepted && !consultCallHeld;
  const isEnabled = isConsultAccepted && consultCallHeld && !isConferenceWithConsultNotHeld;

  return {isVisible, isEnabled};
}

// ==================== CONSULT FUNCTIONS ====================

/**
 * Get visibility for Consult button
 */
export function getConsultButtonVisibility(
  isTelephonySupported: boolean,
  isCall: boolean,
  isConsultInProgress: boolean,
  isCustomerInCall: boolean,
  conferenceParticipantsCount: number,
  maxParticipantsInConference: number,
  isBeingConsulted: boolean
): Visibility {
  const isVisible = isCall && isTelephonySupported && !isBeingConsulted;
  const isEnabled =
    conferenceParticipantsCount < maxParticipantsInConference && !isConsultInProgress && isCustomerInCall;

  return {isVisible, isEnabled};
}

/**
 * Get visibility for End Consult button
 */
export function getEndConsultButtonVisibility(
  isEndConsultEnabled: boolean,
  isTelephonySupported: boolean,
  isCall: boolean,
  isConsultInitiatedOrAccepted: boolean
): Visibility {
  const isVisible = isEndConsultEnabled && isCall && isTelephonySupported && isConsultInitiatedOrAccepted;

  return {isVisible, isEnabled: true};
}

/**
 * Get visibility for Consult Transfer button
 */
export function getConsultTransferButtonVisibility(
  isConsultInitiatedOrAccepted: boolean,
  isConsultAccepted: boolean,
  consultCallHeld: boolean,
  isConferenceInProgress: boolean
): Visibility {
  const isVisible = isConsultInitiatedOrAccepted;
  const isConferenceWithConsultNotHeld = isConferenceInProgress && isConsultInitiatedOrAccepted && !consultCallHeld;
  const isEnabled = isConsultAccepted && consultCallHeld && !isConferenceWithConsultNotHeld;

  return {isVisible, isEnabled};
}

/**
 * Get visibility for Merge Conference Consult button
 */
export function getMergeConferenceConsultButtonVisibility(
  isConsultAccepted: boolean,
  isConsultInitiated: boolean,
  consultCallHeld: boolean
): Visibility {
  const isVisible = isConsultAccepted || isConsultInitiated;
  const isEnabled = !consultCallHeld && isConsultAccepted;

  return {isVisible, isEnabled};
}

/**
 * Get visibility for Consult Transfer Consult button
 */
export function getConsultTransferConsultButtonVisibility(
  isConsultAccepted: boolean,
  isConsultInitiated: boolean,
  consultCallHeld: boolean
): Visibility {
  const isVisible = isConsultAccepted || isConsultInitiated;
  const isEnabled = !consultCallHeld && isConsultAccepted;

  return {isVisible, isEnabled};
}

/**
 * Get visibility for Mute/Unmute Consult button
 */
export function getMuteUnmuteConsultButtonVisibility(
  isBrowser: boolean,
  webRtcEnabled: boolean,
  isCall: boolean,
  isConsultInitiatedOrAccepted: boolean,
  isConsultAccepted: boolean
): Visibility {
  const isVisible = isBrowser && webRtcEnabled && isCall && isConsultInitiatedOrAccepted && !isConsultAccepted;

  return {isVisible, isEnabled: true};
}

// ==================== SWITCH CALL FUNCTIONS ====================

/**
 * Get visibility for Switch to Main Call button
 */
export function getSwitchToMainCallButtonVisibility(
  isBeingConsulted: boolean,
  isConsultAccepted: boolean,
  isConsultInitiated: boolean,
  consultCallHeld: boolean
): Visibility {
  const isVisible = !isBeingConsulted && (isConsultAccepted || isConsultInitiated) && !consultCallHeld;
  const isEnabled = isConsultAccepted;

  return {isVisible, isEnabled};
}

/**
 * Get visibility for Switch to Consult button
 */
export function getSwitchToConsultButtonVisibility(isBeingConsulted: boolean, consultCallHeld: boolean): Visibility {
  const isVisible = !isBeingConsulted && consultCallHeld;
  // const isConferenceWithConsultNotHeld = isConferenceInProgress && isConsultAccepted && !consultCallHeld;
  const isEnabled = true;

  return {isVisible, isEnabled};
}

// ==================== OTHER FUNCTIONS ====================

/**
 * Get visibility for Wrapup button
 */
export function getWrapupButtonVisibility(task: ITask): Visibility {
  const isVisible = task?.data?.wrapUpRequired ?? false;

  return {isVisible, isEnabled: true};
}
// ==================== MAIN AGGREGATOR FUNCTION ====================

/**
 * This function determines the visibility of various controls based on the task's data.
 * @param deviceType The device type (Browser, Extension, AgentDN)
 * @param featureFlags Feature flags configuration object
 * @param task The task object
 * @param agentId The agent ID
 * @param multiPartyConferenceEnabled Whether multiparty conference is enabled
 * @param logger Optional logger instance
 * @returns An object containing the visibility and state of various controls
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
    // Extract media type and related flags
    const {mediaType} = task?.data?.interaction || {};
    const isCall = mediaType === MEDIA_TYPE_TELEPHONY;
    const isChat = mediaType === MEDIA_TYPE_CHAT;
    const isEmail = mediaType === MEDIA_TYPE_EMAIL;
    const isDigitalChannel = isChat || isEmail;

    // Extract device type flags
    const {isBrowser, isAgentDN, isExtension} = getDeviceTypeFlags(deviceType);
    const isPhoneDevice = isAgentDN || isExtension;

    // Extract feature flags
    const {isEndCallEnabled, isEndConsultEnabled, webRtcEnabled} = featureFlags;

    // Calculate telephony support
    const telephonySupported = isTelephonySupported(deviceType, webRtcEnabled);

    // Calculate task state flags
    const isTransferVisibility = isBrowser ? webRtcEnabled : true;
    const isConferenceInProgress = task?.data?.isConferenceInProgress ?? false;
    const isConsultInProgress = getIsConsultInProgress(task);
    const isHeld = isInteractionOnHold(task);
    const isCustomerInCall = getIsCustomerInCall(task);
    // const mainCallHeld = findHoldStatus(task, 'mainCall', agentId);
    const consultCallHeld = findHoldStatus(task, 'consult', agentId);
    const taskConsultStatus = getConsultStatus(task, agentId);

    // Calculate conference participants count
    const conferenceParticipantsCount = getConferenceParticipantsCount(task);
    const maxParticipantsInConference = multiPartyConferenceEnabled
      ? MAX_PARTICIPANTS_IN_MULTIPARTY_CONFERENCE
      : MAX_PARTICIPANTS_IN_THREE_PARTY_CONFERENCE;

    // Calculate consult status flags (REUSED CONDITIONS)
    const isConsultInitiated = taskConsultStatus === ConsultStatus.CONSULT_INITIATED;
    const isConsultAccepted = taskConsultStatus === ConsultStatus.CONSULT_ACCEPTED;
    const isBeingConsulted = taskConsultStatus === ConsultStatus.BEING_CONSULTED_ACCEPTED;
    const isConsultInitiatedOrAccepted = isConsultInitiated || isConsultAccepted || isBeingConsulted;
    const isConsultInitiatedOrAcceptedOnly = isConsultInitiated || isConsultAccepted;
    const isConsultInitiatedOrAcceptedOrBeingConsulted =
      isConsultInitiated ||
      isConsultAccepted ||
      taskConsultStatus === ConsultStatus.BEING_CONSULTED ||
      isBeingConsulted;

    // Build controls visibility object
    const controls = {
      // Basic call controls
      accept: getAcceptButtonVisibility(isBrowser, isPhoneDevice, webRtcEnabled, isCall, isDigitalChannel),
      decline: getDeclineButtonVisibility(isBrowser, webRtcEnabled, isCall),
      end: getEndButtonVisibility(
        isBrowser,
        isEndCallEnabled,
        isCall,
        isHeld,
        isConsultInitiatedOrAcceptedOrBeingConsulted,
        isConferenceInProgress,
        isConsultInitiatedOrAccepted,
        consultCallHeld
      ),
      muteUnmute: getMuteUnmuteButtonVisibility(isBrowser, webRtcEnabled, isCall, isConsultInitiatedOrAccepted),
      holdResume: getHoldResumeButtonVisibility(
        telephonySupported,
        isCall,
        isConferenceInProgress,
        isConsultInProgress,
        isHeld,
        isBeingConsulted
      ),

      // Recording controls
      pauseResumeRecording: getPauseResumeRecordingButtonVisibility(
        telephonySupported,
        isCall,
        isConferenceInProgress,
        isConsultInitiatedOrAccepted
      ),
      recordingIndicator: getRecordingIndicatorVisibility(isCall),

      // Transfer and conference controls
      transfer: getTransferButtonVisibility(isTransferVisibility, isConferenceInProgress, isConsultInitiatedOrAccepted),
      conference: getConferenceButtonVisibility(isBrowser, webRtcEnabled, isCall, isChat, isBeingConsulted),
      exitConference: getExitConferenceButtonVisibility(
        isConferenceInProgress,
        isConsultInitiatedOrAccepted,
        consultCallHeld
      ),
      mergeConference: getMergeConferenceButtonVisibility(
        isConsultInitiatedOrAcceptedOnly,
        isConsultAccepted,
        consultCallHeld,
        isConferenceInProgress
      ),

      // Consult controls
      consult: getConsultButtonVisibility(
        telephonySupported,
        isCall,
        isConsultInProgress,
        isCustomerInCall,
        conferenceParticipantsCount,
        maxParticipantsInConference,
        isBeingConsulted
      ),
      endConsult: getEndConsultButtonVisibility(
        isEndConsultEnabled,
        telephonySupported,
        isCall,
        isConsultInitiatedOrAccepted
      ),
      consultTransfer: getConsultTransferButtonVisibility(
        isConsultInitiatedOrAcceptedOnly,
        isConsultAccepted,
        consultCallHeld,
        isConferenceInProgress
      ),
      consultTransferConsult: getConsultTransferConsultButtonVisibility(
        isConsultAccepted,
        isConsultInitiated,
        consultCallHeld
      ),
      mergeConferenceConsult: getMergeConferenceConsultButtonVisibility(
        isConsultAccepted,
        isConsultInitiated,
        consultCallHeld
      ),
      muteUnmuteConsult: getMuteUnmuteConsultButtonVisibility(
        isBrowser,
        webRtcEnabled,
        isCall,
        isConsultInitiatedOrAccepted,
        isConsultAccepted
      ),

      // Switch call controls
      switchToMainCall: getSwitchToMainCallButtonVisibility(
        isBeingConsulted,
        isConsultAccepted,
        isConsultInitiated,
        consultCallHeld
      ),
      switchToConsult: getSwitchToConsultButtonVisibility(isBeingConsulted, consultCallHeld),

      // Other controls
      wrapup: getWrapupButtonVisibility(task),

      // State flags
      isConferenceInProgress: getConferenceInProgressVisibility(task),
      isConsultInitiated,
      isConsultInitiatedAndAccepted: isConsultAccepted,
      isConsultReceived: isBeingConsulted,
      isConsultInitiatedOrAccepted: isConsultInitiatedOrAccepted,
      isHeld,
      consultCallHeld,
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
      pauseResumeRecording: defaultVisibility,
      recordingIndicator: defaultVisibility,
      transfer: defaultVisibility,
      conference: defaultVisibility,
      exitConference: defaultVisibility,
      mergeConference: defaultVisibility,
      consult: defaultVisibility,
      endConsult: defaultVisibility,
      consultTransfer: defaultVisibility,
      consultTransferConsult: defaultVisibility,
      mergeConferenceConsult: defaultVisibility,
      muteUnmuteConsult: defaultVisibility,
      switchToMainCall: defaultVisibility,
      switchToConsult: defaultVisibility,
      wrapup: {isVisible: false, isEnabled: true},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultReceived: false,
      isConsultInitiatedOrAccepted: false,
      isHeld: false,
      consultCallHeld: false,
    };
  }
}
