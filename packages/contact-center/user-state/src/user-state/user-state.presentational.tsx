import React from 'react';

import {IUserState} from './use-state.types';

const UserStatePresentational: React.FunctionComponent<IUserState> = (props) => {
  const {loginState, handleAgentStatus, setAgentStatus} = props;

  return (
    <>
      <h1 data-testid="user-state-heading">{props.name}</h1>
      <h4>User State: {props.loginState}</h4>
      <fieldset>
        <legend>Agent status</legend>
        <select name= "idleCodesDropdown" id="idleCodesDropdown" className="form-control w-auto my-3" onChange={handleAgentStatus}>
        <option value="" selected hidden>Select Idle Codes</option>
        </select>
        <button id="setAgentStatus" disabled className="btn btn-primary my-3 ml-2" onClick={setAgentStatus}>Set Agent
          Status</button>
      </fieldset>
    </>
  );
};

export default UserStatePresentational;
