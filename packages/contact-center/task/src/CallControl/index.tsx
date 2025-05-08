import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlComponent} from '@webex/cc-components';

const CallControl: React.FunctionComponent<CallControlProps> = observer(({onHoldResume, onEnd, onWrapUp}) => {
  const {
    logger,
    currentTask,
    wrapupCodes,
    consultInitiated,
    consultCompleted,
    consultAccepted,
    consultStartTimeStamp,
    callControlAudio,
    deviceType,
    featureFlags,
    isEndConsultEnabled,
    allowConsultToQueue,
  } = store;

  const result = {
    ...useCallControl({currentTask, onHoldResume, onEnd, onWrapUp, logger, consultInitiated, deviceType, featureFlags}),
    wrapupCodes,
    consultInitiated,
    consultCompleted,
    consultAccepted,
    consultStartTimeStamp,
    callControlAudio,
    isEndConsultEnabled,
    allowConsultToQueue,
  };
  return <CallControlComponent {...result} />;
});

export {CallControl};
