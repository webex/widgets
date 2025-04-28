import React, {useEffect, useState, useRef, useCallback} from 'react';
import {StationLoginComponentProps} from './station-login.types';
import './station-login.style.scss';
import {DESKTOP, LoginOptions, StationLoginLabels} from './constants';
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
    dialNumber,
    showMultipleLoginAlert,
    handleContinue,
    contactCenterLogoutFn,
  } = props;

  const modalRef = useRef<HTMLDialogElement>(null);
  const ccSignOutModalRef = useRef<HTMLDialogElement>(null);
  const [dialNumberLabel, setDialNumberLabel] = useState<string>('');
  const [dialNumberPlaceholder, setDialNumberPlaceholder] = useState<string>('');
  const [dialNumberValue, setDialNumberValue] = useState<string>(dialNumber || '');
  const [showCCSignOutModal, setShowCCSignOutModal] = useState<boolean>(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>(deviceType || '');

  // useEffect to be called on mount
  useEffect(() => {
    setSelectedDeviceType(deviceType);
    updateDialNumberLabel(deviceType);
  }, []);

  // TODO: should be set from the store
  useEffect(() => {
    if (teams.length > 0) {
      const firstTeam = teams[0].id;
      setTeam(firstTeam);
    }
  }, [teams]);

  // show modals
  useEffect(() => {
    if (showMultipleLoginAlert && modalRef.current) {
      modalRef.current.showModal();
    }
    if (showCCSignOutModal && !ccSignOutModalRef?.current?.open) {
      ccSignOutModalRef.current?.showModal();
    }
  }, [showMultipleLoginAlert, showCCSignOutModal]);

  const continueClicked = useCallback(() => {
    if (modalRef.current) {
      modalRef.current.close();
      handleContinue();
    }
  }, [handleContinue]);

  /**
   * Handler for the Contact Center logout confirmation modal cancel button
   *
   * Closes the dialog if it is currently open
   */
  const ccCancelButtonClicked = useCallback(() => {
    if (ccSignOutModalRef?.current?.open) {
      ccSignOutModalRef.current.close();
      setShowCCSignOutModal(false);
    }
  }, []);

  const updateDialNumberLabel = (selectedOption: string): void => {
    if (selectedOption != DESKTOP && Object.keys(LoginOptions).includes(selectedOption)) {
      setDialNumberLabel(LoginOptions[selectedOption]);
      setDialNumberPlaceholder(LoginOptions[selectedOption]);
    }
  };

  return (
    <>
      {/* TODO: Replace dialog with momentum-design modal component once available */}
      <dialog ref={modalRef} className="modal" open={showMultipleLoginAlert}>
        <h2>{StationLoginLabels.MULTIPLE_SIGN_IN_ALERT_TITLE}</h2>
        <p>{StationLoginLabels.MULTIPLE_SIGN_IN_ALERT_MESSAGE}</p>
        <div className="modal-content">
          <button id="ContinueButton" data-testid="ContinueButton" onClick={continueClicked}>
            {StationLoginLabels.CONTINUE}
          </button>
        </div>
      </dialog>
      {/* TODO: Replace dialog with momentum-design modal component once available */}
      <dialog ref={ccSignOutModalRef} className="cc-logout-modal">
        <Text tagname="h2" type="body-large-bold" className="modal-text">
          {StationLoginLabels.CC_SIGN_OUT}
        </Text>
        <Text tagname="p" type="body-midsize-regular" className="modal-text">
          {StationLoginLabels.CC_SIGN_OUT_CONFIRM}
        </Text>
        <div className="cc-logout-modal-content">
          <Button onClick={ccCancelButtonClicked} variant="secondary" className="white-button">
            {StationLoginLabels.CANCEL}
          </Button>
          <Button onClick={contactCenterLogoutFn}>{StationLoginLabels.SIGN_OUT}</Button>
        </div>
      </dialog>
      <div className="box station-login">
        <section className="section-box">
          <Text tagname={'span'} type="body-large-bold">
            {StationLoginLabels.INTERACTION_PREFERENCES}
          </Text>
          <div>
            <div id="agent-login-label">
              <Text type="body-midsize-regular">{StationLoginLabels.HANDLE_CALLS}</Text>
              <Icon name="info-badge-filled" id="agent-login-info-badge" />
              <Tooltip
                color="contrast"
                id="agent-login-label-tooltip"
                showArrow={true}
                triggerID="agent-login-info-badge"
              >
                <Text tagname={'div'} type="body-large-regular" className="agent-login-popover">
                  {StationLoginLabels.HANDLE_CALLS_TOOLTIP}
                </Text>
              </Tooltip>
            </div>
            <div>
              <Select
                id="login-option"
                name="login-option"
                onChange={(event: CustomEvent) => {
                  const selectedOption = event.detail.value;
                  // TODO: Select component is calling onChange with first label on load
                  if (Object.keys(LoginOptions).includes(selectedOption)) {
                    setDeviceType(selectedOption);
                    setSelectedDeviceType(selectedOption);
                    updateDialNumberLabel(selectedOption);
                    // clear dial number when switching between DN and Extension
                    setDialNumber('');
                  }
                }}
                value={selectedDeviceType}
                className="station-login-select"
                selectedValue={selectedDeviceType}
                selectedValueText={LoginOptions[selectedDeviceType]}
              >
                {Object.keys(LoginOptions).map((option: string, index: number) => {
                  if (loginOptions.includes(option)) {
                    return (
                      <Option selected={option === selectedDeviceType} key={index} value={option}>
                        {LoginOptions[option]}
                      </Option>
                    );
                  }
                })}
              </Select>
            </div>
          </div>
          {selectedDeviceType && selectedDeviceType !== DESKTOP && (
            <Input
              label={dialNumberLabel}
              placeholder={dialNumberPlaceholder}
              value={dialNumberValue}
              onChange={(event) => {
                const newDialNumber = (event.target as HTMLInputElement).value;
                setDialNumberValue(newDialNumber);
                setDialNumber(newDialNumber);
              }}
              helpText={dialNumberValue.length === 0 ? `${dialNumberLabel} is required` : undefined}
              helpTextType={dialNumberValue.length === 0 ? 'error' : undefined}
            />
          )}

          <div className="select-container">
            <Select
              label="Your Team"
              id="teams-dropdown"
              name="teams-dropdown"
              onChange={(event: CustomEvent) => {
                setTeam(event.detail.value);
              }}
              className="station-login-select"
              placeholder="Your Team"
            >
              {teams.map((team: {id: string; name: string}, index: number) => {
                return (
                  <Option key={index} value={team.id}>
                    {team.name}
                  </Option>
                );
              })}
            </Select>
          </div>

          <div className="btn-container">
            {isAgentLoggedIn ? (
              <Button id="logoutAgent" onClick={logout} color="positive">
                {StationLoginLabels.SIGN_OUT}
              </Button>
            ) : (
              <Button onClick={login}>{StationLoginLabels.SAVE_AND_CONTINUE}</Button>
            )}
            {contactCenterLogoutFn ? (
              <Button onClick={() => setShowCCSignOutModal(true)} variant="secondary" className="white-button">
                {StationLoginLabels.SIGN_OUT}
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
