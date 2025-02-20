import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import CallControlPresentational from './call-control.presentational';

const CallControlComponent: React.FunctionComponent<CallControlProps> = ({onHoldResume, onEnd, onWrapUp}) => {
  const {logger, currentTask, deviceType, wrapupCodes, wrapupRequired} = store;
  const result = {
    ...useCallControl({currentTask, deviceType, onHoldResume, onEnd, onWrapUp, logger}),
    wrapupRequired,
    wrapupCodes,
  };

  return <CallControlPresentational {...result} />;
};

const CallControl = observer(CallControlComponent);
export {CallControl};
