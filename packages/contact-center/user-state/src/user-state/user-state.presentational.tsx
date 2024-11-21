import React from 'react';

import {IUserState} from './use-state.types';

const UserStatePresentational: React.FunctionComponent<IUserState> = (props) => {
  const {handleAgentStatus, setAgentStatus} = props;

  return (
    <>
      <h1 data-testid="user-state-heading">{props.name}</h1>
      <h4>User State: {}</h4>
    </>
  );
};

export default UserStatePresentational;
