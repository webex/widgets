import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useIncomingTask} from '../helper';
import {IncomingTaskComponent} from '@webex/cc-components';
import {IncomingTaskProps} from '../task.types';

const IncomingTaskInternal: React.FunctionComponent<IncomingTaskProps> = observer(
  ({incomingTask, onAccepted, onRejected}) => {
    const {deviceType, logger} = store;
    const result = useIncomingTask({incomingTask, onAccepted, onRejected, deviceType, logger});

    const props = {
      ...result,
      logger,
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
