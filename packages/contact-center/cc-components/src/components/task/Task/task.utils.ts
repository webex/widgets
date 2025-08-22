import type {MEDIA_CHANNEL as MediaChannelType, TaskComponentData} from '../task.types';
import {getMediaTypeInfo} from '../../../utils';

/**
 * Capitalizes the first word of a string
 * @param str - The string to capitalize
 * @returns The string with the first word capitalized
 */
export const capitalizeFirstWord = (str: string, logger?): string => {
  try {
    return str.replace(/^\s*(\w)/, (match, firstLetter) => firstLetter.toUpperCase());
  } catch (error) {
    logger?.error('CC-Widgets: Task: Error in capitalizeFirstWord', {
      module: 'cc-components#task.utils.ts',
      method: 'capitalizeFirstWord',
      error: error.message,
    });
    // Return original string as safe fallback
    return str || '';
  }
};

/**
 * Gets the correct CSS class name for the task title
 * @param isNonVoiceMedia - Whether the media type is non-voice
 * @param isIncomingTask - Whether this is an incoming task
 * @returns The appropriate CSS class name
 */
export const getTitleClassName = (isNonVoiceMedia: boolean, isIncomingTask: boolean, logger?): string => {
  try {
    if (isNonVoiceMedia && isIncomingTask) {
      return 'incoming-digital-task-title';
    }
    if (isNonVoiceMedia && !isIncomingTask) {
      return 'task-digital-title';
    }
    return 'task-title';
  } catch (error) {
    logger?.error('CC-Widgets: Task: Error in getTitleClassName', {
      module: 'cc-components#task.utils.ts',
      method: 'getTitleClassName',
      error: error.message,
    });
    // Return safe default
    return 'task-title';
  }
};

/**
 * Creates unique IDs for tooltip elements
 * @param interactionId - The interaction ID
 * @returns Object with tooltip trigger and tooltip IDs
 */
export const createTooltipIds = (interactionId?: string, logger?) => {
  try {
    return {
      tooltipTriggerId: `tooltip-trigger-${interactionId}`,
      tooltipId: `tooltip-${interactionId}`,
    };
  } catch (error) {
    logger?.error('CC-Widgets: Task: Error in createTooltipIds', {
      module: 'cc-components#task.utils.ts',
      method: 'createTooltipIds',
      error: error.message,
    });
    // Return safe default
    return {
      tooltipTriggerId: 'tooltip-trigger-default',
      tooltipId: 'tooltip-default',
    };
  }
};

/**
 * Determines if the state should be shown
 * @param state - The task state
 * @param isIncomingTask - Whether this is an incoming task
 * @returns Whether to show the state
 */
export const shouldShowState = (state?: string, isIncomingTask?: boolean, logger?): boolean => {
  try {
    return Boolean(state && !isIncomingTask);
  } catch (error) {
    logger?.error('CC-Widgets: Task: Error in shouldShowState', {
      module: 'cc-components#task.utils.ts',
      method: 'shouldShowState',
      error: error.message,
    });
    // Return safe default
    return false;
  }
};

/**
 * Determines if the queue should be shown
 * @param queue - The queue name
 * @param isIncomingTask - Whether this is an incoming task
 * @returns Whether to show the queue
 */
export const shouldShowQueue = (queue?: string, isIncomingTask?: boolean, logger?): boolean => {
  try {
    return Boolean(queue && isIncomingTask);
  } catch (error) {
    logger?.error('CC-Widgets: Task: Error in shouldShowQueue', {
      module: 'cc-components#task.utils.ts',
      method: 'shouldShowQueue',
      error: error.message,
    });
    // Return safe default
    return false;
  }
};

/**
 * Determines if handle time should be shown
 * @param isIncomingTask - Whether this is an incoming task
 * @param ronaTimeout - The RONA timeout value
 * @param startTimeStamp - The start timestamp
 * @returns Whether to show handle time
 */
export const shouldShowHandleTime = (
  isIncomingTask?: boolean,
  ronaTimeout?: number,
  startTimeStamp?: number,
  logger?
): boolean => {
  try {
    if (!startTimeStamp) return false;
    return (isIncomingTask && !ronaTimeout) || !isIncomingTask;
  } catch (error) {
    logger?.error('CC-Widgets: Task: Error in shouldShowHandleTime', {
      module: 'cc-components#task.utils.ts',
      method: 'shouldShowHandleTime',
      error: error.message,
    });
    // Return safe default
    return false;
  }
};

/**
 * Determines if time left should be shown
 * @param isIncomingTask - Whether this is an incoming task
 * @param ronaTimeout - The RONA timeout value
 * @returns Whether to show time left
 */
export const shouldShowTimeLeft = (isIncomingTask?: boolean, ronaTimeout?: number, logger?): boolean => {
  try {
    return Boolean(isIncomingTask && ronaTimeout);
  } catch (error) {
    logger?.error('CC-Widgets: Task: Error in shouldShowTimeLeft', {
      module: 'cc-components#task.utils.ts',
      method: 'shouldShowTimeLeft',
      error: error.message,
    });
    // Return safe default
    return false;
  }
};

/**
 * Gets the task list item CSS classes
 * @param selected - Whether the task is selected
 * @param styles - Additional styles
 * @returns The combined CSS class string
 */
export const getTaskListItemClasses = (selected?: boolean, styles?: string, logger?): string => {
  try {
    const baseClass = 'task-list-item';
    const selectedClass = selected ? 'task-list-item--selected' : '';
    const additionalStyles = styles || '';

    return `${baseClass} ${selectedClass} ${additionalStyles}`.trim();
  } catch (error) {
    logger?.error('CC-Widgets: Task: Error in getTaskListItemClasses', {
      module: 'cc-components#task.utils.ts',
      method: 'getTaskListItemClasses',
      error: error.message,
    });
    // Return safe default
    return 'task-list-item';
  }
};

/**
 * Extracts and processes all data needed for rendering the Task component
 * @param props - The Task component props
 * @returns Processed task data with computed values
 */
export const extractTaskComponentData = (
  {
    mediaType,
    mediaChannel,
    isIncomingTask = false,
    interactionId,
    state,
    queue,
    ronaTimeout,
    startTimeStamp,
  }: {
    mediaType?: MediaChannelType;
    mediaChannel?: MediaChannelType;
    isIncomingTask?: boolean;
    interactionId?: string;
    state?: string;
    queue?: string;
    ronaTimeout?: number;
    startTimeStamp?: number;
    acceptText?: string;
    declineText?: string;
  },
  logger?
): TaskComponentData => {
  try {
    // Get media type information
    const currentMediaType = getMediaTypeInfo(mediaType, mediaChannel);
    const isNonVoiceMedia = currentMediaType.labelName !== 'Call';

    // Create tooltip IDs
    const {tooltipTriggerId, tooltipId} = createTooltipIds(interactionId, logger);

    // Get title CSS class
    const titleClassName = getTitleClassName(isNonVoiceMedia, isIncomingTask, logger);

    // Determine what elements should be shown
    const shouldShowStateElement = shouldShowState(state, isIncomingTask, logger);
    const shouldShowQueueElement = shouldShowQueue(queue, isIncomingTask, logger);
    const shouldShowHandleTimeElement = shouldShowHandleTime(isIncomingTask, ronaTimeout, startTimeStamp, logger);
    const shouldShowTimeLeftElement = shouldShowTimeLeft(isIncomingTask, ronaTimeout, logger);

    // Capitalize text values
    const capitalizedState = state ? capitalizeFirstWord(state, logger) : '';
    const capitalizedQueue = queue ? capitalizeFirstWord(queue, logger) : '';

    return {
      currentMediaType,
      isNonVoiceMedia,
      tooltipTriggerId,
      tooltipId,
      titleClassName,
      shouldShowState: shouldShowStateElement,
      shouldShowQueue: shouldShowQueueElement,
      shouldShowHandleTime: shouldShowHandleTimeElement,
      shouldShowTimeLeft: shouldShowTimeLeftElement,
      capitalizedState,
      capitalizedQueue,
    };
  } catch (error) {
    logger?.error('CC-Widgets: Task: Error in extractTaskComponentData', {
      module: 'cc-components#task.utils.ts',
      method: 'extractTaskComponentData',
      error: error.message,
    });
    // Return safe default
    const defaultMediaType = {
      labelName: 'Call',
      className: 'telephony-media-type',
      isBrandVisual: false,
      iconName: 'call-bold',
    };
    return {
      currentMediaType: defaultMediaType,
      isNonVoiceMedia: false,
      tooltipTriggerId: 'tooltip-trigger-default',
      tooltipId: 'tooltip-default',
      titleClassName: 'task-title',
      shouldShowState: false,
      shouldShowQueue: false,
      shouldShowHandleTime: false,
      shouldShowTimeLeft: false,
      capitalizedState: '',
      capitalizedQueue: '',
    };
  }
};
