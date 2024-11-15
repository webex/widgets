import React from 'react';
import {IStationLoginPresentationalProps} from './station-login.types';

const StationLoginPresentational: React.FunctionComponent<IStationLoginPresentationalProps> = (props) => {
  const {selectLoginOption, login, logout} = props;

  return (
    <>
      <h1 data-testid="station-login-heading">{props.name}</h1>
      <div className="box">
      <section className="section-box">
        <div className="section-content">
          <fieldset>
            <legend>Agent</legend>
            <div className="screenshare-section">
              <div style={{display: 'flex', gap: '1rem'}}>
                <fieldset style={{flex: 0.69}}>
                  <legend>Select Team</legend>
                  <select id="teamsDropdown" className="form-control w-auto my-3">Teams</select>
                </fieldset>
                <fieldset>
                  <legend>Agent Login</legend>
                  <select name="LoginOption" id="LoginOption" className="LoginOption" onChange={selectLoginOption}>
                    <option value="" selected hidden>Choose Agent Login ...</option>
                  </select>
                  <input id="dialNumber" name="dialNumber" placeholder="Extension/Dial Number" type="text"/>
                  <button id="AgentLogin" className="btn btn-primary my-3" onClick={login}>Login</button>
                  <button id="logoutAgent" className="btn btn-primary my-3 ml-2" onClick={logout}>Logout Agent</button>
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
