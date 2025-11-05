import {useRef} from 'react';
import {StationLoginLabels} from './constants';
import {LoginOptions, DESKTOP, DIAL_NUMBER} from '@webex/cc-store';

const handleModals = (
  modalRef,
  ccSignOutModalRef,
  saveConfirmDialogRef,
  showMultipleLoginAlert,
  showCCSignOutModal,
  showSaveConfirmDialog,
  logger
) => {
  try {
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
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in handleModals', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'handleModals',
      error: error.message,
    });
  }
};
/**
 * Handler for the Contact Center modal continue button
 * @param modalRef
 * @param callback
 *
 * Handler for the Contact Center modal continue button
 * Closes the dialog if it is currently open and calls the provided callback function
 */

const continueClicked = (modalRef, callback, setShowCCSignOutModal, logger) => {
  try {
    setShowCCSignOutModal(false);
    if (modalRef.current) {
      modalRef.current.close();
      callback();
    }
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in continueClicked', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'continueClicked',
      error: error.message,
    });
  }
};

/**
 * Handler for the Contact Center logout confirmation modal cancel button
 *
 * Closes the dialog if it is currently open
 */
const ccCancelButtonClicked = (
  ccSignOutModalRef: React.RefObject<HTMLDialogElement>,
  setShowCCSignOutModal: (show: boolean) => void,
  logger
) => {
  try {
    if (ccSignOutModalRef?.current?.open) {
      ccSignOutModalRef.current.close();
      setShowCCSignOutModal(false);
    }
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in ccCancelButtonClicked', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'ccCancelButtonClicked',
      error: error.message,
    });
  }
};

const updateDialNumberLabel = (
  selectedOption: string,
  setDialNumberLabel: (label: string) => void,
  setDialNumberPlaceholder: (placeholder: string) => void,
  logger
): void => {
  try {
    if (selectedOption !== DESKTOP && Object.keys(LoginOptions).includes(selectedOption)) {
      setDialNumberLabel(LoginOptions[selectedOption]);
      setDialNumberPlaceholder(LoginOptions[selectedOption]);
    }
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in updateDialNumberLabel', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'updateDialNumberLabel',
      error: error.message,
    });
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
  setDNErrorText: (error: string) => void,
  logger
): boolean => {
  try {
    const regexForDn = new RegExp(dialNumberRegex ?? '1[0-9]{3}[2-9][0-9]{6}([,]{1,10}[0-9]+){0,1}');
    if (regexForDn.test(input)) {
      return false;
    }
    setDNErrorText(StationLoginLabels.DN_FORMAT_ERROR);
    return true;
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in validateDialNumber', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'validateDialNumber',
      error: error.message,
    });
    setDNErrorText(StationLoginLabels.DN_FORMAT_ERROR);
    return true;
  }
};

const createStationLoginRefs = (logger) => {
  try {
    return {
      multiSignInModalRef: useRef<HTMLDialogElement>(null),
      ccSignOutModalRef: useRef<HTMLDialogElement>(null),
      saveConfirmDialogRef: useRef<HTMLDialogElement>(null),
    };
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in createStationLoginRefs', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'createStationLoginRefs',
      error: error.message,
    });
    return {
      multiSignInModalRef: useRef<HTMLDialogElement>(null),
      ccSignOutModalRef: useRef<HTMLDialogElement>(null),
      saveConfirmDialogRef: useRef<HTMLDialogElement>(null),
    };
  }
};

const saveConfirmCancelClicked = (saveConfirmDialogRef, setShowSaveConfirmDialog, logger) => {
  try {
    if (saveConfirmDialogRef?.current?.open) {
      saveConfirmDialogRef.current.close();
      setShowSaveConfirmDialog(false);
    }
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in saveConfirmCancelClicked', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'saveConfirmCancelClicked',
      error: error.message,
    });
  }
};

const handleSaveConfirm = (saveConfirmDialogRef, setShowSaveConfirmDialog, saveLoginOptions, logger) => {
  try {
    saveConfirmCancelClicked(saveConfirmDialogRef, setShowSaveConfirmDialog, logger);
    saveLoginOptions();
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in handleSaveConfirm', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'handleSaveConfirm',
      error: error.message,
    });
  }
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
  try {
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
      updateDialNumberLabel(selectedOption, setDialNumberLabel, setDialNumberPlaceholder, logger);
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
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in handleLoginOptionChanged', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'handleLoginOptionChanged',
      error: error.message,
    });
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
  try {
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
    } else if (selectedDeviceType === DIAL_NUMBER) {
      setShowDNError(validateDialNumber(input, dialNumberRegex, setDNErrorText, logger));
    } else {
      setShowDNError(false);
    }
    setCurrentLoginOptions((prev) => {
      return {
        ...prev,
        dialNumber: input,
      };
    });
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in handleDNInputChanged', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'handleDNInputChanged',
      error: error.message,
    });
  }
};

const handleTeamSelectChanged = (event, setSelectedTeamId, setTeamId, setCurrentLoginOptions, setTeam, logger) => {
  try {
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
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in handleTeamSelectChanged', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'handleTeamSelectChanged',
      error: error.message,
    });
  }
};

const handleOnCCSignOut = (ccSignOutModalRef: React.RefObject<HTMLDialogElement>, onCCSignOut, logger) => {
  try {
    if (ccSignOutModalRef?.current?.open) {
      ccSignOutModalRef.current.close();
    }
    onCCSignOut();
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in handleOnCCSignOut', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'handleOnCCSignOut',
      error: error.message,
    });
  }
};

const handleCCSignoutKeyDown = (
  event: React.KeyboardEvent<HTMLDialogElement>,
  setShowCCSignOutModal: (show: boolean) => void,
  logger
) => {
  try {
    if (event.key === 'Escape') {
      setShowCCSignOutModal(false);
    }
  } catch (error) {
    logger?.error('CC-Widgets: StationLogin: Error in handleCCSignoutKeyDown', {
      module: 'cc-components#station-login.utils.tsx',
      method: 'handleCCSignoutKeyDown',
      error: error.message,
    });
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
