import {TimerUIState} from '../task.types';

/**
 * Determines if the timer is in urgent state (10 seconds or less)
 */
export const isTimerUrgent = (secondsUntilAutoWrapup: number, logger?): boolean => {
  try {
    return secondsUntilAutoWrapup <= 10;
  } catch (error) {
    logger?.error('CC-Widgets: AutoWrapupTimer: Error in isTimerUrgent', {
      module: 'cc-components#AutoWrapupTimer.utils.ts',
      method: 'isTimerUrgent',
      error: error.message,
    });
    return false; // Default safe fallback
  }
};

/**
 * Gets the appropriate container CSS class based on urgency
 */
export const getContainerClassName = (isUrgent: boolean, logger?): string => {
  try {
    return isUrgent ? 'wrapup-timer-container urgent' : 'wrapup-timer-container';
  } catch (error) {
    logger?.error('CC-Widgets: AutoWrapupTimer: Error in getContainerClassName', {
      module: 'cc-components#AutoWrapupTimer.utils.ts',
      method: 'getContainerClassName',
      error: error.message,
    });
    return 'wrapup-timer-container'; // Default safe fallback
  }
};

/**
 * Gets the appropriate icon CSS class based on urgency
 */
export const getIconClassName = (isUrgent: boolean, logger?): string => {
  try {
    return isUrgent ? 'wrapup-timer-icon urgent' : 'wrapup-timer-icon';
  } catch (error) {
    logger?.error('CC-Widgets: AutoWrapupTimer: Error in getIconClassName', {
      module: 'cc-components#AutoWrapupTimer.utils.ts',
      method: 'getIconClassName',
      error: error.message,
    });
    return 'wrapup-timer-icon'; // Default safe fallback
  }
};

/**
 * Gets the appropriate icon name based on urgency
 */
export const getIconName = (isUrgent: boolean, logger?): string => {
  try {
    return isUrgent ? 'alert-active-bold' : 'recents-bold';
  } catch (error) {
    logger?.error('CC-Widgets: AutoWrapupTimer: Error in getIconName', {
      module: 'cc-components#AutoWrapupTimer.utils.ts',
      method: 'getIconName',
      error: error.message,
    });
    return 'recents-bold'; // Default safe fallback
  }
};

/**
 * Formats seconds into MM:SS format
 */
export const formatTimerDisplay = (secondsUntilAutoWrapup: number, logger?): string => {
  try {
    const minutes = Math.floor(secondsUntilAutoWrapup / 60);
    const seconds = secondsUntilAutoWrapup % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } catch (error) {
    logger?.error('CC-Widgets: AutoWrapupTimer: Error in formatTimerDisplay', {
      module: 'cc-components#AutoWrapupTimer.utils.ts',
      method: 'formatTimerDisplay',
      error: error.message,
    });
    return '00:00'; // Default safe fallback
  }
};

/**
 * Gets all timer-related UI state in one object
 */

export const getTimerUIState = (secondsUntilAutoWrapup: number, logger?): TimerUIState => {
  try {
    const isUrgent = isTimerUrgent(secondsUntilAutoWrapup, logger);

    return {
      isUrgent,
      containerClassName: getContainerClassName(isUrgent, logger),
      iconClassName: getIconClassName(isUrgent, logger),
      iconName: getIconName(isUrgent, logger),
      formattedTime: formatTimerDisplay(secondsUntilAutoWrapup, logger),
    };
  } catch (error) {
    logger?.error('CC-Widgets: AutoWrapupTimer: Error in getTimerUIState', {
      module: 'cc-components#AutoWrapupTimer.utils.ts',
      method: 'getTimerUIState',
      error: error.message,
    });
    // Return safe default state
    return {
      isUrgent: false,
      containerClassName: 'wrapup-timer-container',
      iconClassName: 'wrapup-timer-icon',
      iconName: 'recents-bold',
      formattedTime: '00:00',
    };
  }
};
