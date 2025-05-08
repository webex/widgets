import React from 'react';
import {IncomingTaskComponentProps} from '../task.types';
import Task from '../Task';

const IncomingTaskComponent: React.FunctionComponent<IncomingTaskComponentProps> = (props) => {
  const {incomingTask, isBrowser, accept, reject} = props;
  if (!incomingTask) {
    return <></>; // hidden component
  }

  const callAssociationDetails = incomingTask?.data?.interaction?.callAssociatedDetails;
  const ani = callAssociationDetails?.ani;
  const virtualTeamName = callAssociationDetails?.virtualTeamName;
  const ronaTimeout = callAssociationDetails?.ronaTimeout ? Number(callAssociationDetails?.ronaTimeout) : null;
  const startTimeStamp = incomingTask?.data?.interaction?.createdTimestamp;
  const isTelephony = incomingTask.data.interaction.mediaType === 'telephony';
  const acceptText = !incomingTask.data.wrapUpRequired ? (isTelephony && !isBrowser ? 'Ringing' : 'Accept') : undefined;
  const declineText = !incomingTask.data.wrapUpRequired && isTelephony && isBrowser ? 'Decline' : undefined;

  return (
    <Task
      interactionId={incomingTask.data.interactionId}
      title={ani}
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
    />
  );
};

export default IncomingTaskComponent;
