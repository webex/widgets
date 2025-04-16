import React, {useEffect, useState, useRef, useCallback} from 'react';
import {StationLoginComponentProps} from './station-login.types';
import './station-login.style.scss';
import {MULTIPLE_SIGN_IN_ALERT_MESSAGE, MULTIPLE_SIGN_IN_ALERT_TITLE} from './constants';
import {Button, Icon, Select, Option, Text, Tooltip, Input} from '@momentum-design/components/dist/react';

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
    contactCenterLogout,
  } = props;

  const modalRef = useRef<HTMLDialogElement>(null);
  const ccSignOutModalRef = useRef<HTMLDialogElement>(null);
  const [dialNumberLabel, setDialNumberLabel] = useState<string>('');
  const [dialNumberPlaceholder, setDialNumberPlaceholder] = useState<string>('');
  const [dialNumberValue, setDialNumberValue] = useState<string>('');
  const [isDialNumberDisabled, setIsDialNumberDisabled] = useState<boolean>(false);
  const [showCCSignOutModal, setShowCCSignOutModal] = useState<boolean>(false);

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
      setTeam(firstTeam);
    }
  }, [teams, setTeam]);

  useEffect(() => {
    if (showMultipleLoginAlert && modalRef.current) {
      modalRef.current.showModal();
    }
    if (showCCSignOutModal && !ccSignOutModalRef?.current?.open) {
      ccSignOutModalRef.current?.showModal();
    }
  }, [showMultipleLoginAlert, showCCSignOutModal]);

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

  const cancelClicked = useCallback(() => {
    if (ccSignOutModalRef?.current?.open) {
      ccSignOutModalRef.current.close();
      setShowCCSignOutModal(false);
    }
  }, []);

  const updateDN = useCallback(
    (value: string) => {
      setDialNumberValue(value);
      setDialNumber(value);
    },
    [setDialNumber]
  );

  const updateTeam = useCallback(
    (value: string) => {
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
      <dialog ref={ccSignOutModalRef} className="cc-logout-modal">
        <Text tagname="h2" type="body-large-bold" className="modal-text">
          Sign out of Contact Center
        </Text>
        <Text tagname="p" type="body-midsize-regular" className="modal-text">
          Are you sure you want to sign out?
        </Text>
        <div className="cc-logout-modal-content">
          <Button onClick={cancelClicked} variant="secondary" className="white-button">
            Cancel
          </Button>
          <Button onClick={contactCenterLogout}>Sign out</Button>
        </div>
      </dialog>
      <div className="box station-login">
        <section className="section-box">
          <fieldset className="fieldset">
            <Text tagname={'span'} type="heading-small-bold">
              Set your interaction preferences
            </Text>
          </fieldset>
          <fieldset className="fieldset">
            <legend id="agent-login-label">
              Handle calls using
              <Icon name="info-badge-filled" id="agent-login-info-badge" />
            </legend>
            <Tooltip
              color="contrast"
              id="agent-login-label-tooltip"
              showArrow={true}
              triggerID="agent-login-info-badge"
            >
              <Text tagname={'div'} type="body-large-regular" className="agent-login-popover">
                This is your preferred method for receiving and making calls. Choose between your phone number,
                extension (if available), or your web browser.
              </Text>
            </Tooltip>
            <div className="">
              <Select
                id="login-option"
                name="login-option"
                onChange={(event: CustomEvent) => selectLoginOption(event.detail.value)}
                className="station-login-select"
              >
                {loginOptions.map((option, index) => {
                  return (
                    <Option key={index} value={option}>
                      {option}
                    </Option>
                  );
                })}
              </Select>
            </div>
          </fieldset>
          {isDialNumberDisabled ? (
            <></>
          ) : (
            <fieldset className="fieldset">
              <legend id="dial-number-label">{dialNumberLabel}</legend>
              <Input
                placeholder={dialNumberPlaceholder}
                disabled={isDialNumberDisabled}
                value={dialNumberValue}
                onChange={(event) => updateDN(event.target.value)}
              />
            </fieldset>
          )}
          <fieldset className="fieldset">
            <legend id="team-label">Your team</legend>
            <div className="select-container">
              <Select
                id="teams-dropdown"
                name="teams-dropdown"
                onChange={(event: CustomEvent) => updateTeam(event.detail.value)}
                className="station-login-select"
              >
                {teams.map((team: {id: string; name: string}) => {
                  return (
                    <Option key={team.id} value={team.name}>
                      {team.name}
                    </Option>
                  );
                })}
              </Select>
            </div>
          </fieldset>
          <div className="btn-container">
            {isAgentLoggedIn ? (
              <Button id="logoutAgent" onClick={logout} color="positive">
                Logout
              </Button>
            ) : (
              <Button onClick={login}>Save & Continue</Button>
            )}
            {typeof contactCenterLogout === 'function' ? (
              <Button onClick={() => setShowCCSignOutModal(true)} variant="secondary" className="white-button">
                Sign out
              </Button>
            ) : (
              <></>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default StationLoginComponent;
