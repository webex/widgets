import {ITask} from '@webex/plugin-cc';
import {MediaType, MediaInfo} from '../task.types';

/**
 * This function determines the visibility of various controls based on the task's data.
 * @param task The task object
 * @returns An object containing the visibility of various controls based on the task's data
 */
export function getControlsVisibility(deviceType: string, featureFlags: {[key: string]: boolean}, task: ITask) {
  const {mediaType} = task?.data?.interaction || {};

  const isCall = mediaType === MediaType.Telephony;
  const isChat = mediaType === MediaType.Chat;
  const isEmail = mediaType === MediaType.Email;

  const isBrowser = deviceType === 'BROWSER';
  const isAgentDN = deviceType === 'AGENT_DN';
  const isExtension = deviceType === 'EXTENSION';

  const {isEndCallEnabled, isEndConsultEnabled, webRtcEnabled} = featureFlags;

  const controls = {
    accept:
      (isBrowser && ((webRtcEnabled && isCall) || isChat || isEmail)) ||
      (isAgentDN && (isChat || isEmail)) ||
      (isExtension && (isChat || isEmail)),
    decline: isBrowser && webRtcEnabled && isCall,
    end: (isEndCallEnabled && isCall) || !isCall,
    muteUnmute: isBrowser && webRtcEnabled && isCall,

    holdResume: isCall && ((isBrowser && webRtcEnabled) || isAgentDN || isExtension), // Applicable for all type of station login
    consult: isCall && ((isBrowser && webRtcEnabled) || isAgentDN || isExtension), // Applicable for all type of station login
    transfer: isBrowser ? webRtcEnabled : true, // Applicable for all type of station login and media type

    conference: (isBrowser && isCall && webRtcEnabled) || isChat, // This needs further testing after we add support
    wrapup: task?.data?.wrapUpRequired ?? false, // Applicable for all type of station login and media type and getting actual value from task data
    pauseResumeRecording: isCall && ((isBrowser && webRtcEnabled) || isAgentDN || isExtension), // Getting feature flag (isRecordingManagementEnabled) value as undefined, need further testing
    endConsult: isEndConsultEnabled && isCall && ((isBrowser && webRtcEnabled) || isAgentDN || isExtension),
    recordingIndicator: isCall,
  };

  return controls;
}

/**
 * This function returns the icon name and corresponding CSS class for a given media type.
 * @param mediaType The type of media (MediaType enum: Telephony, Email, or Chat)
 * @returns An object containing the iconName and className based on the media type
 */
export const getMediaIconInfo = (mediaType: string): MediaInfo => {
  switch (mediaType) {
    case MediaType.Telephony:
      return {
        iconName: 'handset-filled',
        className: MediaType.Telephony,
      };
    case MediaType.Email:
      return {
        iconName: 'email-filled',
        className: MediaType.Email,
      };
    case MediaType.Chat:
      return {
        iconName: 'chat-filled',
        className: MediaType.Chat,
      };
    default:
      throw new Error(`Unsupported media type: ${mediaType}`);
  }
};

/**
 * This function returns a display label string corresponding to the specified media type.
 * @param mediaType The type of media (MediaType enum: Telephony, Chat, or Email)
 * @returns A string label corresponding to the media type, or 'Unknown' if not recognized
 */
export const getMediaLabel = (mediaType: string): string => {
  switch (mediaType) {
    case MediaType.Telephony:
      return 'Call';
    case MediaType.Chat:
      return 'Chat';
    case MediaType.Email:
      return 'Email';
    default:
      return 'Unknown';
  }
};
