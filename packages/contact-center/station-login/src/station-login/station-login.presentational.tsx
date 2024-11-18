import React from 'react';
import {StationLoginPresentationalProps} from './station-login.types';

const StationLoginPresentational: React.FunctionComponent<StationLoginPresentationalProps> = (props) => {
  const {name, selectLoginOption, login, logout} = props;

  return (
    <>
      <h1 data-testid="station-login-heading">{name}</h1>
      <div className="box">
      <section className="sectionBox">
        <div className="sectionContent">
          <fieldset>
            <legend>Agent</legend>
            <div className="screenshareSection">
              <div style={{display: 'flex', gap: '1rem'}}>
                <fieldset style={{flex: 0.69}}>
                  <legend>Select Team</legend>
                  <select id="teamsDropdown" className="form-control w-auto my-3">Teams</select>
                </fieldset>
                <fieldset>
                  <legend>Agent Login</legend>
                  <select name="LoginOption" id="LoginOption" className="loginOption" onChange={selectLoginOption}>
                    <option value="" selected hidden>Choose Agent Login Option...</option>
                  </select>
                  <input id="dialNumber" name="dialNumber" placeholder="Extension/Dial Number" type="text"/>
                  <button id="AgentLogin" className="btn" onClick={login}>Login</button>
                  <button id="logoutAgent" className="btn" onClick={logout}>Logout</button>
                </fieldset>
              </div>
            </div>
          </fieldset>
        </div>
      </section>
    </div>
    </>
  );
};

export default StationLoginPresentational;
