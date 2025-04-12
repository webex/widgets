import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useCallControl} from '../helper';
import {CallControlProps} from '../task.types';
import {CallControlCADComponent} from '@webex/cc-components';

const CallControlCAD: React.FunctionComponent<CallControlProps> = observer(({onHoldResume, onEnd, onWrapUp}) => {
  const {logger, currentTask, deviceType, wrapupCodes, wrapupRequired} = store;
  const result = {
    ...useCallControl({currentTask, deviceType, onHoldResume, onEnd, onWrapUp, logger}),
    wrapupRequired,
    wrapupCodes,
  };

  return <CallControlCADComponent {...result} />;
});

export {CallControlCAD};
