import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useIncomingTask} from '../helper';
import {IncomingTaskComponent} from '@webex/cc-components';
import {IncomingTaskProps} from '../task.types';

const IncomingTaskInternal: React.FunctionComponent<IncomingTaskProps> = observer(
  ({incomingTask, onAccepted, onRejected}) => {
    const {logger, isDeclineButtonEnabled, deviceType, taskList} = store;
    const interactionId = incomingTask?.data?.interactionId;
    const liveIncomingTask = interactionId && taskList[interactionId] ? taskList[interactionId] : incomingTask;

    if (interactionId && liveIncomingTask !== incomingTask) {
      logger?.info('CC-Widgets: IncomingTask using live task from store.taskList', {
        module: 'IncomingTask',
        method: 'render',
        interactionId,
        acceptEnabled: liveIncomingTask?.uiControls?.main?.accept?.isEnabled,
      });
    }

    const result = useIncomingTask({incomingTask: liveIncomingTask, onAccepted, onRejected, logger});

    const props = {
      ...result,
      logger,
      isDeclineButtonEnabled,
      isBrowser: deviceType === 'BROWSER',
    };

    return <IncomingTaskComponent {...props} />;
  }
);

const IncomingTask: React.FunctionComponent<IncomingTaskProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('IncomingTask', error);
      }}
    >
      <IncomingTaskInternal {...props} />
    </ErrorBoundary>
  );
};

export {IncomingTask};
