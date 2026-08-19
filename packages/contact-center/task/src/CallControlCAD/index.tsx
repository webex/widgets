import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlCADComponent} from '@webex/cc-components';
import {isUnacceptedCampaignPreview} from '../Utils/task-util';
import {ITask} from '@webex/contact-center';

type ConsultTransferInteractionContext = {
  contactDirectionType?: string;
  outdialTransferToQueueEnabled?: boolean;
  mediaType?: string;
};

const buildConsultTransferInteractionContext = (currentTask?: ITask): ConsultTransferInteractionContext => {
  const interaction = currentTask?.data?.interaction as
    | {
        contactDirection?: {type?: string};
        outdialTransferToQueueEnabled?: boolean;
        mediaType?: string;
      }
    | undefined;

  return {
    contactDirectionType: interaction?.contactDirection?.type,
    outdialTransferToQueueEnabled: interaction?.outdialTransferToQueueEnabled,
    mediaType: interaction?.mediaType,
  };
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
      accessQueue,
      accessEntryPoint,
      accessBuddyTeam,
      isMuted,
      agentId,
      acceptedCampaignIds,
    } = store;

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
      callControlClassName,
      callControlConsultClassName,
      allowConsultToQueue,
      accessQueue,
      accessEntryPoint,
      accessBuddyTeam,
      interactionContext: buildConsultTransferInteractionContext(currentTask),
      logger,
      consultTransferOptions,
    };

    if (!currentTask) {
      return <></>;
    }

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
