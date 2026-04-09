import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {RealTimeTranscriptComponent} from '@webex/cc-components';
import {useRealTimeTranscript} from '../helper';
import {RealTimeTranscriptProps} from '../task.types';

const RealTimeTranscriptInternal: React.FunctionComponent<RealTimeTranscriptProps> = observer((props) => {
  const {currentTask, realtimeTranscriptLines} = store;
  const result = useRealTimeTranscript({
    ...props,
    currentTaskId: currentTask?.data?.interactionId,
    realtimeTranscriptLines,
  });
  return <RealTimeTranscriptComponent {...result} />;
});

const RealTimeTranscript: React.FunctionComponent<RealTimeTranscriptProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('RealTimeTranscript', error);
      }}
    >
      <RealTimeTranscriptInternal {...props} />
    </ErrorBoundary>
  );
};

export {RealTimeTranscript};
