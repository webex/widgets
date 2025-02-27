import React, {useEffect, useRef} from 'react';
import {StationLoginPresentationalProps} from './station-login.types';
import './station-login.style.scss';
import {MULTIPLE_SIGN_IN_ALERT_MESSAGE, MULTIPLE_SIGN_IN_ALERT_TITLE} from './constants';
import {ButtonPill, Checkbox, Text} from '@momentum-ui/react-collaboration';

const StationLoginPresentational: React.FunctionComponent<StationLoginPresentationalProps> = (props) => {
  const {
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
      if (agentLogin && deviceType) {
        agentLogin.value = deviceType;
      }
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
      <div className="box">
        <section className="section-box">
          <fieldset className="fieldset">
            <Text tagName={'span'} type="heading-small-bold">
              Set your interaction preferences
            </Text>
          </fieldset>
          <fieldset className="fieldset">
            <Text tagName="span" type="body-large-regular">
              Handle calls using
            </Text>
            <select name="LoginOption" id="LoginOption" className="select" onChange={selectLoginOption}>
              <option value="" hidden>
                Choose Agent Login Option...
              </option>
            </select>
          </fieldset>
          <fieldset className="fieldset">
            <Text tagName="span" type="body-large-regular">
              Dial number
            </Text>
            <input
              className="input"
              id="dialNumber"
              name="dialNumber"
              placeholder="Extension/Dial Number"
              type="text"
              onInput={updateDN}
            />
          </fieldset>
          <fieldset className="fieldset">
            <Text tagName="span" type="body-large-regular">
              Your team
            </Text>
            <select id="teamsDropdown" className="select">
              Teams
            </select>
          </fieldset>
          <fieldset className="fieldset">
            <Checkbox htmlId="checkbox-visible" label="Don't show this again"></Checkbox>
          </fieldset>
          <div className="btn-container">
            {isAgentLoggedIn ? (
              <ButtonPill id="logoutAgent" onPress={logout} color="cancel">
                Logout
              </ButtonPill>
            ) : (
              <ButtonPill id="AgentLogin" onPress={login} color="join">
                Save & Continue
              </ButtonPill>
            )}
          </div>
        </section>
      </div>
    </>
);
};
export default StationLoginPresentational;
