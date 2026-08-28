import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlCADComponent, TelephonyActionToast} from '@webex/cc-components';
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
    consultTransferOptions,
    conferenceEnabled,
  }) => {
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
      enableWxBetterTogether,
      deviceType,
    } = store;

    if (currentTask && isUnacceptedCampaignPreview(currentTask, acceptedCampaignIds)) {
      return <></>;
    }

    const {telephonyToast, dismissTelephonyToast, ...callControlHookProps} = useCallControl({
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
      enableWxBetterTogether,
      widgetName: 'CallControlCAD',
    });

    const result = {
      ...callControlHookProps,
      wrapupCodes,
      consultStartTimeStamp,
      callControlAudio,
      callControlClassName,
      callControlConsultClassName,
      allowConsultToQueue,
      logger,
      consultTransferOptions,
      enableWxBetterTogether,
      agentDeviceType: deviceType,
    };

    if (!currentTask) {
      return <></>;
    }

    return (
      <>
        <CallControlCADComponent {...result} />
        {telephonyToast ? (
          <TelephonyActionToast error={telephonyToast.error} onDismiss={dismissTelephonyToast} />
        ) : null}
      </>
    );
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
