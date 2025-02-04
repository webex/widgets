import React from 'react';
import {observer} from 'mobx-react-lite';

import store from '@webex/cc-store';
import {useIncomingTask} from '../helper';
import {IncomingTaskPresentational, IncomingTaskProps} from '@webex/cc-components';

const IncomingTask: React.FunctionComponent<IncomingTaskProps> = observer(({onAccepted, onDeclined}) => {
  const {cc, selectedLoginOption, logger, currentTheme} = store;
  const props: IncomingTaskProps = {
    ...useIncomingTask({
      cc,
      onAccepted,
      onDeclined,
      selectedLoginOption,
      logger
    }),
    currentTheme
  }

  return <IncomingTaskPresentational {...props}/>;
})

export {IncomingTask};
