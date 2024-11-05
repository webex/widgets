import React from 'react';
import {useUserState} from '../hooks';
import UserStatePresentational from './user-state.presentational';
import store from '@webex/widget-provider';
import {observer} from 'mobx-react';
import r2wc from '@r2wc/react-to-web-component';

const UserState: React.FunctionComponent = observer(() => {
  const {loginState, setLoginState, ccSdk, isAvailable} = store;
  const result = useUserState();
  const props = {
    ...result,
    loginState,
    setLoginState,
    ccSdk,
    isAvailable,
  };

  return <UserStatePresentational {...props} />;
});

const WebUserState = r2wc(UserState);

export {UserState, WebUserState};
