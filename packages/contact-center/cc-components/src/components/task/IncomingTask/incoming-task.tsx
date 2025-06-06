import React from 'react';
import {IncomingTaskComponentProps, MEDIA_CHANNEL} from '../task.types';
import Task from '../Task';

const IncomingTaskComponent: React.FunctionComponent<IncomingTaskComponentProps> = (props) => {
  const {incomingTask, isBrowser, accept, reject} = props;
  if (!incomingTask) {
    return <></>; // hidden component
  }

  const callAssociationDetails = incomingTask?.data?.interaction?.callAssociatedDetails;
  const ani = callAssociationDetails?.ani;
  const customerName = callAssociationDetails?.customerName;
  const virtualTeamName = callAssociationDetails?.virtualTeamName;
  const ronaTimeout = callAssociationDetails?.ronaTimeout ? Number(callAssociationDetails?.ronaTimeout) : null;
  const startTimeStamp = incomingTask?.data?.interaction?.createdTimestamp;
  const mediaType = incomingTask.data.interaction.mediaType;
  const mediaChannel = incomingTask.data.interaction.mediaChannel;
  const isTelephony = mediaType === MEDIA_CHANNEL.TELEPHONY;
  const isSocial = mediaType === MEDIA_CHANNEL.SOCIAL;
  const acceptText = !incomingTask.data.wrapUpRequired
    ? isTelephony && !isBrowser
      ? 'Ringing...'
      : 'Accept'
    : undefined;
  const declineText = !incomingTask.data.wrapUpRequired && isTelephony && isBrowser ? 'Decline' : undefined;

  return (
    <Task
      interactionId={incomingTask.data.interactionId}
      title={isSocial ? customerName : ani}
      state=""
      startTimeStamp={startTimeStamp}
      isIncomingTask={true}
      queue={virtualTeamName}
      acceptTask={() => accept(incomingTask)}
      declineTask={() => reject(incomingTask)}
      ronaTimeout={ronaTimeout}
      acceptText={acceptText}
      disableAccept={isTelephony && !isBrowser}
      declineText={declineText}
      styles="task-list-hover"
      mediaType={mediaType}
      mediaChannel={mediaChannel}
    />
  );
};

export default IncomingTaskComponent;
