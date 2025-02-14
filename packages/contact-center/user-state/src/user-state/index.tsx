import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {useUserState} from '../helper';
import {UserStateComponent, IUserState} from '@webex/cc-components';

interface UserStateProps {
  onStateChange: (state: string) => void;
}

const UserState: React.FunctionComponent<UserStateProps> = observer(({onStateChange}) => {
  const {cc, idleCodes, agentId, currentTheme, currentState, customStatus, lastStateChangeTimestamp} = store;
  const props: IUserState = {
    ...useUserState({
      idleCodes,
      agentId,
      cc,
      currentState,
      customStatus,
      lastStateChangeTimestamp,
      onStateChange,
    }),
    currentTheme,
  }

  return <UserStateComponent {...props} />;
});

export {UserState};
