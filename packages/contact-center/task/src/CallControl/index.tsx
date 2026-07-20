import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlComponent} from '@webex/cc-components';
import {isUnacceptedCampaignPreview} from '../Utils/task-util';

const CallControlInternal: React.FunctionComponent<CallControlProps> = observer(
  ({onHoldResume, onEnd, onWrapUp, onRecordingToggle, onToggleMute, consultTransferOptions, conferenceEnabled}) => {
    const {
      logger,
      currentTask,
      wrapupCodes,
      consultStartTimeStamp,
      callControlAudio,
      allowConsultToQueue,
      isMuted,
      agentId,
      acceptedCampaignIds,
    } = store;

    // Hide call control when the current task is a campaign preview that
    // the agent has not yet accepted. Matches agent desktop behavior where
    // call controls are only shown after the preview contact is accepted.
    if (currentTask && isUnacceptedCampaignPreview(currentTask, acceptedCampaignIds)) {
      return <></>;
    }

    const callControlProps = useCallControl({
      currentTask,
      onHoldResume,
      onEnd,
      onWrapUp,
      onRecordingToggle,
      onToggleMute,
      logger,
      isMuted,
      conferenceEnabled,
      agentId,
    });

    const result = {
      ...callControlProps,
      wrapupCodes,
      consultStartTimeStamp,
      callControlAudio,
      allowConsultToQueue,
      logger,
      consultTransferOptions,
    };

    if (!currentTask) {
      return <></>;
    }

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
      <CallControlInternal {...props} />
    </ErrorBoundary>
  );
};

export {CallControl};
