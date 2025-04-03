import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlComponentNew} from '@webex/cc-components';

const CallControl: React.FunctionComponent<CallControlProps> = observer(({onHoldResume, onEnd, onWrapUp}) => {
  const {logger, currentTask, deviceType, wrapupCodes, wrapupRequired} = store;
  const result = {
    ...useCallControl({currentTask, deviceType, onHoldResume, onEnd, onWrapUp, logger}),
    wrapupRequired,
    wrapupCodes,
  };

  return <CallControlComponentNew {...result} />;
});

export {CallControl};
