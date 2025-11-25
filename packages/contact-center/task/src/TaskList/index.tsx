import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {TaskListComponent} from '@webex/cc-components';
import {useTaskList} from '../helper';
import {TaskListProps} from '../task.types';

const TaskListInternal: React.FunctionComponent<TaskListProps> = observer(
  ({onTaskAccepted, onTaskDeclined, onTaskSelected}) => {
    const {cc, taskList, currentTask, deviceType, logger, agentId} = store;

    const result = useTaskList({cc, deviceType, logger, taskList, onTaskAccepted, onTaskDeclined, onTaskSelected});
    const props = {
      ...result,
      currentTask,
      logger,
      agentId,
    };

    return <TaskListComponent {...props} />;
  }
);

const TaskList: React.FunctionComponent<TaskListProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('TaskList', error);
      }}
    >
      <TaskListInternal {...props} />
    </ErrorBoundary>
  );
};

export {TaskList};
