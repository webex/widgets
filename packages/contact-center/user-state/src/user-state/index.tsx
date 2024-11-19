import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react';
import r2wc from '@r2wc/react-to-web-component';

import {useUserState} from '../helper';
import UserStatePresentational from './user-state.presentational';

const UserState: React.FunctionComponent = observer((incomingProps) => {
  const {loginState, setLoginState, ccSdk, isAvailable} = store;
  const result = useUserState(incomingProps, store);
  const props = {
    ...result,
    loginState,
    setLoginState,
    ccSdk,
    isAvailable,
  };

  return <UserStatePresentational {...props} />;
});

const WebUserState = r2wc(UserState, {
  props: {
    sdkConfig: Object,
  },
});

if (!customElements.get('widget-cc-user-state')) {
  customElements.define('widget-cc-user-state', WebUserState);
}

export {UserState, WebUserState};
