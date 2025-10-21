import React from 'react';
import {TaskListComponentProps, MEDIA_CHANNEL} from '../task.types';
import Task from '../Task';
import {
  extractTaskListItemData,
  isTaskListEmpty,
  getTasksArray,
  createTaskSelectHandler,
  isCurrentTaskSelected,
} from './task-list.utils';
import './styles.scss';
import {withMetrics} from '@webex/cc-ui-logging';

const TaskListComponent: React.FunctionComponent<TaskListComponentProps> = (props) => {
  const {currentTask, taskList, acceptTask, declineTask, isBrowser, onTaskSelect, logger, agentId} = props;

  // Early return for empty task list
  if (isTaskListEmpty(taskList)) {
    return <></>; // hidden component
  }

  // Get tasks as array for mapping
  const tasks = getTasksArray(taskList!);
  return (
    <ul className="task-list" data-testid="task-list">
      {tasks.map((task, index) => {
        // Extract all task data using the utility function
        const taskData = extractTaskListItemData(task, isBrowser, agentId, logger);

        // Log task rendering
        logger.info('CC-Widgets: TaskList: rendering task list', {
          module: 'task-list.tsx',
          method: 'renderItem',
        });
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
