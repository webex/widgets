import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react';
import r2wc from '@r2wc/react-to-web-component';

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

const WebUserState = r2wc(UserState);

if (!customElements.get('widget-cc-user-state')) {
  customElements.define('widget-cc-user-state', WebUserState);
}

export {UserState, WebUserState};
