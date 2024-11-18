import React from 'react';

import {IUserState} from './use-state.types';

/**
 * Presentational component for the User State.
 */
const UserStatePresentational: React.FunctionComponent<IUserState> = (props) => {
  return (
    <>
      <h1 data-testid="user-state-heading">{props.name}</h1>
      <h4>User State: {props.loginState}</h4>
    </>
  );
};

export default UserStatePresentational;
