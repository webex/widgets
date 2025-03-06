import React, {useEffect, useState, useRef} from 'react';
import {StationLoginPresentationalProps} from './station-login.types';
import './station-login.style.scss';
import {MULTIPLE_SIGN_IN_ALERT_MESSAGE, MULTIPLE_SIGN_IN_ALERT_TITLE} from './constants';
import {ButtonPill, Text, SelectNext, TextInput} from '@momentum-ui/react-collaboration';
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
  const [teamsValue, setTeamsValue] = useState<string>('');
  const [isDialNumberDisabled, setIsDialNumberDisabled] = useState<boolean>(false);

  useEffect(() => {
    const teamsDropdown = document.querySelector('#teams-dropdown') as HTMLElement;
    const agentLogin = document.querySelector('#login-option') as HTMLElement;
    if (teamsDropdown) {
      if (teams) {
        setTeam(teamsValue);
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
    const agentLogin = document.querySelector('#LoginOption') as HTMLElement;
    if (agentLogin && !agentLoginValue) {
      setDeviceType(deviceType);
      setAgentLoginValue(loginOptions.indexOf(deviceType).toString());
      relogin();
    }
  }, [isAgentLoggedIn]);

  const selectLoginOption = (key: string) => {
    setAgentLoginValue(key);
    const deviceType = loginOptions[key];
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

  function updateDN(value: string) {
    setDialNumberValue(value);
    setDialNumber(dialNumberValue);
  }

  function updateTeam(value: string) {
    setTeamsValue(value);
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
      <div className="box station-login">
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
              id="login-option"
              direction="bottom"
              showBorder
              aria-labelledby="agent-login-label"
              items={loginOptions.map((name, id) => {
                return {
                  key: id,
                  name: name,
                };
              })}
              selectedKey={agentLoginValue}
              onSelectionChange={selectLoginOption}
            >
              {(item) => {
                return (
                  <Item textValue={item.name} key={item.key}>
                    <Text className="state-name" tagName={'small'}>
                      {item.name}
                    </Text>
                  </Item>
                );
              }}
            </SelectNext>
          </fieldset>
          <fieldset className="fieldset">
            <Text tagName="span" id="dial-number-label" type="body-large-regular">
              Dial number
            </Text>
            <TextInput
              clearAriaLabel="Clear"
              aria-labelledby="dial-number-label"
              placeholder="Extension/Dial Number"
              onChange={updateDN}
              value={dialNumberValue}
              isDisabled={isDialNumberDisabled}
            ></TextInput>
          </fieldset>
          <fieldset className="fieldset">
            <Text tagName="span" type="body-large-regular" id="team-label">
              Your team
            </Text>
            <SelectNext
              id="teams-dropdown"
              direction="bottom"
              showBorder
              aria-labelledby="team-label"
              items={teams}
              selectedKey={teamsValue}
              onSelectionChange={updateTeam}
            >
              {(item) => {
                return (
                  <Item textValue={item.name} key={item.id}>
                    <Text className="state-name" tagName={'small'}>
                      {item.name}
                    </Text>
                  </Item>
                );
              }}
            </SelectNext>
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
