import React, {useState, useCallback} from 'react';
import {store} from '@webex/cc-widgets';
import {DigitalChannels} from '@webex/cc-widgets';
import './EngageWidget.css';

// Define the component props interface
interface EngageWidgetProps {
  accessToken: string;
  currentTheme: string;
  isSdkReady: boolean;
  apiEndpoint?: string;
  signalREndpoint?: string;
}

const EngageWidget: React.FC<EngageWidgetProps> = ({
  accessToken,
  currentTheme,
  isSdkReady,
  apiEndpoint = 'https://api.wxcc-us1.cisco.com/v1',
  signalREndpoint = 'https://signalr.wxcc-us1.cisco.com',
}) => {
  const [isFloatingWindowOpen, setIsFloatingWindowOpen] = useState(false);
  const [hasNewTask, setHasNewTask] = useState(false);

  // Get current task info
  const currentTask = store.currentTask;
  const mediaType = currentTask?.data?.interaction?.mediaType;

  // Check if we have a supported digital channel task
  const isSupportedTask =
    currentTask && ['chat', 'social', 'email'].includes(mediaType) && !currentTask.data.wrapUpRequired;

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
  const getTaskIcon = () => {
    if (mediaType === 'chat' || mediaType === 'social') {
      return {icon: '💬', title: `${mediaType} Task`};
    } else if (mediaType === 'email') {
      return {icon: '✉️', title: 'Email Task'};
    }
    return {icon: '📋', title: 'Task'};
  };

  const {icon, title} = getTaskIcon();

  // Determine button class based on task state
  const getButtonClass = () => {
    const baseClass = 'engage-floating-button';
    if (hasNewTask) {
      return `${baseClass} has-new-task`;
    } else if (isSupportedTask) {
      return `${baseClass} has-task`;
    }
    return `${baseClass} no-task`;
  };

  // Show notification when new task arrives
  React.useEffect(() => {
    if (isSupportedTask) {
      setHasNewTask(true);
      const timer = setTimeout(() => setHasNewTask(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [currentTask?.data?.interactionId, isSupportedTask]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggleFloatingWindow}
        className={getButtonClass()}
        title={isSupportedTask ? `Open ${title}` : 'No active tasks'}
        disabled={!isSdkReady}
      >
        {isSupportedTask ? icon : '💬'}
        <div className={`engage-notification ${!hasNewTask ? 'hidden' : ''}`}>!</div>
      </button>

      {/* Floating window */}
      <div className={`engage-floating-window ${!isFloatingWindowOpen ? 'hidden' : ''}`}>
        <div className={`engage-window-header ${currentTheme === 'DARK' ? 'dark' : 'light'}`}>
          <h3 className="engage-window-title">{isSupportedTask ? title : 'No Active Task'}</h3>
          <button
            className={`engage-close-button ${currentTheme === 'DARK' ? 'dark' : 'light'}`}
            onClick={toggleFloatingWindow}
          >
            ×
          </button>
        </div>
        <div className="engage-content-area">
          {isSupportedTask && isSdkReady ? (
            <DigitalChannels
              jwtToken={accessToken}
              apiEndpoint={apiEndpoint}
              signalREndpoint={signalREndpoint}
              onError={handleError}
            />
          ) : (
            <div className="engage-content-placeholder">
              {!isSdkReady
                ? 'Initializing...'
                : 'No active digital channel tasks available. When you receive a chat, social, or email task, it will appear here.'}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EngageWidget;
