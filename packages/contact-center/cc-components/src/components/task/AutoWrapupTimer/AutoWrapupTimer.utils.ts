import {TimerUIState} from '../task.types';

/**
 * Determines if the timer is in urgent state (10 seconds or less)
 */
export const isTimerUrgent = (secondsUntilAutoWrapup: number): boolean => {
  return secondsUntilAutoWrapup <= 10;
};

/**
 * Gets the appropriate container CSS class based on urgency
 */
export const getContainerClassName = (isUrgent: boolean): string => {
  return isUrgent ? 'wrapup-timer-container urgent' : 'wrapup-timer-container';
};

/**
 * Gets the appropriate icon CSS class based on urgency
 */
export const getIconClassName = (isUrgent: boolean): string => {
  return isUrgent ? 'wrapup-timer-icon urgent' : 'wrapup-timer-icon';
};

/**
 * Gets the appropriate icon name based on urgency
 */
export const getIconName = (isUrgent: boolean): string => {
  return isUrgent ? 'alert-active-bold' : 'recents-bold';
};

/**
 * Formats seconds into MM:SS format
 */
export const formatTimerDisplay = (secondsUntilAutoWrapup: number): string => {
  const minutes = Math.floor(secondsUntilAutoWrapup / 60);
  const seconds = secondsUntilAutoWrapup % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Gets all timer-related UI state in one object
 */

export const getTimerUIState = (secondsUntilAutoWrapup: number): TimerUIState => {
  const isUrgent = isTimerUrgent(secondsUntilAutoWrapup);

  return {
    isUrgent,
    containerClassName: getContainerClassName(isUrgent),
    iconClassName: getIconClassName(isUrgent),
    iconName: getIconName(isUrgent),
    formattedTime: formatTimerDisplay(secondsUntilAutoWrapup),
  };
};
