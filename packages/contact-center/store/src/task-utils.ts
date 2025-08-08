import {ITask} from './store.types';

/**
 * Determines if a task is an incoming task
 * @param task - The task object
 * @returns Whether the task is incoming
 */
export const isIncomingTask = (task: ITask): boolean => {
  const taskData = task?.data;
  const taskState = taskData?.interaction?.state;
  const agentId = taskData?.agentId;
  const participants = taskData?.interaction?.participants;
  const hasJoined = agentId && participants?.[agentId]?.hasJoined;

  return (
    !taskData?.wrapUpRequired &&
    !hasJoined &&
    (taskState === 'new' || taskState === 'consult' || taskState === 'connected')
  );
};
