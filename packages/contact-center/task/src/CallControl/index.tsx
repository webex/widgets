import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import CallControlPresentational from './call-control.presentational';

const CallControlComponent: React.FunctionComponent<CallControlProps> = ({onHoldResume, onEnd, onWrapUp}) => {
  const {logger, currentTask, wrapupCodes, wrapupRequired} = store;

  const result = useCallControl({currentTask, onHoldResume, onEnd, onWrapUp, wrapupRequired, logger});

  return <CallControlPresentational {...result} wrapupCodes={wrapupCodes} />;
};

const CallControl = observer(CallControlComponent);
export {CallControl};
