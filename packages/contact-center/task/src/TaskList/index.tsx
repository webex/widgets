import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react';

import TaskListPresentational from './task-list.presentational';
import {useTaskList} from '../helper';

const TaskList: React.FunctionComponent = observer(() => {
  const {cc} = store;

  const {taskList} = useTaskList({cc});

  const props = {
    taskList,
  };

  return <TaskListPresentational {...props} />;
});

export {TaskList};
