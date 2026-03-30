import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {RealtimeTranscriptComponent} from '@webex/cc-components';
import {useRealtimeTranscript} from '../helper';
import {RealtimeTranscriptProps} from '../task.types';

const RealtimeTranscriptInternal: React.FunctionComponent<RealtimeTranscriptProps> = observer((props) => {
  const {currentTask, realtimeTranscriptLines} = store;
  console.log('pkesari_from component realtimeTranscriptLines', realtimeTranscriptLines);
  const result = useRealtimeTranscript({
    ...props,
    currentTaskId: currentTask?.data?.interactionId,
    realtimeTranscriptLines,
  });
  console.log('pkesari_from component result', result);
  return <RealtimeTranscriptComponent {...result} />;
});

const RealtimeTranscript: React.FunctionComponent<RealtimeTranscriptProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('RealtimeTranscript', error);
      }}
    >
      <RealtimeTranscriptInternal {...props} />
    </ErrorBoundary>
  );
};

export {RealtimeTranscript};
