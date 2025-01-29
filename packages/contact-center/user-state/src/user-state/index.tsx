import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {useUserState} from '../helper';
import UserStatePresentational from './user-state.presentational';
import {IUserState} from './use-state.types';

const UserStateComponent: React.FunctionComponent = () => {
  const {cc, idleCodes, agentId} = store;
  const props: IUserState = useUserState({
    idleCodes,
    agentId,
    cc,
  });

  return <UserStatePresentational {...props} />;
};

const UserState = observer(UserStateComponent);
export {UserState};
