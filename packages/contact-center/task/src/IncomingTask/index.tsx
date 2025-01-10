import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useIncomingTask} from '../helper';
import IncomingTaskPresentational from './incoming-task.presentational';
import {IncomingTaskProps} from '../task.types';

const IncomingTask: React.FunctionComponent<IncomingTaskProps> = observer(({onAccepted, onDeclined}) => {
  const {cc, selectedLoginOption} = store;

  const result = useIncomingTask({cc, onAccepted, onDeclined, selectedLoginOption});

  const props = {
    ...result,
  };

  return <IncomingTaskPresentational {...props} />;
});

export {IncomingTask};
