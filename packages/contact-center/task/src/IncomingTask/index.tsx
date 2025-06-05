import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useIncomingTask} from '../helper';
import {IncomingTaskComponent} from '@webex/cc-components';
import {IncomingTaskProps} from '../task.types';

const IncomingTask: React.FunctionComponent<IncomingTaskProps> = observer(({incomingTask, onAccepted, onRejected}) => {
  const {deviceType, logger} = store;
  const result = useIncomingTask({incomingTask, onAccepted, onRejected, deviceType, logger});

  const props = {
    ...result,
    logger,
  };

  return <IncomingTaskComponent {...props} />;
});

export {IncomingTask};
