import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react';

import {useUserState} from '../helper';
import UserStatePresentational from './user-state.presentational';

const UserState: React.FunctionComponent = observer(() => {
  const {} = store;
  const result = useUserState();
  const props = {
    ...result,
  };

  return <UserStatePresentational {...props} />;
});

export {UserState};
