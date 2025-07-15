import React from 'react';
import {observer} from 'mobx-react-lite';

import {withMetrics} from '@webex/ui-metrics';
import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlComponent} from '@webex/cc-components';

const CallControl: React.FunctionComponent<CallControlProps> = observer(
  ({onHoldResume, onEnd, onWrapUp, onRecordingToggle}) => {
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
      ...useCallControl({
        currentTask,
        onHoldResume,
        onEnd,
        onWrapUp,
        onRecordingToggle,
        logger,
        consultInitiated,
        deviceType,
        featureFlags,
      }),
      wrapupCodes,
      consultInitiated,
      consultCompleted,
      consultAccepted,
      consultStartTimeStamp,
      callControlAudio,
      isEndConsultEnabled,
      allowConsultToQueue,
      logger,
    };

    const CallControlWithMetrics = withMetrics(CallControlComponent, 'CallControl');
    return <CallControlWithMetrics {...result} />;
  }
);

export {CallControl};
