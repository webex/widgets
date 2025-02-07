import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {useUserState} from '../helper';
import {UserStateComponent, IUserState} from '@webex/cc-components';

const UserState: React.FunctionComponent = observer(() => {
  const {cc, idleCodes, agentId, currentTheme, customStatus} = store;
  const props: IUserState = {
    ...useUserState({
      idleCodes,
      agentId,
      cc
    }),
    currentTheme,
    customStatus
  }

  return <UserStateComponent {...props}/>;
});

export {UserState};
