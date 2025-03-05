import React, {useEffect, useState, useRef} from 'react';
import {StationLoginPresentationalProps} from './station-login.types';
import './station-login.style.scss';
import {MULTIPLE_SIGN_IN_ALERT_MESSAGE, MULTIPLE_SIGN_IN_ALERT_TITLE} from './constants';
import {ButtonPill, Text, SelectNext} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';

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
  const [dialNumberValue, setDialNumberValue] = useState<string>('');
  const [agentLoginValue, setAgentLoginValue] = useState<string>('');
  const [isDialNumberDisabled, setIsDialNumberDisabled] = useState<boolean>(false);

  useEffect(() => {
    const teamsDropdown = document.getElementById('teamsDropdown') as HTMLSelectElement;
    const agentLogin = document.querySelector('#LoginOption') as HTMLSelectElement;
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
        setDialNumberValue('');
        setIsDialNumberDisabled(true);
      }
    }
    if (loginOptions.length > 0) {
      if (agentLogin && deviceType) {
        setAgentLoginValue(deviceType);
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
    const deviceType = event.target.value;
    setDeviceType(deviceType);
    if (deviceType === 'AGENT_DN' || deviceType === 'EXTENSION') {
      setIsDialNumberDisabled(false);
    } else {
      setIsDialNumberDisabled(true);
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
    // setDialNumber(dialNumber.value);
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
            <Text id="agent-login-label" tagName="span" type="body-large-regular">
              Handle calls using
            </Text>
            <SelectNext
              name="LoginOption"
              id="LoginOption"
              className="select"
              aria-labelledby="agent-login-label"
              items={loginOptions.map((name, id) => {
                return {
                  key: id,
                  textValue: name,
                };
              })}
            >
              {/*<Item>*/}
              {/*  <Text className="state-name" tagName={'small'}>*/}
              {/*    Hello World*/}
              {/*  </Text>*/}
              {/*</Item>*/}
              {(item) => {
                return (
                  <Item textValue={item.textValue} key={item.key}>
                    <Text className="state-name" tagName={'small'}>
                      {item}
                    </Text>
                  </Item>
                );
              }}
            </SelectNext>
            {/*{loginOptions.map((option, id) => {*/}
            {/*  return <Item key={id} textValue={option}>{'555'}</Item>;*/}
            {/*})}*/}
            {/*<select name="LoginOption" id="LoginOption" className="select" onChange={selectLoginOption}>*/}
            {/*  <option value="" hidden>*/}
            {/*    Choose Agent Login Option...*/}
            {/*  </option>*/}
            {/*</select>*/}
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
