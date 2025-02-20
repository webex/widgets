import {useEffect, useCallback, useRef} from 'react';
import {ITask} from '@webex/plugin-cc';
import store from '@webex/cc-store';
import {TASK_EVENTS, useCallControlProps, UseTaskListProps, UseTaskProps} from './task.types';

// Hook for managing the task list
export const useTaskList = (props: UseTaskListProps) => {
  const {deviceType, onTaskAccepted, onTaskDeclined, logger, taskList} = props;
  const isBrowser = deviceType === 'BROWSER';

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useTaskList#${method}`,
    });
  };

  const acceptTask = (task: ITask) => {
    const taskId = task?.data.interactionId;
    if (!taskId) return;

    task
      .accept(taskId)
      .then(() => {
        onTaskAccepted && onTaskAccepted(task);
      })
      .catch((error: Error) => {
        logError(`Error accepting task: ${error}`, 'acceptTask');
      });
  };

  const declineTask = (task: ITask) => {
    const taskId = task?.data.interactionId;
    if (!taskId) return;

    task
      .decline(taskId)
      .then(() => {
        onTaskDeclined && onTaskDeclined(task);
      })
      .catch((error: Error) => {
        logError(`Error declining task: ${error}`, 'declineTask');
      });
  };

  return {taskList, acceptTask, declineTask, isBrowser};
};

export const useIncomingTask = (props: UseTaskProps) => {
  const {cc, onAccepted, onDeclined, deviceType, incomingTask, logger} = props;
  const isBrowser = deviceType === 'BROWSER';

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useIncomingTask#${method}`,
    });
  };

  const accept = () => {
    const taskId = incomingTask?.data.interactionId;
    if (!taskId) return;

    incomingTask
      .accept(taskId)
      .then(() => {
        onAccepted && onAccepted();
      })
      .catch((error: Error) => {
        logError(`Error accepting incoming task: ${error}`, 'accept');
      });
  };

  const decline = () => {
    const taskId = incomingTask?.data.interactionId;
    if (!taskId) return;

    incomingTask
      .decline(taskId)
      .then(() => {
        onDeclined && onDeclined();
      })
      .catch((error: Error) => {
        logError(`Error declining incoming task: ${error}`, 'decline');
      });
  };

  return {
    incomingTask,
    accept,
    decline,
    isBrowser,
  };
};

export const useCallControl = (props: useCallControlProps) => {
  const {currentTask, onHoldResume, onEnd, onWrapUp, logger} = props;
  const audioRef = useRef<HTMLAudioElement | null>(null); // Ref for the audio element

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useCallControl#${method}`,
    });
  };

  const handleTaskMedia = useCallback(
    (track) => {
      if (audioRef.current) {
        audioRef.current.srcObject = new MediaStream([track]);
      }
    },
    [audioRef, currentTask]
  );

  useEffect(() => {
    if (!currentTask) return;
    // Call control only event for WebRTC calls
    currentTask.on(TASK_EVENTS.TASK_MEDIA, handleTaskMedia);
    store.setState({
      developerName: 'ENGAGED',
      name: 'Engaged',
      iconColor: 'orange',
    });

    return () => {
      currentTask.off(TASK_EVENTS.TASK_MEDIA, handleTaskMedia);
      store.setState({});
    };
  }, [currentTask]);

  const toggleHold = (hold: boolean) => {
    if (hold) {
      currentTask
        .hold()
        .then(() => onHoldResume && onHoldResume())
        .catch((error: Error) => {
          logError(`Error holding call: ${error}`, 'toggleHold');
        });

      return;
    }

    currentTask
      .resume()
      .then(() => onHoldResume && onHoldResume())
      .catch((error: Error) => {
        logError(`Error resuming call: ${error}`, 'toggleHold');
      });
  };

  const toggleRecording = (pause: boolean) => {
    if (pause) {
      currentTask.pauseRecording().catch((error: Error) => {
        logError(`Error pausing recording: ${error}`, 'toggleRecording');
      });
    } else {
      currentTask.resumeRecording().catch((error: Error) => {
        logError(`Error resuming recording: ${error}`, 'toggleRecording');
      });
    }
  };

  const endCall = () => {
    currentTask
      .end()
      .then(() => {
        if (onEnd) onEnd();
      })
      .catch((error: Error) => {
        logError(`Error ending call: ${error}`, 'endCall');
      });
  };

  const wrapupCall = (wrapUpReason: string, auxCodeId: string) => {
    currentTask
      .wrapup({wrapUpReason: wrapUpReason, auxCodeId: auxCodeId})
      .then(() => {
        if (onWrapUp) onWrapUp({wrapUpReason, task: currentTask?.data});
        store.handleTaskRemove(currentTask.data.interactionId);
      })
      .catch((error: Error) => {
        logError(`Error wrapping up call: ${error}`, 'wrapupCall');
      });
  };

  return {
    currentTask,
    audioRef,
    endCall,
    toggleHold,
    toggleRecording,
    wrapupCall,
  };
};
