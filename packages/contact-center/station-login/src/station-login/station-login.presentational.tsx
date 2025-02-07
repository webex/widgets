import React, {useEffect, useRef} from 'react';
import {StationLoginPresentationalProps} from './station-login.types';
import './station-login.style.scss';
import {MULTIPLE_SIGN_IN_ALERT_MESSAGE, MULTIPLE_SIGN_IN_ALERT_TITLE} from './constants';
import './alert-modal.scss';

const StationLoginPresentational: React.FunctionComponent<StationLoginPresentationalProps> = (props) => {
  const {
    name,
    teams,
    loginOptions,
    login,
    logout,
    relogin,
    setDeviceType,
    setDialNumber,
    setTeam,
    isAgentLoggedIn,
    deviceType,
    showMultipleLoginAlert,
    handleContinue,
  } = props; // TODO: Use the loginSuccess, loginFailure, logoutSuccess props returned fromthe API response via helper file to reflect UI changes
  const modalRef = useRef<HTMLDialogElement>(null);

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
      loginOptions.forEach((options) => {
        const option = document.createElement('option');
        option.text = options;
        option.value = options;
        agentLogin.add(option);
      });
    }
  }, [teams, loginOptions]);

  useEffect(() => {
    const modal = modalRef.current;
    if (showMultipleLoginAlert && modal) {
      modal.showModal();
    }
  }, [showMultipleLoginAlert, modalRef]);

  useEffect(() => {
    if (!isAgentLoggedIn) return;
    const agentLogin = document.querySelector('#LoginOption') as HTMLSelectElement;
    if (agentLogin && !agentLogin.value) {
      setDeviceType(deviceType);
      agentLogin.value = deviceType;
      relogin();
    }
  }, [isAgentLoggedIn]);

  const selectLoginOption = (event: {target: {value: string}}) => {
    const dialNumber = document.querySelector('#dialNumber') as HTMLInputElement;
    const deviceType = event.target.value;
    setDeviceType(deviceType);
    if (deviceType === 'AGENT_DN' || deviceType === 'EXTENSION') {
      dialNumber.disabled = false;
    } else {
      dialNumber.disabled = true;
    }
  };

  const continueClicked = () => {
    const modal = modalRef.current;
    if (modal) {
      modal.close();
      handleContinue();
    }
  };

  function updateDN() {
    const dialNumber = document.querySelector('#dialNumber') as HTMLInputElement;
    setDialNumber(dialNumber.value);
  }

  return (
    <>
      {showMultipleLoginAlert && (
        <dialog ref={modalRef} className="modal">
          <h2>{MULTIPLE_SIGN_IN_ALERT_TITLE}</h2>
          <p>{MULTIPLE_SIGN_IN_ALERT_MESSAGE}</p>
          <div className="modal-content">
            <button id="ContinueButton" data-testid="ContinueButton" onClick={continueClicked}>
              Continue
            </button>
          </div>
        </dialog>
      )}
      <h1 data-testid="station-login-heading">{name}</h1>
      <div className="box">
        <section className="section-box">
          <fieldset className="fieldset">
            <legend className="legend-box">Agent</legend>
            <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
              <div style={{display: 'flex', gap: '1rem'}}>
                <fieldset
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    padding: '10px',
                    marginBottom: '20px',
                    flex: 0.69,
                  }}
                >
                  <legend className="legend-box">Select Team</legend>
                  <select id="teamsDropdown" className="select">
                    Teams
                  </select>
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="legend-box">Agent Login</legend>
                  <select name="LoginOption" id="LoginOption" className="select" onChange={selectLoginOption}>
                    <option value="" hidden>
                      Choose Agent Login Option...
                    </option>
                  </select>
                  <input
                    className="input"
                    id="dialNumber"
                    name="dialNumber"
                    placeholder="Extension/Dial Number"
                    type="text"
                    onInput={updateDN}
                  />
                  {isAgentLoggedIn ? (
                    <button id="logoutAgent" className="btn" onClick={logout}>
                      Logout
                    </button>
                  ) : (
                    <button id="AgentLogin" className="btn" onClick={login}>
                      Login
                    </button>
                  )}
                </fieldset>
              </div>
            </div>
          </fieldset>
        </section>
      </div>
    </>
  );
};
export default StationLoginPresentational;
