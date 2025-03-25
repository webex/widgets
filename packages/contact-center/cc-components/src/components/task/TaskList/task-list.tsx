import React from 'react';
import {TaskListPresentationalProps} from '../task.types';
import Task from '../Task';
import './styles.scss';

const TaskListComponent: React.FunctionComponent<TaskListPresentationalProps> = (props) => {
  const {currentTask, taskList, acceptTask, declineTask, isBrowser} = props;
  if (taskList.length <= 0) {
    return <></>; // hidden component
  }
  return (
    <ul className="task-list">
      {taskList?.map((task, index) => {
        const callAssociationDetails = task?.data?.interaction?.callAssociatedDetails;
        const ani = callAssociationDetails?.ani;
        const virtualTeamName = callAssociationDetails?.virtualTeamName;
        // rona timeout is not always available in the callAssociatedDetails object
        const ronaTimeout = callAssociationDetails?.ronaTimeout ? Number(callAssociationDetails?.ronaTimeout) : null;
        const taskState = task.data.interaction.state;
        const startTimeStamp = task.data.interaction.createdTimestamp;
        const isIncomingTask = taskState === 'new';
        return (
          <Task
            title={ani}
            state={!isIncomingTask ? taskState : ''}
            startTimeStamp={startTimeStamp}
            selected={currentTask?.data.interactionId === task.data.interactionId}
            key={index}
            isIncomingTask={isIncomingTask}
            queue={virtualTeamName}
            acceptTask={() => acceptTask(task)}
            declineTask={() => declineTask(task)}
            isBrowser={isBrowser}
            ronaTimeout={isIncomingTask ? ronaTimeout : null}
          />
        );
      })}
    </ul>
  );
};

export default TaskListComponent;
