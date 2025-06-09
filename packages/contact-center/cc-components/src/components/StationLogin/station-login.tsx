import React, {useEffect, useState, useRef, useCallback} from 'react';
import {StationLoginComponentProps} from './station-login.types';
import './station-login.style.scss';
import {DESKTOP, DIALNUMBER, LoginOptions, SignInErrors, StationLoginLabels} from './constants';
import {Button, Icon, Select, Option, Text, Tooltip, Input} from '@momentum-design/components/dist/react';

const StationLoginComponent: React.FunctionComponent<StationLoginComponentProps> = (props) => {
  const {
    teams,
    loginOptions,
    login,
    loginFailure,
    setDeviceType,
    setDialNumber,
    setTeam,
    isAgentLoggedIn,
    deviceType,
    dialNumber,
    dialNumberRegex,
    showMultipleLoginAlert,
    handleContinue,
    onCCSignOut,
    teamId,
    setTeamId,
    logger,
    isLoginOptionsChanged,
    saveLoginOptions,
    saveError,
    setCurrentLoginOptions,
    originalLoginOptions,
    profileMode,
  } = props;

  const modalRef = useRef<HTMLDialogElement>(null);
  const ccSignOutModalRef = useRef<HTMLDialogElement>(null);
  const saveConfirmDialogRef = useRef<HTMLDialogElement>(null);

  const [dialNumberLabel, setDialNumberLabel] = useState<string>('');
  const [dialNumberPlaceholder, setDialNumberPlaceholder] = useState<string>('');
  const [dialNumberValue, setDialNumberValue] = useState<string>(dialNumber || '');
  const [showCCSignOutModal, setShowCCSignOutModal] = useState<boolean>(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>(deviceType || '');
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId || '');
  const [showDNError, setShowDNError] = useState<boolean>(false);
  const [dnErrorText, setDNErrorText] = useState<string>('');

  // useEffect to be called on mount
  useEffect(() => {
    logger.info(`CC-Widgets: StationLogin: isAgentLoggedIn changed: ${isAgentLoggedIn}`, {
      module: 'cc-components#station-login.tsx',
      method: 'stationLoginMounted',
    });
    setSelectedDeviceType(deviceType || '');
    setDialNumberValue(dialNumber || '');
    updateDialNumberLabel(deviceType || '');
    setSelectedTeamId(teamId || '');
  }, [isAgentLoggedIn]);

  // show modals
  useEffect(() => {
    const modalStates = [
      {ref: modalRef, show: showMultipleLoginAlert},
      {ref: ccSignOutModalRef, show: showCCSignOutModal},
      {ref: saveConfirmDialogRef, show: showSaveConfirmDialog},
    ];

    modalStates.forEach(({ref, show}) => {
      if (ref.current) {
        if (show && !ref.current.open) {
          ref.current.showModal();
        } else if (!show && ref.current.open) {
          ref.current.close();
        }
      }
    });
  }, [showMultipleLoginAlert, showCCSignOutModal, showSaveConfirmDialog]);

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
    logger.info('CC-Widgets: StationLogin: CC Sign-out cancel clicked', {
      module: 'cc-components#station-login.tsx',
      method: 'ccCancelClicked',
    });
    if (ccSignOutModalRef?.current?.open) {
      ccSignOutModalRef.current.close();
      setShowCCSignOutModal(false);
    }
  }, []);

  const saveConfirmCancelClicked = useCallback(() => {
    if (saveConfirmDialogRef?.current?.open) {
      saveConfirmDialogRef.current.close();
      setShowSaveConfirmDialog(false);
    }
  }, []);

  const handleSaveConfirm = () => {
    saveConfirmCancelClicked();
    saveLoginOptions();
  };

  const updateDialNumberLabel = (selectedOption: string): void => {
    logger.info(`CC-Widgets: StationLogin: updateDialNumberLabel: ${selectedOption}`, {
      module: 'cc-components#station-login.tsx',
      method: 'updateDialNumberLabel',
    });
    if (selectedOption != DESKTOP && Object.keys(LoginOptions).includes(selectedOption)) {
      setDialNumberLabel(LoginOptions[selectedOption]);
      setDialNumberPlaceholder(LoginOptions[selectedOption]);
    }
  };

  /**
   * Runs validation tests on a string given as a Dial Number
   * @param {string} input
   * @returns {boolean} whether or not to show a validation error
   */
  const validateDialNumber = (input: string): boolean => {
    logger.info(`CC-Widgets: StationLogin: validateDialNumber: ${input}`, {
      module: 'cc-components#station-login.tsx',
      method: 'validateDialNumber',
    });
    const regexForDn = new RegExp(dialNumberRegex ?? '1[0-9]{3}[2-9][0-9]{6}([,]{1,10}[0-9]+){0,1}');
    if (regexForDn.test(input)) {
      return false;
    }
    setDNErrorText(StationLoginLabels.DN_FORMAT_ERROR);
    return true;
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
      <dialog ref={ccSignOutModalRef} className="cc-logout-modal" data-testid="cc-logout-modal">
        <Text tagname="h2" type="body-large-bold" className="modal-text">
          {StationLoginLabels.CC_SIGN_OUT}
        </Text>
        <Text tagname="p" type="body-midsize-regular" className="modal-text">
          {StationLoginLabels.CC_SIGN_OUT_CONFIRM}
        </Text>
        <div className="cc-logout-modal-content">
          <Button
            onClick={ccCancelButtonClicked}
            variant="secondary"
            className="white-button"
            data-testId="cc-cancel-button"
          >
            {StationLoginLabels.CANCEL}
          </Button>
          <Button data-testId="cc-logout-button" onClick={onCCSignOut}>
            {StationLoginLabels.SIGN_OUT}
          </Button>
        </div>
      </dialog>
      {/* Save Confirmation Dialog */}
      <dialog ref={saveConfirmDialogRef} className="cc-logout-modal">
        <div className="modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text tagname="h2" type="body-large-bold" className="modal-text">
            {StationLoginLabels.CONFIRM_INTERACTION_PREFERENCE_CHANGES_TITLE}
          </Text>
          <Button
            size={32}
            variant="tertiary"
            color="default"
            prefix-icon="cancel-bold"
            postfix-icon=""
            type="button"
            role="button"
            aria-label="Close"
            onClick={saveConfirmCancelClicked}
            className="cancelSaveLoginOptions"
          ></Button>
        </div>
        <Text tagname="p" type="body-midsize-regular" className="modal-text">
          {StationLoginLabels.CONFIRM_INTERACTION_PREFERENCE_CHANGES_MESSAGE}
        </Text>
        <div className="cc-logout-modal-content">
          <Button onClick={saveConfirmCancelClicked} variant="secondary" className="white-button">
            {StationLoginLabels.CANCEL}
          </Button>
          <Button onClick={handleSaveConfirm}>{StationLoginLabels.CONFIRM}</Button>
        </div>
      </dialog>
      {/* Save Confirmation Dialog */}
      <dialog ref={saveConfirmDialogRef} className="cc-logout-modal">
        <div className="modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text tagname="h2" type="body-large-bold" className="modal-text">
            {StationLoginLabels.CONFIRM_INTERACTION_PREFERENCE_CHANGES_TITLE}
          </Text>
          <Button
            size={32}
            variant="tertiary"
            color="default"
            prefix-icon="cancel-bold"
            postfix-icon=""
            type="button"
            role="button"
            aria-label="Close"
            onClick={saveConfirmCancelClicked}
            className="cancelSaveLoginOptions"
          ></Button>
        </div>
        <Text tagname="p" type="body-midsize-regular" className="modal-text">
          {StationLoginLabels.CONFIRM_INTERACTION_PREFERENCE_CHANGES_MESSAGE}
        </Text>
        <div className="cc-logout-modal-content">
          <Button onClick={saveConfirmCancelClicked} variant="secondary" className="white-button">
            {StationLoginLabels.CANCEL}
          </Button>
          <Button onClick={handleSaveConfirm}>{StationLoginLabels.CONFIRM}</Button>
        </div>
      </dialog>
      <div className="box station-login" data-testid="station-login-widget">
        <section className="section-box">
          {!profileMode && (
            <Text tagname={'span'} type="body-large-bold">
              {StationLoginLabels.INTERACTION_PREFERENCES}
            </Text>
          )}
          <div>
            <div id="agent-login-label">
              <Text type="body-midsize-regular" data-testid="station-login-label">
                {StationLoginLabels.HANDLE_CALLS}
              </Text>
              <Icon name="info-badge-filled" id="agent-login-info-badge" data-testid="station-login-icon" />
              <Tooltip
                data-testid="station-login-tooltip"
                color="contrast"
                id="agent-login-label-tooltip"
                showArrow={true}
                triggerID="agent-login-info-badge"
              >
                <Text
                  tagname={'div'}
                  type="body-large-regular"
                  className="agent-login-popover"
                  data-testid="station-login-label"
                >
                  {StationLoginLabels.HANDLE_CALLS_TOOLTIP}
                </Text>
              </Tooltip>
            </div>
            <div>
              <Select
                id="login-option"
                name="login-option"
                data-testid="login-option-select"
                onChange={(event: CustomEvent) => {
                  const selectedOption = event.detail.value;
                  logger.info(`CC-Widgets: StationLogin: login option changed to: ${selectedOption}`, {
                    module: 'cc-components#station-login.tsx',
                    method: 'loginOptionChanged',
                  });
                  // TODO: Select component is calling onChange with first label on load
                  // bug ticket: https://jira-eng-gpk2.cisco.com/jira/browse/MOMENTUM-668
                  if (Object.keys(LoginOptions).includes(selectedOption)) {
                    setDeviceType(selectedOption);
                    setSelectedDeviceType(selectedOption);
                    updateDialNumberLabel(selectedOption);
                    setShowDNError(false);

                    // If switching to the device type the user logged in with, restore its value
                    if (selectedOption === originalLoginOptions.deviceType) {
                      setCurrentLoginOptions({
                        deviceType: selectedOption,
                        dialNumber: originalLoginOptions.dialNumber || '',
                        teamId: originalLoginOptions.teamId || '',
                      });
                      setDialNumberValue(originalLoginOptions.dialNumber || '');
                      setDialNumber(originalLoginOptions.dialNumber || '');
                      setSelectedTeamId(originalLoginOptions.teamId || '');
                      setTeamId(originalLoginOptions.teamId || '');
                    } else {
                      // If switching to a different device type, clear the input
                      setCurrentLoginOptions({
                        deviceType: selectedOption,
                        dialNumber: '',
                        teamId: selectedTeamId || '',
                      });
                      setDialNumberValue('');
                      setDialNumber('');
                    }
                  }
                }}
                value={selectedDeviceType}
                className="station-login-select"
                selectedValue={selectedDeviceType}
                selectedValueText={LoginOptions[selectedDeviceType]}
              >
                {Object.keys(LoginOptions).map((option: string, index: number) => {
                  // only show loginOptions provided by store
                  if (loginOptions.includes(option)) {
                    return (
                      <Option
                        selected={option === selectedDeviceType}
                        key={index}
                        value={option}
                        data-testid={`login-option-${LoginOptions[option]}`}
                      >
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
              data-testid="dial-number-input"
              label={dialNumberLabel}
              placeholder={dialNumberPlaceholder}
              value={dialNumberValue}
              onInput={(event) => {
                const input = (event.target as HTMLInputElement).value.trim();
                logger.info(`CC-Widgets: StationLogin: dialNumber input changed: ${input}`, {
                  module: 'cc-components#station-login.tsx',
                  method: 'dialNumberInputChanged',
                });
                setDialNumberValue(input);
                setDialNumber(input);

                // validation
                if (input.length === 0) {
                  // show error for empty string
                  setDNErrorText(`${LoginOptions[selectedDeviceType]} ${StationLoginLabels.IS_REQUIRED}`);
                  setShowDNError(true);
                } else if (selectedDeviceType === DIALNUMBER) {
                  setShowDNError(validateDialNumber(input));
                } else {
                  setShowDNError(false);
                }
                setCurrentLoginOptions((prev) => ({
                  ...prev,
                  dialNumber: input,
                }));
              }}
              helpText={showDNError ? dnErrorText : undefined}
              helpTextType={showDNError ? 'error' : undefined}
            />
          )}

          <div className="select-container">
            <Select
              data-testid="teams-select-dropdown"
              label={StationLoginLabels.YOUR_TEAM}
              id="teams-dropdown"
              name="teams-dropdown"
              onChange={(event: CustomEvent) => {
                const value = event.detail.value;
                logger.info(`CC-Widgets: StationLogin: team selected: ${value}`, {
                  module: 'cc-components#station-login.tsx',
                  method: 'teamSelected',
                });
                setTeam(value);
                setSelectedTeamId(event.detail.value);
                setTeamId(event.detail.value);
                setCurrentLoginOptions((prev) => ({
                  ...prev,
                  teamId: value,
                }));
              }}
              className="station-login-select"
              placeholder={StationLoginLabels.YOUR_TEAM}
              selectedValueText={teams.find((team) => team.id === selectedTeamId)?.name}
            >
              {teams.map((team: {id: string; name: string}, index: number) => {
                return (
                  <Option
                    selected={team.id === selectedTeamId}
                    key={index}
                    value={team.id}
                    data-testid={`teams-dropdown-${team.name}`}
                  >
                    {team.name}
                  </Option>
                );
              })}
            </Select>
          </div>

          {loginFailure && (
            <Text className="error-text-color" type={'body-midsize-regular'} data-testid="station-login-failure-label">
              {SignInErrors[loginFailure.message] ?? StationLoginLabels.DEFAULT_ERROR}
            </Text>
          )}

          {/* Show error if Save is clicked with no changes */}
          {saveError && (
            <Text className="error-text-color" type={'body-midsize-regular'}>
              {saveError}
            </Text>
          )}

          {/* Show Save button inside button container */}
          <div className="btn-container">
            {isAgentLoggedIn && profileMode && (
              <Button
                disabled={
                  !isLoginOptionsChanged ||
                  (selectedDeviceType !== DESKTOP && (dialNumberValue.trim().length === 0 || showDNError))
                }
                onClick={() => setShowSaveConfirmDialog(true)}
                data-testid="save-login-options-button"
                color="positive"
              >
                {StationLoginLabels.SAVE}
              </Button>
            )}
            {!isAgentLoggedIn && (
              <Button onClick={login} disabled={showDNError} data-testid="login-button">
                {StationLoginLabels.SAVE_AND_CONTINUE}
              </Button>
            )}
            {onCCSignOut && !profileMode && (
              <Button onClick={() => setShowCCSignOutModal(true)} variant="secondary" className="white-button">
                {StationLoginLabels.SIGN_OUT}
              </Button>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default StationLoginComponent;
