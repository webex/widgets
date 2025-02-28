import React from 'react';
import {TaskListPresentationalProps} from '../task.types';
import Task from '../Task';
import './styles.scss';

const TaskListPresentational: React.FunctionComponent<TaskListPresentationalProps> = (props) => {
  console.log('props', props);
  const {currentTask, taskList, acceptTask, declineTask, isBrowser} = props;
  if (taskList.length <= 0) {
    return <></>; // hidden component
  }
  console.log('currentTask', currentTask, 'taskList', taskList);

  const newTask = {
    ...taskList[0],
    data: {
      ...taskList[0].data,
      interactionId: '342342342323',
      interaction: {...taskList[0].data.interaction, state: 'connected'},
    },
  };

  const mockList = [taskList[0], newTask];
  return (
    <ul className="task-list">
      {mockList?.map((task, index) => {
        const {ani, virtualTeamName} = task.data.interaction.callAssociatedDetails;
        // rona timeout is not always available in the callAssociatedDetails object
        const ronaTimeout =
          task?.data?.interaction?.callAssociationDetails?.ronaTimeout ||
          task?.data?.interaction?.callAssociatedData?.ronaTimeout?.value ||
          task.data?.interaction?.callProcessingDetails?.ronaTimeout;
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

export default TaskListPresentational;
