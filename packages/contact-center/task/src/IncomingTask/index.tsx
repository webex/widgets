import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useIncomingTask} from '../helper';
import {IncomingTaskComponent} from '@webex/cc-components';
import {IncomingTaskProps} from '@webex/cc-components';

const IncomingTask: React.FunctionComponent<IncomingTaskProps> = observer(({onAccepted, onDeclined}) => {
  const {deviceType, incomingTask, logger} = store;
  const result = useIncomingTask({incomingTask, onAccepted, onDeclined, deviceType, logger});

  const props = {
    ...result,
  };

  return <IncomingTaskComponent {...props} />;
});

export {IncomingTask};
