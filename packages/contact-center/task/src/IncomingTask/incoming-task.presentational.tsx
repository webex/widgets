import React from 'react';
import {IncomingTaskPresentationalProps} from '../task.types';
import Task from '../Task';

const IncomingTaskPresentational: React.FunctionComponent<IncomingTaskPresentationalProps> = (props) => {
  const {incomingTask, accept, decline, isBrowser} = props;
  if (!incomingTask) {
    return <></>; // hidden component
  }

  const callAssociationDetails = incomingTask?.data?.interaction?.callAssociatedDetails;
  const {ani, virtualTeamName} = callAssociationDetails;
  // This value can be found many places and is not always available
  const ronaTimeout =
    callAssociationDetails?.ronaTimeout ||
    incomingTask?.data?.interaction?.callAssociatedData?.ronaTimeout?.value ||
    incomingTask?.data?.interaction?.callProcessingDetails?.ronaTimeout;
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
