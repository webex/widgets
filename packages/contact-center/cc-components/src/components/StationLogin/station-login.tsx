import React, {useEffect, useState, useRef, useCallback} from 'react';
import {StationLoginComponentProps} from './station-login.types';
import './station-login.style.scss';
import {MULTIPLE_SIGN_IN_ALERT_MESSAGE, MULTIPLE_SIGN_IN_ALERT_TITLE} from './constants';
import {ButtonPill, Text, SelectNext, TextInput, PopoverNext} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';
import {Icon, Select, Option} from '@momentum-design/components/dist/react';

const StationLoginComponent: React.FunctionComponent<StationLoginComponentProps> = (props) => {
  const {
    teams,
    loginOptions,
    login,
    logout,
    setDeviceType,
    setDialNumber,
    setTeam,
    isAgentLoggedIn,
    deviceType,
    showMultipleLoginAlert,
    handleContinue,
  } = props;

  const modalRef = useRef<HTMLDialogElement>(null);
  const [dialNumberLabel, setDialNumberLabel] = useState<string>('');
  const [dialNumberPlaceholder, setDialNumberPlaceholder] = useState<string>('');
  const [dialNumberValue, setDialNumberValue] = useState<string>('');
  const [teamsValue, setTeamsValue] = useState<string>('');
  const [isDialNumberDisabled, setIsDialNumberDisabled] = useState<boolean>(false);

  useEffect(() => {
    if (loginOptions.length > 0) {
      const firstOption = loginOptions[0];
      selectLoginOption(firstOption);
      setDeviceType(firstOption);
    }
  }, [teams, loginOptions, deviceType]);

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

  const selectLoginOption = useCallback(
    (key: string) => {
      const index = parseInt(key, 10);
      const selectedOption: string = !isNaN(index) ? loginOptions[index] : key;
      setDeviceType(selectedOption);
      setIsDialNumberDisabled(!['AGENT_DN', 'EXTENSION'].includes(selectedOption));
      updateDialNumberLabel(selectedOption);
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

  const updateDialNumberLabel = (selectedOption: string): void => {
    if (selectedOption === 'AGENT_DN') {
      setDialNumberLabel('Dial number');
      setDialNumberPlaceholder('Dial Number');
    } else if (selectedOption === 'EXTENSION') {
      setDialNumberLabel('Extension');
      setDialNumberPlaceholder('Extension');
    }
  };

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
            <legend id="agent-login-label">
              Handle calls using
              <PopoverNext
                trigger="mouseenter"
                triggerComponent={<Icon name="info-badge-filled" id="agent-login-info-badge" />}
                placement="auto-end"
                closeButtonPlacement="top-left"
                closeButtonProps={{'aria-label': 'Close'}}
              >
                <Text tagName={'div'} type="body-large-regular" className="agent-login-popover">
                  This is your preferred method for receiving and making calls. Choose between your phone number,
                  extension (if available), or your web browser.
                </Text>
              </PopoverNext>
            </legend>
            <div className="">
              <Select
                id="login-option"
                name="login-option"
                aria-labelledby="agent-login-label"
                onChange={(event: CustomEvent) => selectLoginOption(event.detail.value)}
                className="station-login-select"
              >
                {loginOptions.map((option, index) => (
                  <Option key={index} value={option}>
                    {option}
                  </Option>
                ))}
              </Select>
            </div>
          </fieldset>
          {isDialNumberDisabled ? (
            <></>
          ) : (
            <fieldset className="fieldset">
              <legend id="dial-number-label">{dialNumberLabel}</legend>
              <TextInput
                clearAriaLabel="Clear"
                aria-labelledby="dial-number-label"
                placeholder={dialNumberPlaceholder}
                onChange={updateDN}
                value={dialNumberValue}
                isDisabled={isDialNumberDisabled}
              />
            </fieldset>
          )}
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
              <ButtonPill id="logoutAgent" onPress={logout} color="join">
                Logout
              </ButtonPill>
            ) : (
              <ButtonPill id="AgentLogin" onPress={login}>
                Save & Continue
              </ButtonPill>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default StationLoginComponent;
