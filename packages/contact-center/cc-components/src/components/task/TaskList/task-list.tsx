import React from 'react';
import {TaskListComponentProps, MEDIA_CHANNEL} from '../task.types';
import Task from '../Task';
import './styles.scss';

const TaskListComponent: React.FunctionComponent<TaskListComponentProps> = (props) => {
  const {currentTask, taskList, acceptTask, declineTask, isBrowser, onTaskSelect, logger} = props;

  if (!taskList || Object.keys(taskList).length === 0) {
    return <></>; // hidden component
  }
  return (
    <ul className="task-list" data-testid="task-list">
      {Object.values(taskList)?.map((task, index) => {
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const callAssociationDetails = task?.data?.interaction?.callAssociatedDetails;
        const ani = callAssociationDetails?.ani;
        const customerName = callAssociationDetails?.customerName;
        const virtualTeamName = callAssociationDetails?.virtualTeamName;
        // rona timeout is not always available in the callAssociatedDetails object
        const ronaTimeout = callAssociationDetails?.ronaTimeout ? Number(callAssociationDetails?.ronaTimeout) : null;
        const taskState = task.data.interaction.state;
        const startTimeStamp = task.data.interaction.createdTimestamp;
        const isIncomingTask = taskState === 'new' || taskState === 'consult';
        const mediaType = task.data.interaction.mediaType;
        const mediaChannel = task.data.interaction.mediaChannel;
        const isTelephony = mediaType === MEDIA_CHANNEL.TELEPHONY;
        const isSocial = mediaType === MEDIA_CHANNEL.SOCIAL;
        const acceptText =
          isIncomingTask && !task.data.wrapUpRequired
            ? isTelephony && !isBrowser
              ? 'Ringing...'
              : 'Accept'
            : undefined;
        const declineText =
          isIncomingTask && !task.data.wrapUpRequired && isTelephony && isBrowser ? 'Decline' : undefined;
        logger.info('CC-Widgets: TaskList: rendering task list', {
          module: 'task-list.tsx',
          method: 'renderItem',
        });
        return (
          <Task
            interactionId={task.data.interactionId}
            title={isSocial ? customerName : ani}
            state={!isIncomingTask ? taskState : ''}
            startTimeStamp={startTimeStamp}
            selected={currentTask?.data.interactionId === task.data.interactionId}
            key={index}
            isIncomingTask={isIncomingTask}
            queue={virtualTeamName}
            acceptTask={() => acceptTask(task)}
            declineTask={() => declineTask(task)}
            ronaTimeout={isIncomingTask ? ronaTimeout : null}
            onTaskSelect={() => {
              logger.log(`CC-Widgets: TaskList: select task clicked for interactionId: ${task.data.interactionId}`, {
                module: 'task-list.tsx',
                method: 'onTaskSelect',
              });
              if (
                currentTask?.data.interactionId !== task.data.interactionId &&
                !(isIncomingTask && !task.data.wrapUpRequired)
              ) {
                onTaskSelect(task);
              }
            }}
            acceptText={acceptText}
            disableAccept={isIncomingTask && isTelephony && !isBrowser}
            declineText={declineText}
            mediaType={mediaType}
            mediaChannel={mediaChannel}
          />
        );
      })}
    </ul>
  );
};

export default TaskListComponent;
