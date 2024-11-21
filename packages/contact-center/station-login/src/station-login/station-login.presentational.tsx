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

  const styles = {
    box: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto'
    },

    sectionBox: {
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '8px'
    },
    
    fieldset:  {
      border: '1px solid #ccc',
      borderRadius: '5px',
      padding: '10px',
      marginBottom: '20px'
    },
 
    legendBox: {
      fontWeight: 'bold',
      color: '#0052bf'
    },

    btn: {
      padding: '10px 20px',
      backgroundColor: '#0052bf',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background-color 0.3s',
      marginRight: '8px' 
    },

    select: {
      width: '100%',
      padding: '8px',
      marginTop: '8px',
      marginBottom: '12px',
      border: '1px solid #ccc',
      borderRadius: '4px'
    },

    input: {
      width: '97%',
      padding: '8px',
      marginTop: '8px',
      marginBottom: '12px',
      border: '1px solid #ccc',
      borderRadius: '4px'
    }
  }

  return (
    <><h1 data-testid="station-login-heading">{name}</h1>
      <div style={styles.box}>
      <section style={styles.sectionBox}>
        <fieldset style={styles.fieldset}>
        <legend style={styles.legendBox}>Agent</legend>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <fieldset style={{border: '1px solid #ccc', borderRadius: '5px', padding: '10px', marginBottom: '20px', flex: 0.69 }}>
                <legend style={styles.legendBox}>Select Team</legend>
                <select id="teamsDropdown" style={styles.select}>Teams</select>
              </fieldset>
              <fieldset style={styles.fieldset}>
                <legend style={styles.legendBox}>Agent Login</legend>
                <select name="LoginOption" id="LoginOption" style={styles.select} onChange={selectLoginOption}>
                  <option value="" selected hidden>Choose Agent Login Option...</option>
                </select>
                <input style={styles.input} id="dialNumber" name="dialNumber" placeholder="Extension/Dial Number" type="text" onInput={updateDN} />
                <button id="AgentLogin" style={styles.btn} onClick={login}>Login</button>
                <button id="logoutAgent" style={styles.btn} onClick={logout}>Logout</button>
              </fieldset>
            </div>
          </div>
        </fieldset> 
      </section>
    </div></>
  );
};

export default StationLoginPresentational;
