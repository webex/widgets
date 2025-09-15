import {ILogger} from '@webex/cc-store';
import {ITask} from '@webex/contact-center';

/**
 * This function determines the visibility of various controls based on the task's data.
 * @param task The task object
 * @returns An object containing the visibility of various controls based on the task's data
 */
export function getControlsVisibility(
  deviceType: string,
  featureFlags: {[key: string]: boolean},
  task: ITask,
  logger?: ILogger
) {
  try {
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
      decline: isBrowser && webRtcEnabled && isCall,
      end: isBrowser || (isEndCallEnabled && isCall) || !isCall,
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
  } catch (error) {
    logger?.error(`CC-Widgets: Task: Error in getControlsVisibility - ${error.message}`, {
      module: 'task-util',
      method: 'getControlsVisibility',
    });
    // Return safe default controls
    return {
      accept: false,
      decline: false,
      end: false,
      muteUnmute: false,
      holdResume: false,
      consult: false,
      transfer: false,
      conference: false,
      wrapup: false,
      pauseResumeRecording: false,
      endConsult: false,
      recordingIndicator: false,
    };
  }
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
