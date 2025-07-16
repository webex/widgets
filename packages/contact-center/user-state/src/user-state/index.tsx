import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {useUserState} from '../helper';
import {UserStateComponent, UserStateComponentsProps} from '@webex/cc-components';
import {IUserStateProps} from '../user-state.types';

const UserState: React.FunctionComponent<IUserStateProps> = observer(({onStateChange}) => {
  const {
    cc,
    idleCodes,
    agentId,
    currentState,
    lastStateChangeTimestamp,
    lastIdleCodeChangeTimestamp,
    customState,
    logger,
  } = store;
  const props: UserStateComponentsProps = {
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
    customState,
    logger,
  };

  return <UserStateComponent {...props} />;
});

export {UserState};
