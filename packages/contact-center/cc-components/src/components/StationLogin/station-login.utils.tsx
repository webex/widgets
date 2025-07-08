import {useRef} from 'react';
import {StationLoginLabels} from './constants';
import {LoginOptions, DESKTOP, DIALNUMBER} from '@webex/cc-store';

const handleModals = (
  modalRef,
  ccSignOutModalRef,
  saveConfirmDialogRef,
  showMultipleLoginAlert,
  showCCSignOutModal,
  showSaveConfirmDialog
) => {
  const modalStates = [
    {ref: modalRef, show: showMultipleLoginAlert},
    {ref: ccSignOutModalRef, show: showCCSignOutModal},
    {ref: saveConfirmDialogRef, show: showSaveConfirmDialog},
  ];

  modalStates.forEach(({ref, show}) => {
    if (ref?.current) {
      if (show && !ref.current.open) {
        ref.current.showModal();
      } else if (!show && ref.current.open) {
        ref.current.close();
      }
    }
  });
};
/**
 * Handler for the Contact Center modal continue button
 * @param modalRef
 * @param callback
 *
 * Handler for the Contact Center modal continue button
 * Closes the dialog if it is currently open and calls the provided callback function
 */

const continueClicked = (modalRef, callback, setShowCCSignOutModal) => {
  setShowCCSignOutModal(false);
  if (modalRef.current) {
    modalRef.current.close();
    callback();
  }
};

/**
 * Handler for the Contact Center logout confirmation modal cancel button
 *
 * Closes the dialog if it is currently open
 */
const ccCancelButtonClicked = (
  ccSignOutModalRef: React.RefObject<HTMLDialogElement>,
  setShowCCSignOutModal: (show: boolean) => void
) => {
  if (ccSignOutModalRef?.current?.open) {
    ccSignOutModalRef.current.close();
    setShowCCSignOutModal(false);
  }
};

const updateDialNumberLabel = (
  selectedOption: string,
  setDialNumberLabel: (label: string) => void,
  setDialNumberPlaceholder: (placeholder: string) => void
): void => {
  if (selectedOption !== DESKTOP && Object.keys(LoginOptions).includes(selectedOption)) {
    setDialNumberLabel(LoginOptions[selectedOption]);
    setDialNumberPlaceholder(LoginOptions[selectedOption]);
  }
};

/**
 * Runs validation tests on a string given as a Dial Number
 * @param {string} input
 * @returns {boolean} whether or not to show a validation error
 */
const validateDialNumber = (
  input: string,
  dialNumberRegex: null | string,
  setDNErrorText: (error: string) => void
): boolean => {
  const regexForDn = new RegExp(dialNumberRegex ?? '1[0-9]{3}[2-9][0-9]{6}([,]{1,10}[0-9]+){0,1}');
  if (regexForDn.test(input)) {
    return false;
  }
  setDNErrorText(StationLoginLabels.DN_FORMAT_ERROR);
  return true;
};

const createStationLoginRefs = () => {
  return {
    multiSignInModalRef: useRef<HTMLDialogElement>(null),
    ccSignOutModalRef: useRef<HTMLDialogElement>(null),
    saveConfirmDialogRef: useRef<HTMLDialogElement>(null),
  };
};

const saveConfirmCancelClicked = (saveConfirmDialogRef, setShowSaveConfirmDialog) => {
  if (saveConfirmDialogRef?.current?.open) {
    saveConfirmDialogRef.current.close();
    setShowSaveConfirmDialog(false);
  }
};

const handleSaveConfirm = (saveConfirmDialogRef, setShowSaveConfirmDialog, saveLoginOptions) => {
  saveConfirmCancelClicked(saveConfirmDialogRef, setShowSaveConfirmDialog);
  saveLoginOptions();
};

const handleLoginOptionChanged = (
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
) => {
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
    updateDialNumberLabel(selectedOption, setDialNumberLabel, setDialNumberPlaceholder);
    // clear dial number when switching between DN and Extension
    setDialNumber('');
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
};

const handleDNInputChanged = (
  event,
  setDialNumberValue,
  setDialNumber,
  setShowDNError,
  setDNErrorText,
  dialNumberRegex,
  setCurrentLoginOptions,
  selectedDeviceType,
  logger
) => {
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
    setShowDNError(validateDialNumber(input, dialNumberRegex, setDNErrorText));
  } else {
    setShowDNError(false);
  }
  setCurrentLoginOptions((prev) => {
    return {
      ...prev,
      dialNumber: input,
    };
  });
};

const handleTeamSelectChanged = (event, setSelectedTeamId, setTeamId, setCurrentLoginOptions, setTeam, logger) => {
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
};

const handleOnCCSignOut = (ccSignOutModalRef: React.RefObject<HTMLDialogElement>, onCCSignOut) => {
  if (ccSignOutModalRef?.current?.open) {
    ccSignOutModalRef.current.close();
  }
  onCCSignOut();
};

const handleCCSignoutKeyDown = (
  event: React.KeyboardEvent<HTMLDialogElement>,
  setShowCCSignOutModal: (show: boolean) => void
) => {
  if (event.key === 'Escape') {
    setShowCCSignOutModal(false);
  }
};

export {
  handleModals,
  continueClicked,
  ccCancelButtonClicked,
  updateDialNumberLabel,
  validateDialNumber,
  createStationLoginRefs,
  saveConfirmCancelClicked,
  handleSaveConfirm,
  handleLoginOptionChanged,
  handleDNInputChanged,
  handleTeamSelectChanged,
  handleOnCCSignOut,
  handleCCSignoutKeyDown,
};
