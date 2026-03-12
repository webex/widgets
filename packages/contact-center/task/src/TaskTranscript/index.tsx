import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {TaskTranscriptComponent} from '@webex/cc-components';
import {useTaskTranscript} from '../helper';
import {TaskTranscriptProps} from '../task.types';

const TaskTranscriptInternal: React.FunctionComponent<TaskTranscriptProps> = observer((props) => {
  const result = useTaskTranscript(props);
  return <TaskTranscriptComponent {...result} />;
});

const TaskTranscript: React.FunctionComponent<TaskTranscriptProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('TaskTranscript', error);
      }}
    >
      <TaskTranscriptInternal {...props} />
    </ErrorBoundary>
  );
};

export {TaskTranscript};
