import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import TaskListPresentational from './task-list.presentational';
import {useTaskList} from '../helper';

const TaskList: React.FunctionComponent = observer(() => {
  const {cc, currentTask, selectedLoginOption, logger} = store;

  const result = useTaskList({cc, selectedLoginOption, logger});
  const props = {
    ...result,
    currentTask,
  };

  return <TaskListPresentational {...props} />;
});

export {TaskList};
