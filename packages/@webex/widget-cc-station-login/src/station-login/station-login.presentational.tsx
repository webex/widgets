import React from 'react';
import {IStationLoginPresentationalProps} from './station-login.types';

const StationLoginPresentational: React.FunctionComponent<IStationLoginPresentationalProps> = (props) => {
  const {selectLoginOption, login} = props;

  return (
    <>
      <h1 data-testid="station-login-heading">{props.name}</h1>
      {/* <h4>Station Login State: {props.loginState}</h4>
      <button onClick={() => props.setLoginState('Logged In')}>Click to change state</button> */}
      <div className="box">
      <section className="section-box">
        <h2 className="collapsible">
          Station Login
          <i className="arrow fa fa-angle-down" aria-hidden="true"></i>
        </h2>
  
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
                  <input id="dialNumber" name="dialNumber" placeholder="Dial Number" value="" type="text"/>
                  <button id="Agentlogin" disabled className="btn btn-primary my-3" onClick={login}>Login</button>
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
