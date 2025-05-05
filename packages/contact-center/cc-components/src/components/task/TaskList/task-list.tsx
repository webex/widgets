import React from 'react';
import {TaskListComponentProps} from '../task.types';
import Task from '../Task';
import './styles.scss';

const TaskListComponent: React.FunctionComponent<TaskListComponentProps> = (props) => {
  const {currentTask, taskList, acceptTask, declineTask, isBrowser, onTaskSelect} = props;
  if (!taskList || Object.keys(taskList).length === 0) {
    return <></>; // hidden component
  }
  return (
    <ul className="task-list">
      {Object.values(taskList)?.map((task, index) => {
        const callAssociationDetails = task?.data?.interaction?.callAssociatedDetails;
        const ani = callAssociationDetails?.ani;
        const virtualTeamName = callAssociationDetails?.virtualTeamName;
        // rona timeout is not always available in the callAssociatedDetails object
        const ronaTimeout = callAssociationDetails?.ronaTimeout ? Number(callAssociationDetails?.ronaTimeout) : null;
        const taskState = task.data.interaction.state;
        const startTimeStamp = task.data.interaction.createdTimestamp;
        const isIncomingTask = taskState === 'new';
        const isTelephony = task.data.interaction.mediaType === 'telephony';
        const acceptText =
          isIncomingTask && !task.data.wrapUpRequired ? (isTelephony && !isBrowser ? 'Ringing' : 'Accept') : undefined;
        const declineText =
          isIncomingTask && !task.data.wrapUpRequired && isTelephony && isBrowser ? 'Decline' : undefined;
        return (
          <Task
            interactionId={task.data.interactionId}
            title={ani}
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
          />
        );
      })}
    </ul>
  );
};

export default TaskListComponent;
