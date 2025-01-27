import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import CallControlPresentational from './call-control.presentational';

const CallControl: React.FunctionComponent<CallControlProps> = observer(({onHoldResume, onEnd, onWrapUp}) => {
  const {logger, currentTask, wrapupCodes} = store;

  const result = {...useCallControl({currentTask, onHoldResume, onEnd, onWrapUp, logger}), wrapupCodes};

  return <CallControlPresentational {...result} />;
});

export {CallControl};
