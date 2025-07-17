import type {MEDIA_CHANNEL as MediaChannelType} from '../task.types';
import {getMediaTypeInfo} from '../../../utils';

export interface TaskComponentData {
  currentMediaType: {
    labelName: string;
    iconName: string;
    className: string;
    isBrandVisual: boolean;
  };
  isNonVoiceMedia: boolean;
  tooltipTriggerId: string;
  tooltipId: string;
  titleClassName: string;
  shouldShowState: boolean;
  shouldShowQueue: boolean;
  shouldShowHandleTime: boolean;
  shouldShowTimeLeft: boolean;
  capitalizedState: string;
  capitalizedQueue: string;
}

/**
 * Capitalizes the first word of a string
 * @param str - The string to capitalize
 * @returns The string with the first word capitalized
 */
export const capitalizeFirstWord = (str: string): string => {
  return str.replace(/^\s*(\w)/, (match, firstLetter) => firstLetter.toUpperCase());
};

/**
 * Gets the correct CSS class name for the task title
 * @param isNonVoiceMedia - Whether the media type is non-voice
 * @param isIncomingTask - Whether this is an incoming task
 * @returns The appropriate CSS class name
 */
export const getTitleClassName = (isNonVoiceMedia: boolean, isIncomingTask: boolean): string => {
  if (isNonVoiceMedia && isIncomingTask) {
    return 'incoming-digital-task-title';
  }
  if (isNonVoiceMedia && !isIncomingTask) {
    return 'task-digital-title';
  }
  return 'task-title';
};

/**
 * Creates unique IDs for tooltip elements
 * @param interactionId - The interaction ID
 * @returns Object with tooltip trigger and tooltip IDs
 */
export const createTooltipIds = (interactionId?: string) => {
  return {
    tooltipTriggerId: `tooltip-trigger-${interactionId}`,
    tooltipId: `tooltip-${interactionId}`,
  };
};

/**
 * Determines if the state should be shown
 * @param state - The task state
 * @param isIncomingTask - Whether this is an incoming task
 * @returns Whether to show the state
 */
export const shouldShowState = (state?: string, isIncomingTask?: boolean): boolean => {
  return Boolean(state && !isIncomingTask);
};

/**
 * Determines if the queue should be shown
 * @param queue - The queue name
 * @param isIncomingTask - Whether this is an incoming task
 * @returns Whether to show the queue
 */
export const shouldShowQueue = (queue?: string, isIncomingTask?: boolean): boolean => {
  return Boolean(queue && isIncomingTask);
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
  startTimeStamp?: number
): boolean => {
  if (!startTimeStamp) return false;
  return (isIncomingTask && !ronaTimeout) || !isIncomingTask;
};

/**
 * Determines if time left should be shown
 * @param isIncomingTask - Whether this is an incoming task
 * @param ronaTimeout - The RONA timeout value
 * @returns Whether to show time left
 */
export const shouldShowTimeLeft = (isIncomingTask?: boolean, ronaTimeout?: number): boolean => {
  return Boolean(isIncomingTask && ronaTimeout);
};

/**
 * Gets the task list item CSS classes
 * @param selected - Whether the task is selected
 * @param styles - Additional styles
 * @returns The combined CSS class string
 */
export const getTaskListItemClasses = (selected?: boolean, styles?: string): string => {
  const baseClass = 'task-list-item';
  const selectedClass = selected ? 'task-list-item--selected' : '';
  const additionalStyles = styles || '';

  return `${baseClass} ${selectedClass} ${additionalStyles}`.trim();
};

/**
 * Extracts and processes all data needed for rendering the Task component
 * @param props - The Task component props
 * @returns Processed task data with computed values
 */
export const extractTaskComponentData = ({
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
}): TaskComponentData => {
  // Get media type information
  const currentMediaType = getMediaTypeInfo(mediaType, mediaChannel);
  const isNonVoiceMedia = currentMediaType.labelName !== 'Call';

  // Create tooltip IDs
  const {tooltipTriggerId, tooltipId} = createTooltipIds(interactionId);

  // Get title CSS class
  const titleClassName = getTitleClassName(isNonVoiceMedia, isIncomingTask);

  // Determine what elements should be shown
  const shouldShowStateElement = shouldShowState(state, isIncomingTask);
  const shouldShowQueueElement = shouldShowQueue(queue, isIncomingTask);
  const shouldShowHandleTimeElement = shouldShowHandleTime(isIncomingTask, ronaTimeout, startTimeStamp);
  const shouldShowTimeLeftElement = shouldShowTimeLeft(isIncomingTask, ronaTimeout);

  // Capitalize text values
  const capitalizedState = state ? capitalizeFirstWord(state) : '';
  const capitalizedQueue = queue ? capitalizeFirstWord(queue) : '';

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
};
