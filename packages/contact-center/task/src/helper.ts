import {useState, useEffect, useCallback, useRef} from 'react';
import {ITask} from '@webex/plugin-cc';
import store from '@webex/cc-store';
import {TASK_EVENTS, useCallControlProps, UseTaskListProps, UseTaskProps} from './task.types';

// Hook for managing the task list
export const useTaskList = (props: UseTaskListProps) => {
  const {cc, selectedLoginOption, onTaskAccepted, onTaskDeclined, logger} = props;
  const [taskList, setTaskList] = useState<ITask[]>([]);
  const isBrowser = selectedLoginOption === 'BROWSER';

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useTaskList#${method}`,
    });
  };

  const handleTaskRemoved = useCallback((taskId: string) => {
    setTaskList((prev) => {
      const taskToRemove = prev.find((task) => task.data.interactionId === taskId);

      if (taskToRemove) {
        // Clean up listeners on the task
        taskToRemove.off(TASK_EVENTS.TASK_END, () => handleTaskRemoved(taskId));
      }

      return prev.filter((task) => task.data.interactionId !== taskId);
    });
  }, []);

  const handleIncomingTask = useCallback(
    (task: ITask) => {
      setTaskList((prev) => {
        if (prev.some((t) => t.data.interactionId === task.data.interactionId)) {
          return prev;
        }

        // Attach event listeners to the task
        task.on(TASK_EVENTS.TASK_END, () => handleTaskRemoved(task.data.interactionId));

        return [...prev, task];
      });
    },
    [handleTaskRemoved] // Include handleTaskRemoved as a dependency
  );

  const acceptTask = (task: ITask) => {
    const taskId = task?.data.interactionId;
    if (!taskId) return;

    task
      .accept(taskId)
      .then(() => {
        store.setCurrentTask(task);
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
        store.setCurrentTask(null);
      })
      .catch((error: Error) => {
        logError(`Error declining task: ${error}`, 'declineTask');
      });
  };

  useEffect(() => {
    // Listen for incoming tasks globally
    cc.on(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);

    return () => {
      cc.off(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);
    };
  }, [cc, handleIncomingTask]);

  return {taskList, acceptTask, declineTask, isBrowser};
};

// Hook for managing the current task
export const useIncomingTask = (props: UseTaskProps) => {
  const {cc, onAccepted, onDeclined, selectedLoginOption, logger} = props;
  const [incomingTask, setIncomingTask] = useState<ITask | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const isBrowser = selectedLoginOption === 'BROWSER';

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useIncomingTask#${method}`,
    });
  };

  const handleTaskAssigned = useCallback(() => {
    // Task that are accepted using anything other than browser should be populated
    // in the store only when we receive task assigned event
    if (!isBrowser) store.setCurrentTask(incomingTask);
    setIsAnswered(true);
  }, [incomingTask]);

  const handleTaskEnded = useCallback(() => {
    setIsEnded(true);
    setIncomingTask(null);
  }, []);

  const handleIncomingTask = useCallback((task: ITask) => {
    setIncomingTask(task);
    setIsAnswered(false);
    setIsEnded(false);
  }, []);

  useEffect(() => {
    cc.on(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);

    if (incomingTask) {
      incomingTask.on(TASK_EVENTS.TASK_ASSIGNED, handleTaskAssigned);
      incomingTask.on(TASK_EVENTS.TASK_END, handleTaskEnded);
    }

    return () => {
      cc.off(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);
      if (incomingTask) {
        incomingTask.off(TASK_EVENTS.TASK_ASSIGNED, handleTaskAssigned);
        incomingTask.off(TASK_EVENTS.TASK_END, handleTaskEnded);
      }
    };
  }, [cc, incomingTask, handleIncomingTask, handleTaskAssigned, handleTaskEnded]);

  const accept = () => {
    const taskId = incomingTask?.data.interactionId;
    if (!taskId) return;

    incomingTask
      .accept(taskId)
      .then(() => {
        // Task that are accepted using BROWSER should be populated
        // in the store when we accept the call
        store.setCurrentTask(incomingTask);
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
        setIncomingTask(null);
        store.setCurrentTask(null);
        onDeclined && onDeclined();
      })
      .catch((error: Error) => {
        logError(`Error declining incoming task: ${error}`, 'decline');
      });
  };

  return {
    incomingTask,
    isAnswered,
    isEnded,
    accept,
    decline,
    isBrowser,
  };
};

export const useCallControl = (props: useCallControlProps) => {
  const {currentTask, onHoldResume, onEnd, onWrapUp, logger} = props;
  const [wrapupRequired, setWrapupRequired] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null); // Ref for the audio element

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useCallControl#${method}`,
    });
  };

  const handleTaskEnded = useCallback(({wrapupRequired}: {wrapupRequired: boolean}) => {
    setWrapupRequired(wrapupRequired);
  }, []);

  const handleTaskMedia = useCallback(
    (track) => {
      console.log('Shreyas: Calling handleTaskMedia in call control', audioRef, audioRef.current, track, currentTask);
      if (audioRef.current) {
        audioRef.current.srcObject = new MediaStream([track]);
      }
    },
    [audioRef, currentTask]
  );

  useEffect(() => {
    if (!currentTask) return;
    currentTask.on(TASK_EVENTS.TASK_MEDIA, handleTaskMedia);
    currentTask.on(TASK_EVENTS.TASK_END, handleTaskEnded);

    return () => {
      currentTask.off(TASK_EVENTS.TASK_MEDIA, handleTaskMedia);
      currentTask.off(TASK_EVENTS.TASK_END, handleTaskEnded);
    };
  }, [currentTask, handleTaskEnded]);

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
    const logLocation = {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#pauseResumeRecording',
    };
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
        setWrapupRequired(false);
        store.setCurrentTask(null);
        if (onWrapUp) onWrapUp();
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
    wrapupRequired,
  };
};
