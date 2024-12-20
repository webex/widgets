import {useState, useEffect, useCallback, useRef} from 'react';
import {TASK_EVENTS, UseTaskListProps, UseTaskProps} from './task.types';
import {ITask} from '@webex/plugin-cc';

// Hook for managing the task list
export const useTaskList = (props: UseTaskListProps) => {
  const {cc} = props;
  const [taskList, setTaskList] = useState<ITask[]>([]);

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

  useEffect(() => {
    // Listen for incoming tasks globally
    cc.on(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);

    return () => {
      cc.off(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);
    };
  }, [cc, handleIncomingTask]);

  return {taskList};
};

// Hook for managing the current task
export const useIncomingTask = (props: UseTaskProps) => {
  const {cc, onAccepted, onDeclined, selectedLoginOption} = props;
  const [currentTask, setCurrentTask] = useState<ITask | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isMissed, setIsMissed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null); // Ref for the audio element

  const handleTaskAssigned = useCallback(() => {
    setIsAnswered(true);
  }, []);

  const handleTaskEnded = useCallback(() => {
    console.log('Ravi task ended');
    setIsEnded(true);
    setCurrentTask(null);
  }, []);

  const handleTaskMissed = useCallback(() => {
    console.log('Ravi task missed');
    setIsMissed(true);
    setCurrentTask(null);
  }, []);

  const handleTaskMedia = useCallback((track) => {
    console.log('Ravi task media');
    if (audioRef.current) {
      audioRef.current.srcObject = new MediaStream([track]);
    }
  }, []);

  const handleIncomingTask = useCallback((task: ITask) => {
    console.log('Ravi incoming task');
    setCurrentTask(task);
  }, []);

  useEffect(() => {
    cc.on(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);

    if (currentTask) {
      currentTask.on(TASK_EVENTS.TASK_ASSIGNED, handleTaskAssigned);
      currentTask.on(TASK_EVENTS.TASK_END, handleTaskEnded);
      currentTask.on(TASK_EVENTS.TASK_UNASSIGNED, handleTaskMissed);
      currentTask.on(TASK_EVENTS.TASK_MEDIA, handleTaskMedia);
    }

    return () => {
      cc.off(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);
      if (currentTask) {
        currentTask.off(TASK_EVENTS.TASK_ASSIGNED, handleTaskAssigned);
        currentTask.off(TASK_EVENTS.TASK_END, handleTaskEnded);
        currentTask.off(TASK_EVENTS.TASK_UNASSIGNED, handleTaskMissed);
        currentTask.off(TASK_EVENTS.TASK_MEDIA, handleTaskMedia);
      }
    };
  }, [cc, currentTask, handleIncomingTask, handleTaskAssigned, handleTaskEnded, handleTaskMissed, handleTaskMedia]);

  const accept = () => {
    const taskId = currentTask?.data.interactionId;
    if (!taskId) return;

    currentTask
      .accept(taskId)
      .then(() => {
        onAccepted && onAccepted();
      })
      .catch((error: Error) => {
        console.error(error);
      });
  };

  const decline = () => {
    const taskId = currentTask?.data.interactionId;
    if (!taskId) return;

    currentTask
      .decline(taskId)
      .then(() => {
        setCurrentTask(null);
        onDeclined && onDeclined();
      })
      .catch((error: Error) => {
        console.error(error);
      });
  };

  const isBrowser = selectedLoginOption === 'BROWSER';

  return {
    currentTask,
    setCurrentTask,
    isAnswered,
    isEnded,
    isMissed,
    accept,
    decline,
    isBrowser,
    audioRef,
  };
};
