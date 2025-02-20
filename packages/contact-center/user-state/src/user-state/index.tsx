import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {useUserState} from '../helper';
import {UserStateComponent, IUserState} from '@webex/cc-components';

interface UserStateProps {
  onStateChange: (state: string) => void;
}

const UserState: React.FunctionComponent<UserStateProps> = observer(({onStateChange}) => {
  const {cc, idleCodes, agentId, currentTheme, currentState, lastStateChangeTimestamp, customState, logger} = store;
  const props: IUserState = {
    ...useUserState({
      idleCodes,
      agentId,
      cc,
      currentState,
      customState,
      lastStateChangeTimestamp,
      logger,
      onStateChange
    }),
    currentTheme
  };

  return <UserStateComponent {...props} />;
});

export {UserState};
