import React from 'react';
import {observer} from 'mobx-react';

import store from '@webex/cc-store';
import {useIncomingTask} from '../helper';
import IncomingTaskPresentational from './incoming-task.presentational';

const IncomingTask: React.FunctionComponent = observer(() => {
  const {cc, selectedLoginOption, onAccepted, onDeclined} = store;

  const result = useIncomingTask({cc, onAccepted, onDeclined, selectedLoginOption});

  const props = {
    ...result,
  };

  return <IncomingTaskPresentational {...props} />;
});

export {IncomingTask};
