import React, { useState, useCallback } from 'react';
import { store, DigitalChannels } from '@webex/cc-widgets';
import {
  SUPPORTED_DIGITAL_MEDIA_TYPES,
  DEFAULT_DATA_CENTER,
  UI_CONSTANTS,
  MESSAGES,
  getMediaTypeIcon,
  getMediaTypeTitle,
} from './constants';
import './EngageWidget.css';

// Define the component props interface
interface EngageWidgetProps {
  accessToken: string;
  currentTheme: string;
  isSdkReady: boolean;
  dataCenter?: string;
}

const EngageWidget: React.FC<EngageWidgetProps> = ({
  accessToken,
  currentTheme,
  isSdkReady,
  dataCenter = DEFAULT_DATA_CENTER,
}) => {
  const [isFloatingWindowOpen, setIsFloatingWindowOpen] = useState(false);
  const [hasNewTask, setHasNewTask] = useState(false);

  // Get current task info
  const currentTask = store.currentTask;
  const mediaType = currentTask?.data?.interaction?.mediaType;

  // Check if we have a supported digital channel task
  const isSupportedTask =
    currentTask && SUPPORTED_DIGITAL_MEDIA_TYPES.includes(mediaType) && !currentTask.data.wrapUpRequired;

  // Handle error from DigitalChannels component
  const handleError = useCallback((error: unknown): boolean => {
    console.error('DigitalChannels error:', error);
    return false; // Prevent default error handling
  }, []);

  // Toggle floating window
  const toggleFloatingWindow = useCallback(() => {
    setIsFloatingWindowOpen(!isFloatingWindowOpen);
    setHasNewTask(false); // Clear notification when opening
  }, [isFloatingWindowOpen]);

  // Get the icon and title based on task type
  const icon = getMediaTypeIcon(mediaType);
  const title = getMediaTypeTitle(mediaType);

  // Determine button class based on task state
  const getButtonClass = () => {
    const { FLOATING_BUTTON, HAS_NEW_TASK, HAS_TASK, NO_TASK } = UI_CONSTANTS.CSS_CLASSES;
    if (hasNewTask) {
      return `${FLOATING_BUTTON} ${HAS_NEW_TASK}`;
    } else if (isSupportedTask) {
      return `${FLOATING_BUTTON} ${HAS_TASK}`;
    }
    return `${FLOATING_BUTTON} ${NO_TASK}`;
  };

  // Show notification when new task arrives
  React.useEffect(() => {
    if (isSupportedTask) {
      setHasNewTask(true);
      const timer = setTimeout(() => setHasNewTask(false), UI_CONSTANTS.NOTIFICATION_TIMEOUT);
      return () => clearTimeout(timer);
    }
  }, [currentTask?.data?.interactionId, isSupportedTask]);

  const { CSS_CLASSES, THEMES, THEME_CLASSES } = UI_CONSTANTS;
  const themeClass = currentTheme === THEMES.DARK ? THEME_CLASSES.DARK : THEME_CLASSES.LIGHT;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggleFloatingWindow}
        className={getButtonClass()}
        title={isSupportedTask ? `Open ${title}` : MESSAGES.NO_ACTIVE_TASKS_TITLE}
        disabled={!isSdkReady}
      >
        {isSupportedTask ? icon : '💬'}
        <div className={`${CSS_CLASSES.NOTIFICATION} ${!hasNewTask ? CSS_CLASSES.HIDDEN : ''}`}>!</div>
      </button>

      {/* Floating window */}
      <div className={`${CSS_CLASSES.FLOATING_WINDOW} ${!isFloatingWindowOpen ? CSS_CLASSES.HIDDEN : ''}`}>
        <div className={`${CSS_CLASSES.WINDOW_HEADER} ${themeClass}`}>
          <h3 className={CSS_CLASSES.WINDOW_TITLE}>{isSupportedTask ? title : MESSAGES.NO_ACTIVE_TASK}</h3>
          <button className={`${CSS_CLASSES.CLOSE_BUTTON} ${themeClass}`} onClick={toggleFloatingWindow}>
            ×
          </button>
        </div>
        <div className={CSS_CLASSES.CONTENT_AREA}>
          {isSupportedTask && isSdkReady ? (
            <DigitalChannels jwtToken={accessToken} dataCenter={dataCenter} onError={handleError} />
          ) : (
            <div className={CSS_CLASSES.CONTENT_PLACEHOLDER}>
              {!isSdkReady ? MESSAGES.INITIALIZING : MESSAGES.NO_ACTIVE_TASKS}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EngageWidget;