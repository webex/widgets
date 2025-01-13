import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import TaskListPresentational from './task-list.presentational';
import {useTaskList} from '../helper';

const TaskList: React.FunctionComponent = observer(() => {
  const {cc, selectedLoginOption, logger} = store;

  const result = useTaskList({cc, selectedLoginOption, logger});

  return <TaskListPresentational {...result} />;
});

export {TaskList};
