import React, {useEffect, useState} from 'react';
import {StationLoginComponentProps} from './station-login.types';
import './station-login.style.scss';
import {SignInErrors, StationLoginLabels} from './constants';
import {LoginOptions, DESKTOP} from '@webex/cc-store';
import {Button, Icon, Select, Option, Text, Tooltip, Input} from '@momentum-design/components/dist/react';
import {
  ccCancelButtonClicked,
  continueClicked,
  createStationLoginRefs,
  handleDNInputChanged,
  handleLoginOptionChanged,
  handleModals,
  handleSaveConfirm,
  handleTeamSelectChanged,
  saveConfirmCancelClicked,
  updateDialNumberLabel,
  handleCCSignoutKeyDown,
} from './station-login.utils';
import {withMetrics} from '@webex/cc-ui-logging';

const StationLoginComponent: React.FunctionComponent<StationLoginComponentProps> = (props) => {
  const {
    teams,
    login,
    loginOptions,
    loginFailure,
    setDeviceType,
    setDialNumber,
    setDialNumberValue,
    setTeam,
    isAgentLoggedIn,
    deviceType,
    dialNumberRegex,
    showMultipleLoginAlert,
    handleContinue,
    onCCSignOut,
    setTeamId,
    logger,
    isLoginOptionsChanged,
    saveLoginOptions,
    saveError,
    setCurrentLoginOptions,
    originalLoginOptions,
    profileMode,
    selectedTeamId,
    setSelectedDeviceType,
    selectedDeviceType,
    dialNumberValue,
    setSelectedTeamId,
    hideDesktopLogin,
  } = props;

  const [dialNumberLabel, setDialNumberLabel] = useState<string>('');

  const [dialNumberPlaceholder, setDialNumberPlaceholder] = useState<string>('');
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const [showCCSignOutModal, setShowCCSignOutModal] = useState<boolean>(false);
  const [showDNError, setShowDNError] = useState<boolean>(false);
  const [dnErrorText, setDNErrorText] = useState<string>('');
  const {multiSignInModalRef, ccSignOutModalRef, saveConfirmDialogRef} = createStationLoginRefs(logger);

  // Filter out Desktop mode if hideDesktopLogin is true
  const filteredLoginOptions = hideDesktopLogin ? loginOptions.filter((option) => option !== DESKTOP) : loginOptions;

  useEffect(() => {
    if (deviceType !== DESKTOP && Object.keys(LoginOptions).includes(deviceType)) {
      updateDialNumberLabel(deviceType, setDialNumberLabel, setDialNumberPlaceholder, logger);
    }
  }, [selectedDeviceType, isAgentLoggedIn]);

  // show modals
  useEffect(() => {
    handleModals(
      multiSignInModalRef,
      ccSignOutModalRef,
      saveConfirmDialogRef,
      showMultipleLoginAlert,
      showCCSignOutModal,
      showSaveConfirmDialog,
      logger
    );
  }, [showMultipleLoginAlert, showCCSignOutModal, showSaveConfirmDialog]);

  return (
    <>
      {/* TODO: Replace dialog with momentum-design modal component once available */}
      <dialog data-testid="multi-sign-in-modal" ref={multiSignInModalRef} className="dialog-modal">
        <Text tagname="h2" type="body-large-bold" className="modal-text">
          {StationLoginLabels.MULTIPLE_SIGN_IN_ALERT_TITLE}
        </Text>
        <Text tagname="p" type="body-midsize-regular" className="modal-text">
          {StationLoginLabels.MULTIPLE_SIGN_IN_ALERT_MESSAGE}
        </Text>
        <div className="dialog-modal-content">
          <Button
            id="ContinueButton"
            data-testid="ContinueButton"
            onClick={() => continueClicked(multiSignInModalRef, handleContinue, setShowCCSignOutModal, logger)}
            variant="secondary"
            className="white-button"
          >
            {StationLoginLabels.CONTINUE}
          </Button>
        </div>
      </dialog>
      {/* TODO: Replace dialog with momentum-design modal component once available */}
      <dialog
        ref={ccSignOutModalRef}
        className="dialog-modal"
        data-testid="cc-logout-modal"
        onKeyDown={(e) => handleCCSignoutKeyDown(e, setShowCCSignOutModal, logger)}
      >
        <Text tagname="h2" type="body-large-bold" className="modal-text">
          {StationLoginLabels.CC_SIGN_OUT}
        </Text>
        <Text tagname="p" type="body-midsize-regular" className="modal-text">
          {StationLoginLabels.CC_SIGN_OUT_CONFIRM}
        </Text>
        <div className="dialog-modal-content">
          <Button
            onClick={() => ccCancelButtonClicked(ccSignOutModalRef, setShowCCSignOutModal, logger)}
            variant="secondary"
            className="white-button"
            data-testId="cc-cancel-button"
          >
            {StationLoginLabels.CANCEL}
          </Button>
          <Button
            data-testId="cc-logout-button"
            onClick={() => continueClicked(ccSignOutModalRef, onCCSignOut, setShowCCSignOutModal, logger)}
          >
            {StationLoginLabels.SIGN_OUT}
          </Button>
        </div>
      </dialog>
      {/* Save Confirmation Dialog */}
      <dialog ref={saveConfirmDialogRef} className="dialog-modal" data-testid="interaction-confirmation-dialog">
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
            onClick={() => saveConfirmCancelClicked(saveConfirmDialogRef, setShowSaveConfirmDialog, logger)}
            className="cancelSaveLoginOptions"
          ></Button>
        </div>
        <Text tagname="p" type="body-midsize-regular" className="modal-text">
          {StationLoginLabels.CONFIRM_INTERACTION_PREFERENCE_CHANGES_MESSAGE}
        </Text>
        <div className="dialog-modal-content">
          <Button
            onClick={() => saveConfirmCancelClicked(saveConfirmDialogRef, setShowSaveConfirmDialog, logger)}
            variant="secondary"
            className="white-button"
          >
            {StationLoginLabels.CANCEL}
          </Button>
          <Button
            onClick={() => handleSaveConfirm(saveConfirmDialogRef, setShowSaveConfirmDialog, saveLoginOptions, logger)}
          >
            {StationLoginLabels.CONFIRM}
          </Button>
        </div>
      </dialog>
      <div className="box station-login" data-testid="station-login-widget">
        <section className="section-box">
          {!profileMode && (
            <Text tagname={'span'} type="body-large-bold" data-testid="station-login-label">
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
                  handleLoginOptionChanged(
                    event,
                    setDeviceType,
                    setSelectedDeviceType,
                    updateDialNumberLabel,
                    setDialNumber,
                    setDialNumberValue,
                    setCurrentLoginOptions,
                    originalLoginOptions,
                    setDialNumberLabel,
                    setDialNumberPlaceholder,
                    setShowDNError,
                    setSelectedTeamId,
                    setTeamId,
                    logger,
                    selectedTeamId
                  );
                }}
                value={selectedDeviceType}
                className="station-login-select"
                selectedValue={selectedDeviceType}
                selectedValueText={LoginOptions[selectedDeviceType]}
              >
                {Object.keys(LoginOptions).map((option: string, index: number) => {
                  // only show loginOptions provided by store and filtered by hideDesktopLogin
                  if (filteredLoginOptions.includes(option)) {
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
              id="dial-number-input"
              data-testid="dial-number-input"
              label={dialNumberLabel}
              placeholder={dialNumberPlaceholder}
              value={dialNumberValue}
              onInput={(event) => {
                handleDNInputChanged(
                  event,
                  setDialNumberValue,
                  setDialNumber,
                  setShowDNError,
                  setDNErrorText,
                  dialNumberRegex,
                  setCurrentLoginOptions,
                  selectedDeviceType,
                  logger
                );
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
                handleTeamSelectChanged(event, setSelectedTeamId, setTeamId, setCurrentLoginOptions, setTeam, logger);
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
            <Text data-testId="save-error" className="error-text-color" type={'body-midsize-regular'}>
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
              <Button
                onClick={() => setShowCCSignOutModal(true)}
                variant="secondary"
                className="white-button"
                data-testid="sign-out-button"
              >
                {StationLoginLabels.SIGN_OUT}
              </Button>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

const StationLoginComponentWithMetrics = withMetrics(StationLoginComponent, 'StationLogin');
export default StationLoginComponentWithMetrics;
