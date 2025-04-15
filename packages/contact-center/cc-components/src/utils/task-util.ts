import {ITask} from '@webex/plugin-cc';

/**
 * This function determines the visibility of various controls based on the task's data.
 * @param task The task object
 * @returns An object containing the visibility of various controls based on the task's data
 */
export function getControlsVisibility(deviceType: string, featureFlags: {[key: string]: boolean}, task: ITask) {
  const {mediaType} = task?.data?.interaction || {};

  const isCall = mediaType === 'telephony';
  const isChat = mediaType === 'chat';
  const isEmail = mediaType === 'email';

  const isBrowser = deviceType === 'BROWSER';
  const isAgentDN = deviceType === 'AGENT_DN';
  const isExtension = deviceType === 'EXTENSION';

  const {isEndCallEnabled, isEndConsultEnabled, webRtcEnabled} = featureFlags;

  const controls = {
    accept:
      (isBrowser && ((webRtcEnabled && isCall) || isChat || isEmail)) ||
      (isAgentDN && (isChat || isEmail)) ||
      (isExtension && (isChat || isEmail)),
    decline: webRtcEnabled && isBrowser && isCall,
    end:
      isEndCallEnabled &&
      ((isBrowser && ((webRtcEnabled && isCall) || isChat || isEmail)) ||
        (isAgentDN && (isChat || isEmail)) ||
        (isExtension && (isChat || isEmail))),
    muteUnmute: webRtcEnabled && isBrowser && isCall,

    holdResume: isCall && ((isBrowser && webRtcEnabled) || isAgentDN || isExtension), // Applicable for all type of station login
    consult: isCall && ((isBrowser && webRtcEnabled) || isAgentDN || isExtension), // Applicable for all type of station login
    transfer: isBrowser ? webRtcEnabled : true, // Applicable for all type of station login and media type

    conference: (isBrowser && isCall && webRtcEnabled) || isChat, // This needs further testing after we add support
    wrapup: true, // Applicable for all type of station login and media type
    pauseResumeRecording: isBrowser && isCall && webRtcEnabled, // Getting feature flag (isRecordingManagementEnabled) value as undefined, need further testing
    endConsult: isEndConsultEnabled && ((isBrowser && webRtcEnabled) || isAgentDN || isExtension),
  };

  return controls;
}
