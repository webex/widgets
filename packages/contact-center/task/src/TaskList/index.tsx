import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {TaskListComponent} from '@webex/cc-components';
import {useTaskList} from '../helper';
import {TaskListProps} from '@webex/cc-components';

const TaskList: React.FunctionComponent<TaskListProps> = observer(({onTaskAccepted, onTaskDeclined}) => {
  const {cc, taskList, currentTask, deviceType, logger} = store;

  const result = useTaskList({cc, deviceType, logger, taskList, onTaskAccepted, onTaskDeclined});
  const props = {
    ...result,
    currentTask,
  };

  return <TaskListComponent {...props} />;
});

export {TaskList};
