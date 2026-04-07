import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useIncomingTask} from '../helper';
import {IncomingTaskComponent} from '@webex/cc-components';
import {IncomingTaskProps} from '../task.types';

const IncomingTaskInternal: React.FunctionComponent<IncomingTaskProps> = observer(
  ({incomingTask, onAccepted, onRejected}) => {
    const {logger, isDeclineButtonEnabled} = store;
    const result = useIncomingTask({incomingTask, onAccepted, onRejected, logger});

    const props = {
      ...result,
      logger,
      isDeclineButtonEnabled,
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
