import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlCADComponent} from '@webex/cc-components';

const CallControlCAD: React.FunctionComponent<CallControlProps> = observer(
  ({onHoldResume, onEnd, onWrapUp, onRecordingToggle, callControlClassName, callControlConsultClassName}) => {
    const {
      logger,
      currentTask,
      wrapupCodes,
      consultInitiated,
      consultAccepted,
      consultStartTimeStamp,
      callControlAudio,
      consultCompleted,
      isEndConsultEnabled,
      allowConsultToQueue,
      featureFlags,
      deviceType,
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
      callControlClassName,
      callControlConsultClassName,
      isEndConsultEnabled,
      allowConsultToQueue,
      logger,
    };

    return (
      <div data-widget-id="call-control-cad">
        <CallControlCADComponent {...result} />
      </div>
    );
  }
);

export {CallControlCAD};
