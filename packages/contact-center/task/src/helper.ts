import {useState, useEffect, useCallback, useRef} from 'react';
import {TASK_EVENTS, UseTaskListProps, UseTaskProps} from './task.types';
import {ITask} from '@webex/plugin-cc';

// Hook for managing the task list
export const useTaskList = (props: UseTaskListProps) => {
  const {cc} = props;
  const [taskList, setTaskList] = useState<ITask[]>([]);
  const isEventRegistered = useRef(false); // Ensure the event is registered only once

  const handleIncomingTask = useCallback((task: ITask) => {
    setTaskList((prev) => {
      // Prevent duplicate tasks
      if (prev.some((t) => t.data.interaction.interactionId === task.data.interaction.interactionId)) {
        return prev;
      }
      return [...prev, task];
    });
  }, []);

  const handleTaskEnded = useCallback((taskId: string) => {
    setTaskList((prev) => prev.filter((task) => task.data.interaction.interactionId !== taskId));
  }, []);

  const handleTaskMissed = useCallback((taskId: string) => {
    setTaskList((prev) => prev.filter((task) => task.data.interaction.interactionId !== taskId));
  }, []);

  useEffect(() => {
    if (!isEventRegistered.current) {
      cc.on(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);
      cc.on(TASK_EVENTS.TASK_END, (task: ITask) => handleTaskEnded(task.data.interaction.interactionId));
      cc.on(TASK_EVENTS.TASK_UNASSIGNED, (task: ITask) => handleTaskMissed(task.data.interaction.interactionId));
      isEventRegistered.current = true;
    }

    return () => {
      cc.off(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);
      cc.off(TASK_EVENTS.TASK_END, (task: ITask) => handleTaskEnded(task.data.interaction.interactionId));
      cc.off(TASK_EVENTS.TASK_UNASSIGNED, (task: ITask) => handleTaskMissed(task.data.interaction.interactionId));
      isEventRegistered.current = false;
    };
  }, [cc, handleIncomingTask, handleTaskEnded, handleTaskMissed]);

  return {taskList};
};

// Hook for managing the current task
export const useIncomingTask = (props: UseTaskProps) => {
  const {cc, onAccepted, onDeclined, selectedLoginOption} = props;
  const [currentTask, setCurrentTask] = useState<ITask | null>(null);
  const [answered, setAnswered] = useState(false);
  const [ended, setEnded] = useState(false);
  const [missed, setMissed] = useState(false);
  const isEventRegistered = useRef(false); // Ensure task events are registered only once

  const handleTaskAssigned = useCallback(() => {
    setAnswered(true);
  }, []);

  const handleTaskEnded = useCallback(() => {
    setEnded(true);
    setCurrentTask(null);
  }, []);

  const handleTaskMissed = useCallback(() => {
    setMissed(true);
    setCurrentTask(null);
  }, []);

  const handleTaskMedia = useCallback((track) => {
    // @ts-ignore
    document.getElementById('remote-audio').srcObject = new MediaStream([track]);
  }, []);

  const handleIncomingTask = useCallback((task: ITask) => {
    setCurrentTask(task);
  }, []);

  useEffect(() => {
    if (!isEventRegistered.current) {
      cc.on(TASK_EVENTS.TASK_INCOMING, handleIncomingTask);
      isEventRegistered.current = true;
    }

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
      isEventRegistered.current = false;
    };
  }, [cc, currentTask, handleIncomingTask, handleTaskAssigned, handleTaskEnded, handleTaskMissed, handleTaskMedia]);

  const accept = () => {
    const taskId = currentTask?.data.interactionId;
    if (!taskId) return;

    currentTask
      .accept(taskId)
      .then((res) => {
        onAccepted && onAccepted();
      })
      .catch((error: Error) => {});
  };

  const decline = () => {
    const taskId = currentTask?.data.interactionId;
    if (!taskId) return;

    currentTask
      .decline(taskId)
      .then((res) => {
        setCurrentTask(null);
        onDeclined && onDeclined();
      })
      .catch((error: Error) => {});
  };

  const isBrowser = selectedLoginOption === 'BROWSER';

  return {
    currentTask,
    setCurrentTask,
    answered,
    ended,
    missed,
    accept,
    decline,
    isBrowser,
  };
};
