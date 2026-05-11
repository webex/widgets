import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store, {ITask} from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlComponent} from '@webex/cc-components';

const CAMPAIGN_PREVIEW_OUTBOUND_TYPES = ['STANDARD_PREVIEW_CAMPAIGN', 'DIRECT_PREVIEW_CAMPAIGN'];
const CAMPAIGN_PREVIEW_CAMPAIGN_TYPES = ['preview_standard', 'preview_direct'];

/**
 * Checks whether the task is a campaign preview that the agent has not
 * explicitly accepted.  Uses the store's acceptedCampaignIds as the
 * source of truth — the participants.hasJoined flag is unreliable
 * because CampaignContactUpdated payloads can set it even when the
 * agent only skipped or removed the preview.
 */
const isUnacceptedCampaignPreview = (task: ITask, acceptedCampaignIds: Set<string>): boolean => {
  const outboundType = task.data.interaction.outboundType ?? '';
  const cpd = task.data.interaction.callProcessingDetails as unknown as Record<string, string | undefined>;
  const campaignType = cpd?.campaignType ?? '';

  const isCampaignPreview =
    CAMPAIGN_PREVIEW_OUTBOUND_TYPES.includes(outboundType) || CAMPAIGN_PREVIEW_CAMPAIGN_TYPES.includes(campaignType);

  if (!isCampaignPreview) return false;

  return !acceptedCampaignIds.has(task.data.interactionId);
};

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

    // Hide call control when the current task is a campaign preview that
    // the agent has not yet accepted.  Matches agent desktop behavior where
    // call controls are only shown after the preview contact is accepted.
    if (isUnacceptedCampaignPreview(currentTask, acceptedCampaignIds)) {
      return <></>;
    }

    const result = {
      ...callControlProps,
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
