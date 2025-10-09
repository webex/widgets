import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlCADComponent} from '@webex/cc-components';

const CallControlCADInternal: React.FunctionComponent<CallControlProps> = observer(
  ({
    onHoldResume,
    onEnd,
    onWrapUp,
    onRecordingToggle,
    onToggleMute,
    callControlClassName,
    callControlConsultClassName,
    consultTransferOptions,
  }) => {
    const {
      logger,
      currentTask,
      wrapupCodes,
      consultInitiated,
      consultAccepted,
      consultStartTimeStamp,
      callControlAudio,
      consultCompleted,
      isEndConsultEnabled,
      allowConsultToQueue,
      featureFlags,
      deviceType,
      isMuted,
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
        consultInitiated,
        deviceType,
        featureFlags,
        isMuted,
      }),
      wrapupCodes,
      consultInitiated,
      consultCompleted,
      consultAccepted,
      consultStartTimeStamp,
      callControlAudio,
      callControlClassName,
      callControlConsultClassName,
      isEndConsultEnabled,
      allowConsultToQueue,
      logger,
      consultTransferOptions,
    };

    return <CallControlCADComponent {...result} />;
  }
);

const CallControlCAD: React.FunctionComponent<CallControlProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('CallControlCAD', error);
      }}
    >
      <CallControlCADInternal {...props} />
    </ErrorBoundary>
  );
};

export {CallControlCAD};
