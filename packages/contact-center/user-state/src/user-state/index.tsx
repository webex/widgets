import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {useUserState} from '../helper';
import UserStatePresentational from './user-state.presentational';
import {IUserState} from './use-state.types';

const UserState: React.FunctionComponent = observer(() => {
  const {cc, idleCodes, agentId} = store;
  const props: IUserState = useUserState({
    idleCodes,
    agentId,
    cc
  });

  return <UserStatePresentational {...props} />;
});

export {UserState};
