import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import TaskListPresentational from './task-list.presentational';
import {useTaskList} from '../helper';

const TaskListComponent: React.FunctionComponent = () => {
  const {cc, taskList, currentTask, deviceType, logger} = store;

  const result = useTaskList({cc, deviceType, logger, taskList});
  const props = {
    ...result,
    currentTask,
  };

  return <TaskListPresentational {...props} />;
};

const TaskList = observer(TaskListComponent);
export {TaskList};
