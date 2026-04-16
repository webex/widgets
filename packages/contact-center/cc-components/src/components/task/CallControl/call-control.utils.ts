import {CallControlMenuType} from '../task.types';
import type {CallControlButton, MEDIA_CHANNEL as MediaChannelType, MediaTypeInfo} from '../task.types';
import type {TaskUIControls} from '@webex/cc-store';
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
export const handleToggleHold = (isHeld: boolean, toggleHold: (hold: boolean) => void, logger: ILogger): void => {
  try {
    logger.info(`CC-Widgets: CallControl: is Call On Hold status is ${isHeld}`, {
      module: 'call-control.tsx',
      method: 'handletoggleHold',
    });
    toggleHold(!isHeld);
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
  allowParticipantsToInteract: boolean,
  agentMenuType: CallControlMenuType | null,
  consultCall: (id: string, type: DestinationType, allowParticipantsToInteract: boolean) => void,
  transferCall: (id: string, type: DestinationType) => void,
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
      consultCall(id, type, allowParticipantsToInteract);
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
  isRecording: boolean,
  isMuteButtonDisabled: boolean,
  currentMediaType: MediaTypeInfo,
  controls: TaskUIControls,
  isHeld: boolean,
  handleMuteToggleFunc: () => void,
  handleToggleHoldFunc: () => void,
  toggleRecording: () => void,
  endCall: () => void,
  exitConference: () => void,
  switchToConsult: () => void,
  onTransferConsult: () => void,
  handleConsultConferencePress: () => void,
  logger?: ILogger,
  conferenceEnabled = true
): CallControlButton[] => {
  try {
    const mainCtrl = controls?.main;
    return [
      {
        id: 'mute',
        icon: isMuted ? 'microphone-muted-bold' : 'microphone-bold',
        onClick: handleMuteToggleFunc,
        tooltip: isMuted ? UNMUTE_CALL : MUTE_CALL,
        className: `${isMuted ? 'call-control-button-muted' : 'call-control-button'}`,
        disabled: isMuteButtonDisabled,
        isVisible: mainCtrl?.mute?.isVisible ?? false,
        dataTestId: 'call-control:mute-toggle',
      },
      {
        id: 'switchToConsult',
        icon: 'call-swap-bold',
        tooltip: 'Switch to Consult Call',
        className: 'call-control-button',
        onClick: switchToConsult,
        disabled: !(mainCtrl?.switch?.isEnabled ?? false),
        isVisible: mainCtrl?.switch?.isVisible ?? false,
        dataTestId: 'call-control:switch-to-consult',
      },
      {
        id: 'hold',
        icon: isHeld ? 'play-bold' : 'pause-bold',
        onClick: handleToggleHoldFunc,
        tooltip: isHeld ? RESUME_CALL : HOLD_CALL,
        className: 'call-control-button',
        disabled: !(mainCtrl?.hold?.isEnabled ?? false),
        isVisible: mainCtrl?.hold?.isVisible ?? false,
        dataTestId: 'call-control:hold-toggle',
      },
      {
        id: 'consult',
        icon: 'headset-bold',
        tooltip: CONSULT_AGENT,
        className: 'call-control-button',
        disabled: !(mainCtrl?.consult?.isEnabled ?? false),
        menuType: 'Consult',
        isVisible: mainCtrl?.consult?.isVisible ?? false,
        dataTestId: 'call-control:consult',
      },
      {
        id: 'transferConsult',
        icon: 'next-bold',
        tooltip: 'Transfer',
        onClick: onTransferConsult || (() => {}),
        className: 'call-control-button',
        disabled: !(controls?.consult?.transfer?.isEnabled ?? false),
        isVisible: (controls?.consult?.transfer?.isVisible ?? false) && !!onTransferConsult,
      },
      {
        id: 'conference',
        icon: 'webex-teams-bold',
        tooltip: 'conference',
        onClick: handleConsultConferencePress || (() => {}),
        className: 'call-control-button',
        disabled: !(mainCtrl?.conference?.isEnabled ?? false),
        isVisible: conferenceEnabled && (mainCtrl?.conference?.isVisible ?? false) && !!handleConsultConferencePress,
      },
      {
        id: 'transfer',
        icon: 'next-bold',
        tooltip: `${TRANSFER} ${currentMediaType.labelName}`,
        className: 'call-control-button',
        disabled: !(mainCtrl?.transfer?.isEnabled ?? false),
        menuType: 'Transfer',
        isVisible: mainCtrl?.transfer?.isVisible ?? false,
        dataTestId: 'call-control:transfer',
      },
      {
        id: 'record',
        icon: isRecording ? 'record-paused-bold' : 'record-bold',
        onClick: toggleRecording,
        tooltip: isRecording ? PAUSE_RECORDING : RESUME_RECORDING,
        className: 'call-control-button',
        disabled: !(mainCtrl?.recording?.isEnabled ?? false),
        isVisible: mainCtrl?.recording?.isVisible ?? false,
        dataTestId: 'call-control:recording-toggle',
      },
      {
        id: 'exitConference',
        icon: 'exit-room-bold',
        tooltip: 'Exit Conference',
        className: 'call-control-button-muted',
        onClick: exitConference,
        disabled: !(mainCtrl?.exitConference?.isEnabled ?? false),
        isVisible: conferenceEnabled && (mainCtrl?.exitConference?.isVisible ?? false),
        dataTestId: 'call-control:exit-conference',
      },
      {
        id: 'end',
        icon: 'cancel-regular',
        onClick: endCall,
        tooltip: `${END} ${currentMediaType.labelName}`,
        className: 'call-control-button-cancel',
        disabled: !(mainCtrl?.end?.isEnabled ?? false),
        isVisible: mainCtrl?.end?.isVisible ?? false,
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
 * During consulting:
 * - Hide: hold, consult, and blind transfer buttons
 * - Respect SDK enabled/disabled state for consulting buttons (transferConsult, conference)
 *   They will be enabled when on main call, disabled when on consult call
 * - Show as-is: mute, switchToConsult, recording, exitConference, end
 */
export const filterButtonsForConsultation = (
  buttons: CallControlButton[],
  consultInitiated: boolean,
  isTelephony: boolean,
  logger?
): CallControlButton[] => {
  try {
    if (!consultInitiated || !isTelephony) {
      return buttons;
    }

    return buttons.filter((button) => !['hold', 'consult', 'transfer', 'record'].includes(button.id));
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
  setIsRecording: (recording: boolean) => void,
  logger?
): void => {
  try {
    if (!currentTask || !currentTask.data || !currentTask.data.interaction) return;

    const {interaction} = currentTask.data;
    const {callProcessingDetails} = interaction;

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

// Utility for consult-transfer-dial-number
export const onInputDialNumber = (e, setValue) => {
  setValue(e.currentTarget.value);
};

export const handleButtonPress = (logger, onButtonPress, value) => {
  logger.info('Dial Number button pressed', {
    module: 'consult-transfer-dial-number.tsx',
    method: 'handleButtonPress',
  });
  onButtonPress(value);
};
