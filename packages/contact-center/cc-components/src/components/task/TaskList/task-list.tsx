import React from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import {withMetrics} from '@webex/cc-ui-logging';
import {TaskListComponentProps, MEDIA_CHANNEL, CampaignCallProcessingDetails} from '../task.types';
import Task from '../Task';
import CampaignTask from '../CampaignTask/campaign-task';
import {
  extractTaskListItemData,
  isTaskListEmpty,
  getTasksArray,
  createTaskSelectHandler,
  isCurrentTaskSelected,
  isCampaignPreviewTask,
  hasAgentJoinedTask,
  getActiveCampaignPreviewId,
} from './task-list.utils';
import './styles.scss';

const TaskListComponent: React.FunctionComponent<TaskListComponentProps> = (props) => {
  const {
    currentTask,
    taskList,
    acceptTask,
    declineTask,
    onTaskSelect,
    logger,
    agentId,
    isDeclineButtonEnabled,
    isBrowser,
    cc,
    hasCampaignPreviewEnabled = true,
    acceptedCampaignIds,
  } = props;

  // Early return for empty task list
  if (isTaskListEmpty(taskList)) {
    return <></>; // hidden component
  }

  // Get tasks as array for mapping
  const tasks = getTasksArray(taskList!);

  // Only one campaign preview should appear — pick the most recent active one
  const activeCampaignId = hasCampaignPreviewEnabled ? getActiveCampaignPreviewId(tasks, agentId) : null;

  return (
    <ul className="task-list" data-testid="task-list">
      {tasks.map((task, index) => {
        // Extract all task data using the utility function
        const taskData = extractTaskListItemData(task, agentId, logger, isDeclineButtonEnabled, isBrowser);

        // Log task rendering
        logger.info('CC-Widgets: TaskList: rendering task list', {
          module: 'task-list.tsx',
          method: 'renderItem',
        });

        // Campaign preview handling: render only the active one, skip stale duplicates
        if (hasCampaignPreviewEnabled && isCampaignPreviewTask(task) && hasAgentJoinedTask(task, agentId)) {
          if (task.data.interactionId !== activeCampaignId) {
            return null; // skip stale campaign preview
          }
          const interactionId = task.data.interactionId;
          const cpd = task.data.interaction.callProcessingDetails as unknown as
            | CampaignCallProcessingDetails
            | undefined;
          const campaignId = cpd?.campaignId ?? '';

          return (
            <ErrorBoundary
              key={interactionId}
              fallbackRender={() => <></>}
              onError={(error: Error) => {
                logger?.error?.('CampaignTask crashed', {error});
              }}
            >
              <CampaignTask
                task={task}
                acceptPreviewContact={() => cc.acceptPreviewContact({interactionId, campaignId}).then(() => {})}
                skipPreviewContact={() => cc.skipPreviewContact({interactionId, campaignId}).then(() => {})}
                removePreviewContact={() => cc.removePreviewContact({interactionId, campaignId}).then(() => {})}
                cancelPreviewContact={() => task.end().then(() => {})}
                isBrowser={isBrowser}
                logger={logger}
                isAccepted={acceptedCampaignIds?.has(interactionId) ?? false}
                agentId={agentId}
              />
            </ErrorBoundary>
          );
        }

        return (
          <Task
            interactionId={task.data.interactionId}
            title={taskData.title}
            state={taskData.displayState}
            startTimeStamp={taskData.startTimeStamp}
            selected={isCurrentTaskSelected(task, currentTask)}
            key={index}
            isIncomingTask={taskData.isIncomingTask}
            queue={taskData.virtualTeamName}
            acceptTask={() => acceptTask(task)}
            declineTask={() => declineTask(task)}
            ronaTimeout={taskData.ronaTimeout}
            onTaskSelect={createTaskSelectHandler(task, currentTask, onTaskSelect, agentId)}
            acceptText={taskData.acceptText}
            disableAccept={taskData.disableAccept}
            disableDecline={taskData.disableDecline}
            declineText={taskData.declineText}
            mediaType={taskData.mediaType as MEDIA_CHANNEL}
            mediaChannel={taskData.mediaChannel as MEDIA_CHANNEL}
          />
        );
      })}
    </ul>
  );
};

const TaskListComponentWithMetrics = withMetrics(TaskListComponent, 'TaskList');
export default TaskListComponentWithMetrics;
