import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {TaskListComponent} from '@webex/cc-components';
import {useTaskList} from '../helper';
import {TaskListProps} from '../task.types';

const TaskList: React.FunctionComponent<TaskListProps> = observer(
  ({onTaskAccepted, onTaskDeclined, onTaskSelected}) => {
    const {cc, taskList, currentTask, deviceType, logger} = store;

    const result = useTaskList({cc, deviceType, logger, taskList, onTaskAccepted, onTaskDeclined, onTaskSelected});
    const props = {
      ...result,
      currentTask,
      logger,
    };

    return (
      <div data-widget-id="task-list">
        <TaskListComponent {...props} />
      </div>
    );
  }
);

export {TaskList};
