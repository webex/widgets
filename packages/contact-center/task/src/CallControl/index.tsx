import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {useCallControl} from '../helper';
import CallControlPresentational from './call-control.presentational';
import {CallControlProps} from '../task.types';

const CallControl: React.FunctionComponent<CallControlProps> = observer(({onHoldResume, onEnd, onWrapUp}) => {
  const {logger, currentTask, wrapupCodes} = store;

  const result = {...useCallControl({currentTask, onHoldResume, onEnd, onWrapUp, logger}), wrapupCodes};

  return <CallControlPresentational {...result} />;
});

export {CallControl};
