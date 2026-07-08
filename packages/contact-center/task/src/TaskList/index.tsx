import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {TaskListComponent} from '@webex/cc-components';
import {useTaskList} from '../helper';
import {TaskListProps} from '../task.types';

const TaskListInternal: React.FunctionComponent<TaskListProps> = observer(
  ({onTaskAccepted, onTaskDeclined, onTaskSelected, hasCampaignPreviewEnabled}) => {
    const {cc, taskList, currentTask, logger, agentId, acceptedCampaignIds, isDeclineButtonEnabled, deviceType} = store;

    const result = useTaskList({cc, logger, taskList, onTaskAccepted, onTaskDeclined, onTaskSelected});
    const props = {
      ...result,
      cc,
      currentTask,
      logger,
      agentId,
      isDeclineButtonEnabled,
      isBrowser: deviceType === 'BROWSER',
      hasCampaignPreviewEnabled,
      acceptedCampaignIds,
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
