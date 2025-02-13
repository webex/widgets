import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useIncomingTask} from '../helper';
import IncomingTaskPresentational from './incoming-task.presentational';
import {IncomingTaskProps} from '../task.types';

const IncomingTaskComponent: React.FunctionComponent<IncomingTaskProps> = ({onAccepted, onDeclined}) => {
  const {cc, deviceType, incomingTask, logger} = store;
  const result = useIncomingTask({cc, incomingTask, onAccepted, onDeclined, deviceType, logger});

  const props = {
    ...result,
  };

  return <IncomingTaskPresentational {...props} />;
};

const IncomingTask = observer(IncomingTaskComponent);
export {IncomingTask};
