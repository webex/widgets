import {useState, useEffect, useCallback, useRef} from 'react';
import {TASK_EVENTS, useCallControlProps, UseTaskListProps, UseTaskProps} from './task.types';
import {ITask} from '@webex/plugin-cc';
import store from '@webex/cc-store';

// Hook for managing the task list
export const useTaskList = (props: UseTaskListProps) => {
  const {cc, selectedLoginOption, onTaskAccepted, onTaskDeclined, logger} = props;
  const [taskList, setTaskList] = useState<ITask[]>([]);
  const isBrowser = selectedLoginOption === 'BROWSER';

  const handleTaskRemoved = useCallback((taskId: string) => {
    setTaskList((prev) => {
      const taskToRemove = prev.find((task) => task.data.interactionId === taskId);

      if (taskToRemove) {
        // Clean up listeners on the task
        taskToRemove.off(TASK_EVENTS.TASK_END, () => handleTaskRemoved(taskId));
        taskToRemove.off(TASK_EVENTS.TASK_UNASSIGNED, () => handleTaskRemoved(taskId));
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
        task.on(TASK_EVENTS.TASK_UNASSIGNED, () => handleTaskRemoved(task.data.interactionId));

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
        logger.error(`Error accepting task: ${error}`, {
          module: 'widget-cc-task#helper.ts',
          method: 'useTaskList#acceptTask',
        });
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
        logger.error(`Error declining task: ${error}`, {
          module: 'widget-cc-task#helper.ts',
          method: 'useTaskList#declineTask',
        });
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
  const audioRef = useRef<HTMLAudioElement | null>(null); // Ref for the audio element

  const handleTaskAssigned = useCallback(() => {
    store.setCurrentTask(incomingTask);
    setIsAnswered(true);
  }, []);

  const handleTaskEnded = useCallback(() => {
    setIsEnded(true);
    setIncomingTask(null);
  }, []);

  const handleTaskMedia = useCallback((track) => {
    if (audioRef.current) {
      audioRef.current.srcObject = new MediaStream([track]);
    }
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
      incomingTask.on(TASK_EVENTS.TASK_MEDIA, handleTaskMedia);
    }

    return () => {
      cc.off(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);
      if (incomingTask) {
        incomingTask.off(TASK_EVENTS.TASK_ASSIGNED, handleTaskAssigned);
        incomingTask.off(TASK_EVENTS.TASK_END, handleTaskEnded);
        incomingTask.off(TASK_EVENTS.TASK_MEDIA, handleTaskMedia);
      }
    };
  }, [cc, incomingTask, handleIncomingTask, handleTaskAssigned, handleTaskEnded, handleTaskMedia]);

  const accept = () => {
    const taskId = incomingTask?.data.interactionId;
    if (!taskId) return;

    incomingTask
      .accept(taskId)
      .then(() => {
        store.setCurrentTask(incomingTask);
        onAccepted && onAccepted();
      })
      .catch((error: Error) => {
        logger.error(`Error accepting incoming task: ${error}`, {
          module: 'widget-cc-task#helper.ts',
          method: 'useIncomingTask#accept',
        });
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
        logger.error(`Error declining incoming task: ${error}`, {
          module: 'widget-cc-task#helper.ts',
          method: 'useIncomingTask#decline',
        });
      });
  };

  const isBrowser = selectedLoginOption === 'BROWSER';

  return {
    incomingTask,
    isAnswered,
    isEnded,
    accept,
    decline,
    isBrowser,
    audioRef,
  };
};

export const useCallControl = (props: useCallControlProps) => {
  const {currentTask, onHoldResume, onEnd, onWrapUp, logger} = props;
  const [wrapupRequired, setWrapupRequired] = useState(false);

  const handleTaskEnded = useCallback((args: {wrapupRequired: boolean}) => {
    const {wrapupRequired} = args;
    setWrapupRequired(wrapupRequired);
  }, []);

  useEffect(() => {
    if (currentTask) {
      currentTask.on(TASK_EVENTS.TASK_END, handleTaskEnded);
    }

    return () => {
      if (currentTask) {
        currentTask.off(TASK_EVENTS.TASK_END, handleTaskEnded);
      }
    };
  }, [currentTask, handleTaskEnded]);

  const toggleHold = (hold: boolean) => {
    if (hold) {
      currentTask
        .hold()
        .then(() => {
          if (onHoldResume) onHoldResume();
        })
        .catch((error: Error) => {
          logger.error(`Error holding call: ${error}`, {
            module: 'widget-cc-task#helper.ts',
            method: 'useCallControl#holdResume',
          });
        });
    } else {
      currentTask
        .resume()
        .then(() => {
          if (onHoldResume) onHoldResume();
        })
        .catch((error: Error) => {
          logger.error(`Error resuming call: ${error}`, {
            module: 'widget-cc-task#helper.ts',
            method: 'useCallControl#holdResume',
          });
        });
    }
  };

  const toggleRecording = (pause: boolean) => {
    if (pause) {
      currentTask.pauseRecording().catch((error: Error) => {
        logger.error(`Error pausing recording: ${error}`, {
          module: 'widget-cc-task#helper.ts',
          method: 'useCallControl#pauseResumeRecording',
        });
      });
    } else {
      currentTask.resumeRecording().catch((error: Error) => {
        logger.error(`Error resuming recording: ${error}`, {
          module: 'widget-cc-task#helper.ts',
          method: 'useCallControl#pauseResumeRecording',
        });
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
        logger.error(`Error ending call: ${error}`, {
          module: 'widget-cc-task#helper.ts',
          method: 'useCallControl#endCall',
        });
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
        logger.error(`Error wrapping up call: ${error}`, {
          module: 'widget-cc-task#helper.ts',
          method: 'useCallControl#wrapupCall',
        });
      });
  };

  return {
    currentTask,
    endCall,
    toggleHold,
    toggleRecording,
    wrapupCall,
    wrapupRequired,
  };
};
