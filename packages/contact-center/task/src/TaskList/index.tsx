import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react';
import r2wc from '@r2wc/react-to-web-component';

import TaskListPresentational from './task-list.presentational';
import {useIncomingTask, useTaskList} from '../helper';

const TaskList: React.FunctionComponent = observer(() => {
  const {cc, selectedLoginOption, onAccepted, onDeclined} = store;

  const {taskList} = useTaskList({cc});

  const props = {
    taskList,
  };

  return <TaskListPresentational {...props} />;
});

export {TaskList};
