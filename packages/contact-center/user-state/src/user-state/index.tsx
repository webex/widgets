import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {useUserState} from '../helper';
import {UserStateComponent, IUserState} from '@webex/cc-components';
import {IUserStateProps} from '../user-state.types';

const UserState: React.FunctionComponent<IUserStateProps> = observer(({onStateChange}) => {
  const {
    cc,
    idleCodes,
    agentId,
    currentTheme,
    currentState,
    lastStateChangeTimestamp,
    lastIdleCodeChangeTimestamp,
    customState,
    logger,
  } = store;
  const props: IUserState = {
    ...useUserState({
      idleCodes,
      agentId,
      cc,
      currentState,
      customState,
      lastStateChangeTimestamp,
      logger,
      onStateChange,
      lastIdleCodeChangeTimestamp,
    }),
    currentTheme,
    customState,
  };

  return <UserStateComponent {...props} />;
});

export {UserState};
