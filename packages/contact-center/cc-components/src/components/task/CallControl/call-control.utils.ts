import {CallControlMenuType} from '../task.types';
import type {
  CallControlButton,
  ControlVisibility,
  MEDIA_CHANNEL as MediaChannelType,
  MediaTypeInfo,
} from '../task.types';
import {getMediaTypeInfo} from '../../../utils';
import {DestinationType, ILogger, ITask} from '@webex/cc-store';
import {
  RESUME_CALL,
  HOLD_CALL,
  CONSULT_AGENT,
  TRANSFER,
  PAUSE_RECORDING,
  RESUME_RECORDING,
  END,
  MUTE_CALL,
  UNMUTE_CALL,
} from '../constants';

/**
 * Handles toggle hold functionality
 */
export const handleToggleHold = (
  isHeld: boolean,
  toggleHold: (hold: boolean) => void,
  setIsHeld: (held: boolean) => void,
  logger: ILogger
): void => {
  try {
    logger.info(`CC-Widgets: CallControl: is Call On Hold status is ${isHeld}`, {
      module: 'call-control.tsx',
      method: 'handletoggleHold',
    });
    toggleHold(!isHeld);
    setIsHeld(!isHeld);
  } catch (error) {
    logger?.error(`CC-Widgets: CallControl: Error in handleToggleHold - ${error.message}`);
  }
};

/**
 * Handles mute toggle functionality with disabled state management
 */
export const handleMuteToggle = (
  toggleMute: () => void,
  setIsMuteButtonDisabled: (disabled: boolean) => void,
  logger: ILogger
): void => {
  setIsMuteButtonDisabled(true);

  try {
    toggleMute();
  } catch (error) {
    logger.error(`Mute toggle failed: ${error}`, {
      module: 'call-control.tsx',
      method: 'handleMuteToggle',
    });
  } finally {
    // Re-enable button after operation
    setTimeout(() => {
      setIsMuteButtonDisabled(false);
    }, 500);
  }
};

/**
 * Handles wrapup call submission
 */
export const handleWrapupCall = (
  selectedWrapupReason: string | null,
  selectedWrapupId: string | null,
  wrapupCall: (reason: string, id: string) => void,
  setSelectedWrapupReason: (reason: string | null) => void,
  setSelectedWrapupId: (id: string | null) => void,
  logger: ILogger
): void => {
  logger.info('CC-Widgets: CallControl: wrap-up submitted', {
    module: 'call-control.tsx',
    method: 'handleWrapupCall',
  });
  if (selectedWrapupReason && selectedWrapupId) {
    wrapupCall(selectedWrapupReason, selectedWrapupId);
    setSelectedWrapupReason(null);
    setSelectedWrapupId(null);
    logger.log('CC-Widgets: CallControl: wrapup completed', {
      module: 'call-control.tsx',
      method: 'handleWrapupCall',
    });
  }
};

/**
 * Handles wrapup reason change
 */
export const handleWrapupChange = (
  text: string,
  value: string,
  setSelectedWrapupReason: (reason: string) => void,
  setSelectedWrapupId: (id: string) => void,
  logger?
): void => {
  try {
    setSelectedWrapupReason(text);
    setSelectedWrapupId(value);
  } catch (error) {
    logger?.error('CC-Widgets: CallControl: Error in handleWrapupChange', {
      module: 'cc-components#call-control.utils.ts',
      method: 'handleWrapupChange',
      error: error.message,
    });
  }
};

/**
 * Handles target selection for consult/transfer
 */
export const handleTargetSelect = (
  id: string,
  name: string,
  type: DestinationType,
  agentMenuType: CallControlMenuType | null,
  consultCall: (id: string, type: DestinationType) => void,
  transferCall: (id: string, type: DestinationType) => void,
  setConsultAgentId: (id: string) => void,
  setConsultAgentName: (name: string) => void,
  setLastTargetType: (type: DestinationType) => void,
  logger: ILogger
): void => {
  logger.info('CC-Widgets: CallControl: handling target agent selected', {
    module: 'call-control.tsx',
    method: 'handleTargetSelect',
  });
  if (agentMenuType === 'Consult') {
    try {
      consultCall(id, type);
      setConsultAgentId(id);
      setConsultAgentName(name);
      setLastTargetType(type);
    } catch (error) {
      logger.error(`Error during consult call: ${error}`, {
        module: 'call-control.tsx',
        method: 'handleTargetSelect',
      });
      throw new Error('Error during consult call');
    }
  } else if (agentMenuType === 'Transfer') {
    try {
      transferCall(id, type);
    } catch (error) {
      logger.error(`Error during transfer call: ${error}`, {
        module: 'call-control.tsx',
        method: 'handleTargetSelect',
      });
      throw new Error('Error during transfer call');
    }
  }
};

/**
 * Gets the media type information
 */
export const getMediaType = (mediaType: MediaChannelType, mediaChannel: MediaChannelType, logger?): MediaTypeInfo => {
  try {
    return getMediaTypeInfo(mediaType, mediaChannel);
  } catch (error) {
    logger?.error('CC-Widgets: CallControl: Error in getMediaType', {
      module: 'cc-components#call-control.utils.ts',
      method: 'getMediaType',
      error: error.message,
    });
    // Return safe default
    return {
      labelName: 'Call',
    };
  }
};

/**
 * Checks if the media type is telephony
 */
export const isTelephonyMediaType = (mediaType: MediaChannelType, logger?): boolean => {
  try {
    return mediaType === 'telephony';
  } catch (error) {
    logger?.error('CC-Widgets: CallControl: Error in isTelephonyMediaType', {
      module: 'cc-components#call-control.utils.ts',
      method: 'isTelephonyMediaType',
      error: error.message,
    });
    return false; // Default safe fallback
  }
};

/**
 * Builds the call control buttons configuration
 */
export const buildCallControlButtons = (
  isMuted: boolean,
  isHeld: boolean,
  isRecording: boolean,
  isMuteButtonDisabled: boolean,
  currentMediaType: MediaTypeInfo,
  controlVisibility: ControlVisibility,
  handleMuteToggleFunc: () => void,
  handleToggleHoldFunc: () => void,
  toggleRecording: () => void,
  endCall: () => void,
  logger?
): CallControlButton[] => {
  try {
    return [
      {
        id: 'mute',
        icon: isMuted ? 'microphone-muted-bold' : 'microphone-bold',
        onClick: handleMuteToggleFunc,
        tooltip: isMuted ? UNMUTE_CALL : MUTE_CALL,
        className: `${isMuted ? 'call-control-button-muted' : 'call-control-button'}`,
        disabled: isMuteButtonDisabled,
        isVisible: controlVisibility.muteUnmute,
        dataTestId: 'call-control:mute-toggle',
      },
      {
        id: 'hold',
        icon: isHeld ? 'play-bold' : 'pause-bold',
        onClick: handleToggleHoldFunc,
        tooltip: isHeld ? RESUME_CALL : HOLD_CALL,
        className: 'call-control-button',
        disabled: false,
        isVisible: controlVisibility.holdResume,
        dataTestId: 'call-control:hold-toggle',
      },
      {
        id: 'consult',
        icon: 'headset-bold',
        tooltip: CONSULT_AGENT,
        className: 'call-control-button',
        disabled: false,
        menuType: 'Consult',
        isVisible: controlVisibility.consult,
        dataTestId: 'call-control:consult',
      },
      {
        id: 'transfer',
        icon: 'next-bold',
        tooltip: `${TRANSFER} ${currentMediaType.labelName}`,
        className: 'call-control-button',
        disabled: false,
        menuType: 'Transfer',
        isVisible: controlVisibility.transfer,
        dataTestId: 'call-control:transfer',
      },
      {
        id: 'record',
        icon: isRecording ? 'record-paused-bold' : 'record-bold',
        onClick: toggleRecording,
        tooltip: isRecording ? PAUSE_RECORDING : RESUME_RECORDING,
        className: 'call-control-button',
        disabled: false,
        isVisible: controlVisibility.pauseResumeRecording,
        dataTestId: 'call-control:recording-toggle',
      },
      {
        id: 'end',
        icon: 'cancel-regular',
        onClick: endCall,
        tooltip: `${END} ${currentMediaType.labelName}`,
        className: 'call-control-button-cancel',
        disabled: isHeld,
        isVisible: controlVisibility.end,
        dataTestId: 'call-control:end-call',
      },
    ];
  } catch (error) {
    logger?.error('CC-Widgets: CallControl: Error in buildCallControlButtons', {
      module: 'cc-components#call-control.utils.ts',
      method: 'buildCallControlButtons',
      error: error.message,
    });
    // Return minimal safe default buttons
    return [];
  }
};

/**
 * Filters buttons based on consultation state
 */
export const filterButtonsForConsultation = (
  buttons: CallControlButton[],
  consultInitiated: boolean,
  isTelephony: boolean,
  logger?
): CallControlButton[] => {
  try {
    return consultInitiated && isTelephony
      ? buttons.filter((button) => !['hold', 'consult'].includes(button.id))
      : buttons;
  } catch (error) {
    logger?.error('CC-Widgets: CallControl: Error in filterButtonsForConsultation', {
      module: 'cc-components#call-control.utils.ts',
      method: 'filterButtonsForConsultation',
      error: error.message,
    });
    // Return original buttons as safe fallback
    return buttons || [];
  }
};

/**
 * Updates call state from current task data
 */
export const updateCallStateFromTask = (
  currentTask: ITask,
  setIsHeld: (held: boolean) => void,
  setIsRecording: (recording: boolean) => void,
  logger?
): void => {
  try {
    if (!currentTask || !currentTask.data || !currentTask.data.interaction) return;

    const {interaction, mediaResourceId} = currentTask.data;
    const {media, callProcessingDetails} = interaction;
    const isHold = media && media[mediaResourceId] && media[mediaResourceId].isHold;
    setIsHeld(isHold);

    if (callProcessingDetails) {
      const {isPaused} = callProcessingDetails;
      setIsRecording(!isPaused);
    }
  } catch (error) {
    logger?.error('CC-Widgets: CallControl: Error in updateCallStateFromTask', {
      module: 'cc-components#call-control.utils.ts',
      method: 'updateCallStateFromTask',
      error: error.message,
    });
  }
};

/**
 * Handles close button press for popover components
 */
export const handleCloseButtonPress = (
  setShowAgentMenu: (show: boolean) => void,
  setAgentMenuType: (type: CallControlMenuType | null) => void,
  logger?
): void => {
  try {
    setShowAgentMenu(false);
    setAgentMenuType(null);
  } catch (error) {
    logger?.error('CC-Widgets: CallControl: Error in handleCloseButtonPress', {
      module: 'cc-components#call-control.utils.ts',
      method: 'handleCloseButtonPress',
      error: error.message,
    });
  }
};

/**
 * Handles wrapup reason selection change event
 */
export const handleWrapupReasonChange = (
  event: CustomEvent,
  wrapupCodes: Array<{id: string; name: string}> | undefined,
  handleWrapupChange: (text: string, value: string, logger?) => void,
  logger?
): void => {
  try {
    const key = event.detail.value;
    const selectedItem = wrapupCodes?.find((code) => code.id === key);
    if (selectedItem) {
      handleWrapupChange(selectedItem.name, selectedItem.id, logger);
    }
  } catch (error) {
    logger?.error('CC-Widgets: CallControl: Error in handleWrapupReasonChange', {
      module: 'cc-components#call-control.utils.ts',
      method: 'handleWrapupReasonChange',
      error: error.message,
    });
  }
};

/**
 * Handles audio element ref assignment
 */
export const handleAudioRef = (
  audioElement: HTMLAudioElement | null,
  callControlAudio: MediaStream | null,
  logger?
): void => {
  try {
    if (audioElement && callControlAudio) {
      audioElement.srcObject = callControlAudio;
    }
  } catch (error) {
    logger?.error('CC-Widgets: CallControl: Error in handleAudioRef', {
      module: 'cc-components#call-control.utils.ts',
      method: 'handleAudioRef',
      error: error.message,
    });
  }
};
