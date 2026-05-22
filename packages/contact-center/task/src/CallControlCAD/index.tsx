import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlCADComponent} from '@webex/cc-components';
import {isUnacceptedCampaignPreview} from '../Utils/task-util';

const CallControlCADInternal: React.FunctionComponent<CallControlProps> = observer(
  ({
    onHoldResume,
    onEnd,
    onWrapUp,
    onRecordingToggle,
    onToggleMute,
    callControlClassName,
    callControlConsultClassName,
    conferenceEnabled,
    consultTransferOptions,
  }) => {
    const {
      logger,
      currentTask,
      wrapupCodes,
      consultStartTimeStamp,
      callControlAudio,
      allowConsultToQueue,
      featureFlags,
      deviceType,
      isMuted,
      agentId,
      acceptedCampaignIds,
    } = store;

    const callControlProps = useCallControl({
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
    });

    if (!currentTask) {
      return <></>;
    }

    if (isUnacceptedCampaignPreview(currentTask, acceptedCampaignIds)) {
      return <></>;
    }

    const result = {
      ...callControlProps,
      wrapupCodes,
      consultStartTimeStamp,
      callControlAudio,
      callControlClassName,
      callControlConsultClassName,
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
      <CallControlCADInternal {...props} conferenceEnabled={props.conferenceEnabled ?? true} />
    </ErrorBoundary>
  );
};

export {CallControlCAD};
