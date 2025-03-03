import React from 'react';
import {IncomingTaskPresentationalProps} from '../task.types';
import Task from '../Task';

const IncomingTaskPresentational: React.FunctionComponent<IncomingTaskPresentationalProps> = (props) => {
  const {incomingTask, accept, decline, isBrowser} = props;
  if (!incomingTask) {
    return <></>; // hidden component
  }

  const callAssociationDetails = incomingTask?.data?.interaction?.callAssociatedDetails;
  const ani = callAssociationDetails?.ani;
  const virtualTeamName = callAssociationDetails?.virtualTeamName;
  // rona timeout is not always available in the callAssociatedDetails object
  const ronaTimeout = callAssociationDetails?.ronaTimeout ? Number(callAssociationDetails?.ronaTimeout) : null;
  const startTimeStamp = incomingTask?.data?.interaction?.createdTimestamp;
  return (
    <Task
      title={ani}
      queue={virtualTeamName}
      isIncomingTask={true}
      isBrowser={isBrowser}
      acceptTask={accept}
      declineTask={decline}
      ronaTimeout={ronaTimeout}
      startTimeStamp={startTimeStamp}
    />
  );
};

export default IncomingTaskPresentational;
