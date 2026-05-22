import {MEDIA_CHANNEL, TaskListItemData, getCallerIdentifier, CampaignCallProcessingDetails} from '../task.types';
import store, {isIncomingTask, ILogger, ITask} from '@webex/cc-store';

interface ParticipantWithJoin {
  hasJoined?: boolean;
  joinTimestamp?: number;
}

/**
 * Extract the agent's joinTimestamp from the task participants.
 * Looks up the agent by `agentId` so that we always read the correct
 * participant even when multiple participants have joined.
 * Returns `undefined` when the agent hasn't joined yet.
 */
export const getAgentJoinTimestamp = (task: ITask, agentId?: string): number | undefined => {
  const participants = task.data.interaction.participants as Record<string, ParticipantWithJoin> | undefined;

  if (!participants) return undefined;

  if (agentId && participants[agentId]) {
    const agent = participants[agentId];
    return agent.hasJoined && agent.joinTimestamp ? agent.joinTimestamp : undefined;
  }

  // Fallback: if agentId is not provided or not found, use first joined participant
  for (const participant of Object.values(participants)) {
    if (participant.hasJoined && participant.joinTimestamp) {
      return participant.joinTimestamp;
    }
  }

  return undefined;
};

/**
 * Safely extracts campaign-specific call processing details from a task.
 * Returns an empty object when `cpd` is undefined.
 */
export const getCampaignCpd = (cpd: Record<string, unknown> | undefined): CampaignCallProcessingDetails => {
  if (!cpd) return {};
  return cpd as CampaignCallProcessingDetails;
};

/**
 * outboundType values that identify a campaign preview interaction.
 * Matches CAMPAIGN_OUTBOUND_TYPE from agent desktop constants.
 */
const CAMPAIGN_PREVIEW_OUTBOUND_TYPES = ['STANDARD_PREVIEW_CAMPAIGN', 'DIRECT_PREVIEW_CAMPAIGN'];

/**
 * campaignType values on callProcessingDetails that identify a preview campaign.
 * Matches CAMPAIGN_TYPE from agent desktop constants.
 */
const CAMPAIGN_PREVIEW_CAMPAIGN_TYPES = ['preview_standard', 'preview_direct'];

/**
 * Determines whether a task is a campaign preview interaction.
 *
 * Consistent with the agent desktop logic that checks both
 * `interaction.outboundType` and `callProcessingDetails.campaignType`.
 */
export const isCampaignPreviewTask = (task: ITask): boolean => {
  const outboundType = task.data.interaction.outboundType ?? '';
  const cpd = task.data.interaction.callProcessingDetails as unknown as Record<string, string | undefined>;
  const campaignType = cpd?.campaignType ?? '';

  return (
    CAMPAIGN_PREVIEW_OUTBOUND_TYPES.includes(outboundType) || CAMPAIGN_PREVIEW_CAMPAIGN_TYPES.includes(campaignType)
  );
};

/**
 * Determines whether the agent has joined the interaction.
 *
 * Matches the agent desktop logic:
 * `taskMap[id]?.interaction.participants[agentId]?.hasJoined`
 *
 * The SDK types `participants` as `any`; at runtime it is
 * `Record<string, { hasJoined?: boolean; ... }>`.
 */
export const hasAgentJoinedTask = (task: ITask, agentId: string | undefined): boolean => {
  if (!agentId) return false;
  const participants = task.data.interaction.participants as Record<string, {hasJoined?: boolean}> | undefined;

  return participants?.[agentId]?.hasJoined === true;
};
/**
 * Returns the interactionId of the most recent active campaign preview task
 * that the agent has joined. Only one campaign preview should be visible at a time.
 */
export const getActiveCampaignPreviewId = (tasks: ITask[], agentId: string | undefined): string | null => {
  const activePreviews = tasks.filter((t) => isCampaignPreviewTask(t) && hasAgentJoinedTask(t, agentId));
  if (activePreviews.length === 0) return null;
  // Pick the most recent by createdTimestamp
  activePreviews.sort(
    (a, b) => (b.data.interaction.createdTimestamp ?? 0) - (a.data.interaction.createdTimestamp ?? 0)
  );
  return activePreviews[0].data.interactionId;
};

/**
 * Extracts and processes data from a task for rendering in the task list
 * @param task - The task object
 * @param isBrowser - Whether the device type is browser
 * @returns Processed task data with computed values
 */
export const extractTaskListItemData = (
  task: ITask,
  isBrowser: boolean,
  agentId: string,
  logger?: ILogger
): TaskListItemData => {
  try {
    // Extract basic data from task
    //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
    const callAssociationDetails = task?.data?.interaction?.callAssociatedDetails;
    const ani = callAssociationDetails?.ani;
    const dn = callAssociationDetails?.dn;
    const customerName = callAssociationDetails?.customerName;
    const virtualTeamName = callAssociationDetails?.virtualTeamName;

    // rona timeout is not always available in the callAssociatedDetails object
    const rawRonaTimeout = callAssociationDetails?.ronaTimeout ? Number(callAssociationDetails?.ronaTimeout) : null;

    const taskState = task.data.interaction.state;
    const startTimeStamp = task.data.interaction.createdTimestamp;
    const isTaskIncoming = isIncomingTask(task, agentId);
    const mediaType = task.data.interaction.mediaType;
    const mediaChannel = task.data.interaction.mediaChannel;

    // Compute media type flags
    const isTelephony = mediaType === MEDIA_CHANNEL.TELEPHONY;
    const isSocial = mediaType === MEDIA_CHANNEL.SOCIAL;

    // Compute button text based on conditions
    const acceptText = isTaskIncoming ? (isTelephony && !isBrowser ? 'Ringing...' : 'Accept') : undefined;

    const declineText = isTaskIncoming && isTelephony && isBrowser ? 'Decline' : undefined;

    // Compute title based on media type
    const outboundType = task?.data?.interaction?.outboundType;
    const title = isSocial ? customerName : getCallerIdentifier(ani, dn, outboundType);

    const isAutoAnswering = task.data.isAutoAnswering || false;

    // Compute disable state for accept button
    const disableAccept = (isTaskIncoming && isTelephony && !isBrowser) || isAutoAnswering;

    const disableDecline =
      (isTaskIncoming && isTelephony && !isBrowser) || (isAutoAnswering && !store.isDeclineButtonEnabled);

    const ronaTimeout = isTaskIncoming ? rawRonaTimeout : null;

    // Compute display state
    const displayState = !isTaskIncoming ? taskState : '';

    return {
      ani,
      customerName,
      virtualTeamName,
      ronaTimeout,
      taskState,
      startTimeStamp,
      isIncomingTask: isTaskIncoming,
      mediaType,
      mediaChannel,
      isTelephony,
      isSocial,
      acceptText,
      declineText,
      title,
      disableAccept,
      disableDecline,
      displayState,
    };
  } catch (error) {
    logger?.error('CC-Widgets: TaskList: Error in extractTaskListItemData', {
      module: 'cc-components#task-list.utils.ts',
      method: 'extractTaskListItemData',
      error: error.message,
    });
    // Return safe default
    return {
      ani: '',
      customerName: '',
      virtualTeamName: '',
      ronaTimeout: null,
      taskState: '',
      startTimeStamp: Date.now(),
      isIncomingTask: false,
      mediaType: MEDIA_CHANNEL.TELEPHONY,
      mediaChannel: MEDIA_CHANNEL.TELEPHONY,
      isTelephony: true,
      isSocial: false,
      acceptText: undefined,
      declineText: undefined,
      title: '',
      disableAccept: false,
      disableDecline: false,
      displayState: '',
    };
  }
};

/**
 * Determines if a task should be selectable
 * @param task - The task object
 * @param currentTask - The currently selected task
 * @param taskData - Processed task data
 * @returns Whether the task should be selectable
 */
export const isTaskSelectable = (
  task: ITask,
  currentTask: ITask | null,
  taskData: TaskListItemData,
  logger?
): boolean => {
  try {
    const isDifferentTask = currentTask?.data.interactionId !== task.data.interactionId;
    const isNotIncomingWithoutWrapUp = !(taskData.isIncomingTask && !task.data.wrapUpRequired);

    return isDifferentTask && isNotIncomingWithoutWrapUp;
  } catch (error) {
    logger?.error('CC-Widgets: TaskList: Error in isTaskSelectable', {
      module: 'cc-components#task-list.utils.ts',
      method: 'isTaskSelectable',
      error: error.message,
    });
    // Return safe default
    return false;
  }
};

/**
 * Determines if the current task is selected
 * @param task - The task object
 * @param currentTask - The currently selected task
 * @returns Whether this task is currently selected
 */
export const isCurrentTaskSelected = (task: ITask, currentTask: ITask | null, logger?): boolean => {
  try {
    return currentTask?.data.interactionId === task.data.interactionId;
  } catch (error) {
    logger?.error('CC-Widgets: TaskList: Error in isCurrentTaskSelected', {
      module: 'cc-components#task-list.utils.ts',
      method: 'isCurrentTaskSelected',
      error: error.message,
    });
    // Return safe default
    return false;
  }
};

/**
 * Validates if a task list is empty or invalid
 * @param taskList - The task list object
 * @returns Whether the task list is empty or invalid
 */
export const isTaskListEmpty = (taskList: Record<string, ITask> | null | undefined, logger?): boolean => {
  try {
    return !taskList || Object.keys(taskList).length === 0;
  } catch (error) {
    logger?.error('CC-Widgets: TaskList: Error in isTaskListEmpty', {
      module: 'cc-components#task-list.utils.ts',
      method: 'isTaskListEmpty',
      error: error.message,
    });
    // Return safe default
    return true;
  }
};

/**
 * Gets tasks as an array from the task list object
 * @param taskList - The task list object
 * @returns Array of tasks
 */
export const getTasksArray = (taskList: Record<string, ITask> | null | undefined, logger?): ITask[] => {
  try {
    if (!taskList) {
      return [];
    }
    return Object.values(taskList);
  } catch (error) {
    logger?.error('CC-Widgets: TaskList: Error in getTasksArray', {
      module: 'cc-components#task-list.utils.ts',
      method: 'getTasksArray',
      error: error.message,
    });
    // Return empty safe fallback
    return [];
  }
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
  onTaskSelect: (task: ITask) => void,
  agentId: string,
  logger?
) => {
  return () => {
    try {
      // Logging moved to helper.ts
      const taskData = extractTaskListItemData(task, true, agentId, logger); // Use browser=true for selection logic

      if (isTaskSelectable(task, currentTask, taskData, logger)) {
        onTaskSelect(task);
      }
    } catch (error) {
      logger?.error('CC-Widgets: TaskList: Error in createTaskSelectHandler', {
        module: 'cc-components#task-list.utils.ts',
        method: 'createTaskSelectHandler',
        error: error.message,
      });
    }
  };
};
