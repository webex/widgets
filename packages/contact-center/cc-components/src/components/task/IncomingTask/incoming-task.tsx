import React from 'react';
import {IncomingTaskComponentProps, MEDIA_CHANNEL} from '../task.types';
import Task from '../Task';
import {withMetrics} from '@webex/cc-ui-logging';
import {extractIncomingTaskData} from './incoming-task.utils';

const IncomingTaskComponent: React.FunctionComponent<IncomingTaskComponentProps> = (props) => {
  const {incomingTask, accept, reject, logger, acceptControl, declineControl, isDeclineButtonEnabled, isBrowser} =
    props;
  if (!incomingTask) {
    return <></>; // hidden component
  }

  // Extract all task data using the utility function
  const taskData = extractIncomingTaskData(
    incomingTask,
    logger,
    acceptControl,
    declineControl,
    isDeclineButtonEnabled,
    isBrowser
  );

  return (
    <Task
      interactionId={incomingTask.data.interactionId}
      title={taskData.title}
      state=""
      startTimeStamp={taskData.startTimeStamp}
      isIncomingTask={true}
      queue={taskData.virtualTeamName}
      acceptTask={() => {
        accept(incomingTask);
      }}
      declineTask={() => {
        reject(incomingTask);
      }}
      ronaTimeout={taskData.ronaTimeout}
      acceptText={taskData.acceptText}
      disableAccept={taskData.disableAccept}
      disableDecline={taskData.disableDecline}
      declineText={taskData.declineText}
      styles="task-list-hover"
      mediaType={taskData.mediaType as MEDIA_CHANNEL}
      mediaChannel={taskData.mediaChannel as MEDIA_CHANNEL}
    />
  );
};

const IncomingTaskComponentWithMetrics = withMetrics(IncomingTaskComponent, 'IncomingTask');
export default IncomingTaskComponentWithMetrics;
