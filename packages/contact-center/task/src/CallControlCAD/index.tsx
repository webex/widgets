import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store, {ITask} from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlCADComponent} from '@webex/cc-components';

const CAMPAIGN_PREVIEW_OUTBOUND_TYPES = ['STANDARD_PREVIEW_CAMPAIGN', 'DIRECT_PREVIEW_CAMPAIGN'];
const CAMPAIGN_PREVIEW_CAMPAIGN_TYPES = ['preview_standard', 'preview_direct'];

const isCampaignPreviewTask = (task: ITask): boolean => {
  const outboundType = task.data.interaction.outboundType ?? '';
  const cpd = task.data.interaction.callProcessingDetails as unknown as Record<string, string | undefined>;
  const campaignType = cpd?.campaignType ?? '';

  return (
    CAMPAIGN_PREVIEW_OUTBOUND_TYPES.includes(outboundType) || CAMPAIGN_PREVIEW_CAMPAIGN_TYPES.includes(campaignType)
  );
};

const isUnacceptedCampaignPreview = (task: ITask, acceptedCampaignIds: Set<string>): boolean => {
  if (!isCampaignPreviewTask(task)) return false;

  return !acceptedCampaignIds.has(task.data.interactionId);
};

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

    const isCampaignCall = currentTask ? isCampaignPreviewTask(currentTask) : false;

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
      isCampaignCall,
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
