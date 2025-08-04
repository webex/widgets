import {MEDIA_CHANNEL, TaskListItemData} from '../task.types';
import {ITask} from '@webex/cc-store';

/**
 * Extracts and processes data from a task for rendering in the task list
 * @param task - The task object
 * @param isBrowser - Whether the device type is browser
 * @returns Processed task data with computed values
 */
export const extractTaskListItemData = (task: ITask, isBrowser: boolean): TaskListItemData => {
  // Extract basic data from task
  //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
  const callAssociationDetails = task?.data?.interaction?.callAssociatedDetails;
  const ani = callAssociationDetails?.ani;
  const customerName = callAssociationDetails?.customerName;
  const virtualTeamName = callAssociationDetails?.virtualTeamName;

  // rona timeout is not always available in the callAssociatedDetails object
  const rawRonaTimeout = callAssociationDetails?.ronaTimeout ? Number(callAssociationDetails?.ronaTimeout) : null;

  const taskState = task.data.interaction.state;
  const startTimeStamp = task.data.interaction.createdTimestamp;
  const isIncomingTask = !task?.data.wrapUpRequired && (taskState === 'new' || taskState === 'consult');
  const mediaType = task.data.interaction.mediaType;
  const mediaChannel = task.data.interaction.mediaChannel;

  // Compute media type flags
  const isTelephony = mediaType === MEDIA_CHANNEL.TELEPHONY;
  const isSocial = mediaType === MEDIA_CHANNEL.SOCIAL;

  // Compute button text based on conditions
  const acceptText =
    isIncomingTask && !task.data.wrapUpRequired ? (isTelephony && !isBrowser ? 'Ringing...' : 'Accept') : undefined;

  const declineText = isIncomingTask && !task.data.wrapUpRequired && isTelephony && isBrowser ? 'Decline' : undefined;

  // Compute title based on media type
  const title = isSocial ? customerName : ani;

  // Compute disable state for accept button
  const disableAccept = isIncomingTask && isTelephony && !isBrowser;

  const ronaTimeout = isIncomingTask ? rawRonaTimeout : null;

  // Compute display state
  const displayState = !isIncomingTask ? taskState : '';

  return {
    ani,
    customerName,
    virtualTeamName,
    ronaTimeout,
    taskState,
    startTimeStamp,
    isIncomingTask,
    mediaType,
    mediaChannel,
    isTelephony,
    isSocial,
    acceptText,
    declineText,
    title,
    disableAccept,
    displayState,
  };
};

/**
 * Determines if a task should be selectable
 * @param task - The task object
 * @param currentTask - The currently selected task
 * @param taskData - Processed task data
 * @returns Whether the task should be selectable
 */
export const isTaskSelectable = (task: ITask, currentTask: ITask | null, taskData: TaskListItemData): boolean => {
  const isDifferentTask = currentTask?.data.interactionId !== task.data.interactionId;
  const isNotIncomingWithoutWrapUp = !(taskData.isIncomingTask && !task.data.wrapUpRequired);

  return isDifferentTask && isNotIncomingWithoutWrapUp;
};

/**
 * Determines if the current task is selected
 * @param task - The task object
 * @param currentTask - The currently selected task
 * @returns Whether this task is currently selected
 */
export const isCurrentTaskSelected = (task: ITask, currentTask: ITask | null): boolean => {
  return currentTask?.data.interactionId === task.data.interactionId;
};

/**
 * Validates if a task list is empty or invalid
 * @param taskList - The task list object
 * @returns Whether the task list is empty or invalid
 */
export const isTaskListEmpty = (taskList: Record<string, ITask> | null | undefined): boolean => {
  return !taskList || Object.keys(taskList).length === 0;
};

/**
 * Gets tasks as an array from the task list object
 * @param taskList - The task list object
 * @returns Array of tasks
 */
export const getTasksArray = (taskList: Record<string, ITask> | null | undefined): ITask[] => {
  if (!taskList) {
    return [];
  }
  return Object.values(taskList);
};

/**
 * Creates task select handler with logging
 * @param task - The task to select
 * @param currentTask - The currently selected task
 * @param onTaskSelect - The task select function
 * @param logger - The logger instance
 * @returns Task select handler function
 */
export const createTaskSelectHandler = (
  task: ITask,
  currentTask: ITask | null,
  onTaskSelect: (task: ITask) => void
) => {
  return () => {
    // Logging moved to helper.ts
    const taskData = extractTaskListItemData(task, true); // Use browser=true for selection logic

    if (isTaskSelectable(task, currentTask, taskData)) {
      onTaskSelect(task);
    }
  };
};
