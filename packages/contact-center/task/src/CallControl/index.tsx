import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlComponent} from '@webex/cc-components';

const CallControlInternal: React.FunctionComponent<CallControlProps> = observer(
  ({onHoldResume, onEnd, onWrapUp, onRecordingToggle, onToggleMute, consultTransferOptions, conferenceEnabled}) => {
    const {
      logger,
      currentTask,
      wrapupCodes,
      consultStartTimeStamp,
      callControlAudio,
      deviceType,
      featureFlags,
      allowConsultToQueue,
      isMuted,
      agentId,
    } = store;

    const result = {
      ...useCallControl({
        currentTask,
        onHoldResume,
        onEnd,
        onWrapUp,
        onRecordingToggle,
        onToggleMute,
        logger,
        deviceType,
        featureFlags,
        isMuted,
        conferenceEnabled,
        agentId,
      }),
      wrapupCodes,
      consultStartTimeStamp,
      callControlAudio,
      allowConsultToQueue,
      logger,
      consultTransferOptions,
    };

    return <CallControlComponent {...result} />;
  }
);

const CallControl: React.FunctionComponent<CallControlProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('CallControl', error);
      }}
    >
      <CallControlInternal {...props} conferenceEnabled={props.conferenceEnabled ?? true} />
    </ErrorBoundary>
  );
};

export {CallControl};
