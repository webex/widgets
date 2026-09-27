import React, {useEffect} from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {AISummaryStatusDetail, CallControlProps, useCallControlProps} from '../task.types';
import {CallControlComponent, TelephonyActionToast} from '@webex/cc-components';
import {isUnacceptedCampaignPreview} from '../Utils/task-util';

type CallControlControlsProps = CallControlProps & useCallControlProps;

const AISummaryStatusDrain: React.FunctionComponent<Pick<CallControlProps, 'onAISummaryStatusChange'>> = observer(
  ({onAISummaryStatusChange}) => {
    const pendingAISummaryStatusTransitions = store.getPendingAISummaryStatusTransitions();

    useEffect(() => {
      if (!onAISummaryStatusChange) {
        return;
      }

      for (const transition of pendingAISummaryStatusTransitions) {
        if (!store.acknowledgeAISummaryStatusTransition(transition.sequence)) {
          continue;
        }

        const detail: AISummaryStatusDetail = {
          kind: transition.kind,
          state: transition.state,
        } as AISummaryStatusDetail;

        try {
          onAISummaryStatusChange(detail);
        } catch {
          // Host callbacks are isolated from the widget and acknowledged at most once.
        }
      }
    }, [onAISummaryStatusChange, pendingAISummaryStatusTransitions]);

    return null;
  }
);

const CallControlControls: React.FunctionComponent<CallControlControlsProps> = observer(
  ({
    currentTask,
    onHoldResume,
    onEnd,
    onWrapUp,
    onRecordingToggle,
    onToggleMute,
    consultTransferOptions,
    conferenceEnabled,
    logger,
    isMuted,
    agentId,
    enableWxBetterTogether,
  }) => {
    const {wrapupCodes, consultStartTimeStamp, callControlAudio, allowConsultToQueue, deviceType} = store;

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
      widgetName: 'CallControl',
    });

    const result = {
      ...callControlHookProps,
      wrapupCodes,
      consultStartTimeStamp,
      callControlAudio,
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
        <CallControlComponent {...result} />
        {telephonyToast ? (
          <TelephonyActionToast error={telephonyToast.error} onDismiss={dismissTelephonyToast} />
        ) : null}
      </>
    );
  }
);

const CallControlInternal: React.FunctionComponent<CallControlProps> = observer(
  ({onHoldResume, onEnd, onWrapUp, onRecordingToggle, onToggleMute, consultTransferOptions, conferenceEnabled}) => {
    const {logger, currentTask, isMuted, agentId, acceptedCampaignIds, enableWxBetterTogether} = store;

    // Hide call control when the current task is a campaign preview that
    // the agent has not yet accepted. Matches agent desktop behavior where
    // call controls are only shown after the preview contact is accepted.
    if (currentTask && isUnacceptedCampaignPreview(currentTask, acceptedCampaignIds)) {
      return <></>;
    }

    return (
      <CallControlControls
        currentTask={currentTask}
        onHoldResume={onHoldResume}
        onEnd={onEnd}
        onWrapUp={onWrapUp}
        onRecordingToggle={onRecordingToggle}
        onToggleMute={onToggleMute}
        consultTransferOptions={consultTransferOptions}
        conferenceEnabled={conferenceEnabled}
        logger={logger}
        isMuted={isMuted}
        agentId={agentId}
        enableWxBetterTogether={enableWxBetterTogether}
      />
    );
  }
);

const CallControl: React.FunctionComponent<CallControlProps> = (props) => {
  return (
    <>
      <AISummaryStatusDrain onAISummaryStatusChange={props.onAISummaryStatusChange} />
      <ErrorBoundary
        fallbackRender={() => <></>}
        onError={(error: Error) => {
          if (store.onErrorCallback) store.onErrorCallback('CallControl', error);
        }}
      >
        <CallControlInternal {...props} />
      </ErrorBoundary>
    </>
  );
};

export {CallControl};
