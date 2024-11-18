import React, {useEffect} from 'react';
import {StationLoginPresentationalProps} from './station-login.types';

const StationLoginPresentational: React.FunctionComponent<StationLoginPresentationalProps> = (props) => {
  const {name, teams, loginOptions, login, logout, setDeviceType, setDialNumber, setTeam} = props; // TODO: Use the  loginSuccess, loginFailure, logoutSuccess props returned fromthe API response via helper file to reflect UI changes

  useEffect(() => {
    const teamsDropdown = document.getElementById('teamsDropdown') as HTMLSelectElement;
    const agentLogin = document.querySelector('#LoginOption') as HTMLSelectElement;
    const dialNumber = document.querySelector('#dialNumber') as HTMLInputElement;
    if (teamsDropdown) {
      teamsDropdown.innerHTML = '';
      if (teams) {
        teams.forEach((team) => {
          const option = document.createElement('option');
          option.value = team.id;
          option.text = team.name;
          teamsDropdown.add(option);
        });
        setTeam(teamsDropdown.value);
        dialNumber.value = '';
        dialNumber.disabled = true;
      }
    }
    if (loginOptions.length > 0) {
      loginOptions.forEach((options)=> {
        const option = document.createElement('option');
        option.text = options;
        option.value = options;
        agentLogin.add(option);
      });
    }
  }, [teams, loginOptions]);

  const selectLoginOption = (event: { target: { value: string; }; }) => {
    const dialNumber = document.querySelector('#dialNumber') as HTMLInputElement;
    const deviceType = event.target.value;
    setDeviceType(deviceType);
    if (deviceType === 'AGENT_DN' || deviceType === 'EXTENSION') {
      dialNumber.disabled = false;
    } else {
      dialNumber.disabled = true;
    }
  };

  function updateDN() {
    const dialNumber = document.querySelector('#dialNumber') as HTMLInputElement;
    setDialNumber(dialNumber.value);
  }

  return (
    <><h1 data-testid="station-login-heading">{name}</h1>
      <div className='box'>
      <section className='sectionBox'>
      <div className='sectionContent'>
        <fieldset>
          <legend>Agent</legend>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <fieldset style={{ flex: 0.69 }}>
                <legend>Select Team</legend>
                <select id="teamsDropdown" className="form-control w-auto my-3">Teams</select>
              </fieldset>
              <fieldset>
                <legend>Agent Login</legend>
                <select name="LoginOption" id="LoginOption" className="loginOption" onChange={selectLoginOption}>
                  <option value="" selected hidden>Choose Agent Login Option...</option>
                </select>
                <input id="dialNumber" name="dialNumber" placeholder="Extension/Dial Number" type="text" onInput={updateDN} />
                <button id="AgentLogin" className='btn btn-primary my-3' onClick={login}>Login</button>
                <button id="logoutAgent" className='btn btn-primary my-3 ml-2' onClick={logout}>Logout</button>
              </fieldset>
            </div>
          </div>
        </fieldset>
      </div>
    </section>
    </div></>
  );
};

export default StationLoginPresentational;
