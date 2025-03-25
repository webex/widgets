import {useEffect, useCallback, useRef, useState} from 'react';
import {ITask} from '@webex/plugin-cc';
import store, {TASK_EVENTS} from '@webex/cc-store';
import {useCallControlProps, UseTaskListProps, UseTaskProps} from './task.types';

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

  useEffect(() => {
    if (!taskList || taskList.length === 0) return;
    let taskAssignCallback, taskRejectCallback;

    taskList.forEach((task) => {
      const taskId = task?.data.interactionId;
      if (!taskId) return;

      taskAssignCallback = () => {
        if (onTaskAccepted) onTaskAccepted(task);
      };

      taskRejectCallback = () => {
        if (onTaskDeclined) onTaskDeclined(task);
      };

      store.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, taskId);
      store.setTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, taskId);
    });

    return () => {
      taskList.forEach((task) => {
        const taskId = task?.data.interactionId;
        if (!taskId) return;

        store.removeTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, taskId);
        store.removeTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, taskId);
      });
    };
  }, [taskList]);

  const acceptTask = (task: ITask) => {
    const taskId = task?.data.interactionId;
    if (!taskId) return;

    task.accept(taskId).catch((error: Error) => {
      logError(`Error accepting task: ${error}`, 'acceptTask');
    });
  };

  const declineTask = (task: ITask) => {
    const taskId = task?.data.interactionId;
    if (!taskId) return;

    task.decline(taskId).catch((error: Error) => {
      logError(`Error declining task: ${error}`, 'declineTask');
    });
  };

  return {taskList, acceptTask, declineTask, isBrowser};
};

export const useIncomingTask = (props: UseTaskProps) => {
  const {onAccepted, onDeclined, deviceType, incomingTask, logger} = props;
  const isBrowser = deviceType === 'BROWSER';

  const taskAssignCallback = () => {
    if (onAccepted) onAccepted();
  };

  const taskRejectCallback = () => {
    if (onDeclined) onDeclined();
  };

  useEffect(() => {
    if (!incomingTask) return;
    store.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask?.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask?.data.interactionId);
    return () => {
      store.removeTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask?.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask?.data.interactionId);
    };
  }, [incomingTask]);

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useIncomingTask#${method}`,
    });
  };

  const accept = () => {
    const taskId = incomingTask?.data.interactionId;
    if (!taskId) return;

    incomingTask.accept(taskId).catch((error: Error) => {
      logError(`Error accepting incoming task: ${error}`, 'accept');
    });
  };

  const decline = () => {
    const taskId = incomingTask?.data.interactionId;
    if (!taskId) return;

    incomingTask.decline(taskId).catch((error: Error) => {
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
  const {currentTask, onHoldResume, onEnd, onWrapUp, logger, deviceType} = props;
  const audioRef = useRef<HTMLAudioElement | null>(null); // Ref for the audio element
  const isBrowser = deviceType === 'BROWSER';
  const [isHeld, setIsHeld] = useState<boolean | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(true);

  const holdCallback = () => {
    setIsHeld(true);
    if (onHoldResume) onHoldResume();
  };

  const resumeCallback = () => {
    setIsHeld(false);
    if (onHoldResume) onHoldResume();
  };

  const endCallCallback = () => {
    if (onEnd) onEnd();
  };

  const wrapupCallCallback = ({wrapUpAuxCodeId}) => {
    const wrapUpReason = store.wrapupCodes.find((code) => code.id === wrapUpAuxCodeId)?.name;
    if (onWrapUp) {
      onWrapUp({
        task: currentTask,
        wrapUpReason: wrapUpReason,
      });
    }
  };

  const pauseRecordingCallback = () => {
    setIsRecording(false);
  };

  const resumeRecordingCallback = () => {
    setIsRecording(true);
  };

  useEffect(() => {
    if (!currentTask) return;

    store.setTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.AGENT_WRAPPEDUP, wrapupCallCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.CONTACT_RECORDING_PAUSED, pauseRecordingCallback, currentTask.data.interactionId);
    store.setTaskCallback(
      TASK_EVENTS.CONTACT_RECORDING_RESUMED,
      resumeRecordingCallback,
      currentTask.data.interactionId
    );

    return () => {
      store.removeTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, currentTask.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, currentTask.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, currentTask.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.AGENT_WRAPPEDUP, wrapupCallCallback, currentTask.data.interactionId);
      store.removeTaskCallback(
        TASK_EVENTS.CONTACT_RECORDING_PAUSED,
        pauseRecordingCallback,
        currentTask.data.interactionId
      );
      store.removeTaskCallback(
        TASK_EVENTS.CONTACT_RECORDING_RESUMED,
        resumeRecordingCallback,
        currentTask.data.interactionId
      );
    };
  }, [currentTask]);

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
    if (!currentTask || !isBrowser) return;
    // Call control only event for WebRTC calls
    currentTask.on(TASK_EVENTS.TASK_MEDIA, handleTaskMedia);

    return () => {
      currentTask.off(TASK_EVENTS.TASK_MEDIA, handleTaskMedia);
    };
  }, [currentTask]);

  const toggleHold = (hold: boolean) => {
    if (hold) {
      currentTask.hold().catch((error: Error) => {
        logError(`Error holding call: ${error}`, 'toggleHold');
      });

      return;
    }

    currentTask.resume().catch((error: Error) => {
      logError(`Error resuming call: ${error}`, 'toggleHold');
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
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
    currentTask.end().catch((error: Error) => {
      logError(`Error ending call: ${error}`, 'endCall');
    });
  };

  const wrapupCall = (wrapUpReason: string, auxCodeId: string) => {
    currentTask.wrapup({wrapUpReason: wrapUpReason, auxCodeId: auxCodeId}).catch((error: Error) => {
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
    isHeld,
    setIsHeld,
    isRecording,
    setIsRecording,
  };
};
