import React, {useEffect, useState, useRef, useCallback} from 'react';
import {StationLoginPresentationalProps} from './station-login.types';
import './station-login.style.scss';
import {MULTIPLE_SIGN_IN_ALERT_MESSAGE, MULTIPLE_SIGN_IN_ALERT_TITLE} from './constants';
import {ButtonPill, Text, SelectNext, TextInput} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';
import {Icon} from '@momentum-design/components/dist/react';

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
  } = props;

  const modalRef = useRef<HTMLDialogElement>(null);
  const [dialNumberValue, setDialNumberValue] = useState<string>('');
  const [agentLoginValue, setAgentLoginValue] = useState<string>('');
  const [teamsValue, setTeamsValue] = useState<string>('');
  const [isDialNumberDisabled, setIsDialNumberDisabled] = useState<boolean>(false);

  useEffect(() => {
    if (loginOptions.length > 0) {
      const firstOption = loginOptions[0];
      setAgentLoginValue('0');
      setDeviceType(firstOption);
    }
  }, [loginOptions, setDeviceType]);

  useEffect(() => {
    if (teams.length > 0) {
      const firstTeam = teams[0].id;
      setTeamsValue(firstTeam);
      setTeam(firstTeam);
    }
  }, [teams, setTeam]);

  useEffect(() => {
    if (showMultipleLoginAlert && modalRef.current) {
      modalRef.current.showModal();
    }
  }, [showMultipleLoginAlert]);

  useEffect(() => {
    if (!isAgentLoggedIn || !deviceType) return;
    setDeviceType(deviceType);
    setAgentLoginValue(loginOptions.indexOf(deviceType).toString());
    relogin();
  }, [isAgentLoggedIn, deviceType, loginOptions, setDeviceType, relogin]);

  const selectLoginOption = useCallback(
    (key: string) => {
      const index = parseInt(key, 10);
      if (!isNaN(index) && loginOptions[index]) {
        setAgentLoginValue(key);
        setDeviceType(loginOptions[index]);
        setIsDialNumberDisabled(!['AGENT_DN', 'EXTENSION'].includes(loginOptions[index]));
      }
    },
    [loginOptions, setDeviceType]
  );

  const continueClicked = useCallback(() => {
    if (modalRef.current) {
      modalRef.current.close();
      handleContinue();
    }
  }, [handleContinue]);

  const updateDN = useCallback(
    (value: string) => {
      setDialNumberValue(value);
      setDialNumber(value);
    },
    [setDialNumber]
  );

  const updateTeam = useCallback(
    (value: string) => {
      setTeamsValue(value);
      setTeam(value);
    },
    [setTeam]
  );

  return (
    <>
      <dialog ref={modalRef} className="modal" open={showMultipleLoginAlert}>
        <h2>{MULTIPLE_SIGN_IN_ALERT_TITLE}</h2>
        <p>{MULTIPLE_SIGN_IN_ALERT_MESSAGE}</p>
        <div className="modal-content">
          <button id="ContinueButton" data-testid="ContinueButton" onClick={continueClicked}>
            Continue
          </button>
        </div>
      </dialog>
      <div className="box station-login">
        <section className="section-box">
          <fieldset className="fieldset">
            <Text tagName={'span'} type="heading-small-bold">
              Set your interaction preferences
            </Text>
          </fieldset>
          <fieldset className="fieldset">
            <legend id="agent-login-label">Handle calls using</legend>
            <div className="select-container">
              <SelectNext
                id="login-option"
                direction="bottom"
                showBorder
                aria-labelledby="agent-login-label"
                items={loginOptions.map((name, id) => ({key: id.toString(), name}))}
                selectedKey={agentLoginValue}
                onSelectionChange={selectLoginOption}
                className="station-login-select"
              >
                {(item) => (
                  <Item textValue={item.name} key={item.key}>
                    <Text className="state-name" tagName={'small'}>
                      {item.name}
                    </Text>
                  </Item>
                )}
              </SelectNext>
              <Icon className="select-arrow-icon" name="arrow-down-bold" title="" />
            </div>
          </fieldset>
          <fieldset className="fieldset">
            <legend id="dial-number-label">Dial number</legend>
            <TextInput
              clearAriaLabel="Clear"
              aria-labelledby="dial-number-label"
              placeholder="Extension/Dial Number"
              onChange={updateDN}
              value={dialNumberValue}
              isDisabled={isDialNumberDisabled}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend id="team-label">Your team</legend>
            <div className="select-container">
              <SelectNext
                id="teams-dropdown"
                direction="bottom"
                showBorder
                aria-labelledby="team-label"
                items={teams}
                selectedKey={teamsValue}
                onSelectionChange={updateTeam}
                className="station-login-select"
              >
                {(item) => (
                  <Item textValue={item.name} key={item.id}>
                    <Text className="state-name" tagName={'small'}>
                      {item.name}
                    </Text>
                  </Item>
                )}
              </SelectNext>
              <Icon className="select-arrow-icon" name="arrow-down-bold" title="" />
            </div>
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
