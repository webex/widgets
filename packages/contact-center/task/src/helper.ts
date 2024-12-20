import {useState, useEffect, useCallback, useRef} from 'react';
import {TASK_EVENTS, UseTaskListProps, UseTaskProps} from './task.types';
import {ITask} from '@webex/plugin-cc';

// Hook for managing the task list
export const useTaskList = (props: UseTaskListProps) => {
  const {cc} = props;
  const [taskList, setTaskList] = useState<ITask[]>([]);

  const handleIncomingTask = useCallback((task: ITask) => {
    setTaskList((prev) => {
      if (prev.some((t) => t.data.interactionId === task.data.interactionId)) {
        return prev;
      }
      return [...prev, task];
    });
  }, []);

  const handleTaskEnded = useCallback((taskId: string) => {
    setTaskList((prev) => prev.filter((task) => task.data.interactionId !== taskId));
  }, []);

  const handleTaskMissed = useCallback((taskId: string) => {
    setTaskList((prev) => prev.filter((task) => task.data.interactionId !== taskId));
  }, []);

  useEffect(() => {
    cc.on(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);
    cc.on(TASK_EVENTS.TASK_END, (task: ITask) => handleTaskEnded(task.data.interactionId));
    cc.on(TASK_EVENTS.TASK_UNASSIGNED, (task: ITask) => handleTaskMissed(task.data.interactionId));

    return () => {
      cc.off(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);
      cc.off(TASK_EVENTS.TASK_END, (task: ITask) => handleTaskEnded(task.data.interactionId));
      cc.off(TASK_EVENTS.TASK_UNASSIGNED, (task: ITask) => handleTaskMissed(task.data.interactionId));
    };
  }, [cc, handleIncomingTask, handleTaskEnded, handleTaskMissed]);

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
    setIsEnded(true);
    setCurrentTask(null);
  }, []);

  const handleTaskMissed = useCallback(() => {
    setIsMissed(true);
    setCurrentTask(null);
  }, []);

  const handleTaskMedia = useCallback((track) => {
    if (audioRef.current) {
      audioRef.current.srcObject = new MediaStream([track]);
    }
  }, []);

  const handleIncomingTask = useCallback((task: ITask) => {
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
