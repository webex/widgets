import React from 'react';
import '@testing-library/jest-dom';
import {
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
} from '../../../src/components/StationLogin/station-login.utils';
import {
  DESKTOP,
  DIALNUMBER,
  EXTENSION,
  LoginOptions,
  StationLoginLabels,
} from '../../../src/components/StationLogin/constants';

const loggerMock = {
  info: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

describe('Station Login Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleModals', () => {
    let mockModalRef: React.RefObject<HTMLDialogElement>;
    let mockCCSignOutModalRef: React.RefObject<HTMLDialogElement>;
    let mockSaveConfirmDialogRef: React.RefObject<HTMLDialogElement>;

    beforeEach(() => {
      mockModalRef = {
        current: {
          open: false,
          showModal: jest.fn(),
          close: jest.fn(),
        } as unknown as HTMLDialogElement,
      };
      mockCCSignOutModalRef = {
        current: {
          open: false,
          showModal: jest.fn(),
          close: jest.fn(),
        } as unknown as HTMLDialogElement,
      };
      mockSaveConfirmDialogRef = {
        current: {
          open: false,
          showModal: jest.fn(),
          close: jest.fn(),
        } as unknown as HTMLDialogElement,
      };
    });

    it('should show modal when showMultipleLoginAlert is true and modal is not open', () => {
      handleModals(mockModalRef, mockCCSignOutModalRef, mockSaveConfirmDialogRef, true, false, false);
      expect(mockModalRef.current?.showModal).toHaveBeenCalled();
    });

    it('should close modal when showMultipleLoginAlert is false and modal is open', () => {
      if (mockModalRef.current) {
        mockModalRef.current.open = true;
      }
      handleModals(mockModalRef, mockCCSignOutModalRef, mockSaveConfirmDialogRef, false, false, false);
      expect(mockModalRef.current?.close).toHaveBeenCalled();
    });

    it('should show CC sign out modal when showCCSignOutModal is true', () => {
      handleModals(mockModalRef, mockCCSignOutModalRef, mockSaveConfirmDialogRef, false, true, false);
      expect(mockCCSignOutModalRef.current?.showModal).toHaveBeenCalled();
    });

    it('should show save confirm dialog when showSaveConfirmDialog is true', () => {
      handleModals(mockModalRef, mockCCSignOutModalRef, mockSaveConfirmDialogRef, false, false, true);
      expect(mockSaveConfirmDialogRef.current?.showModal).toHaveBeenCalled();
    });

    it('should handle null refs gracefully', () => {
      const nullRef = {current: null};
      expect(() => {
        handleModals(nullRef, nullRef, nullRef, true, true, true);
      }).not.toThrow();
    });
  });

  describe('continueClicked', () => {
    it('should close modal and call handleContinue', () => {
      const mockModalRef = {
        current: {
          close: jest.fn(),
        } as unknown as HTMLDialogElement,
      };
      const mockHandleContinue = jest.fn();

      continueClicked(mockModalRef, mockHandleContinue);

      expect(mockModalRef.current?.close).toHaveBeenCalled();
      expect(mockHandleContinue).toHaveBeenCalled();
    });

    it('should handle null ref gracefully', () => {
      const nullRef = {current: null};
      const mockHandleContinue = jest.fn();

      expect(() => {
        continueClicked(nullRef, mockHandleContinue);
      }).not.toThrow();
    });
  });

  describe('ccCancelButtonClicked', () => {
    it('should close modal and set show state to false when modal is open', () => {
      const mockRef = {
        current: {
          open: true,
          close: jest.fn(),
        } as unknown as HTMLDialogElement,
      };
      const mockSetShowCCSignOutModal = jest.fn();

      ccCancelButtonClicked(mockRef, mockSetShowCCSignOutModal);

      expect(mockRef.current?.close).toHaveBeenCalled();
      expect(mockSetShowCCSignOutModal).toHaveBeenCalledWith(false);
    });

    it('should not close modal when modal is not open', () => {
      const mockRef = {
        current: {
          open: false,
          close: jest.fn(),
        } as unknown as HTMLDialogElement,
      };
      const mockSetShowCCSignOutModal = jest.fn();

      ccCancelButtonClicked(mockRef, mockSetShowCCSignOutModal);

      expect(mockRef.current?.close).not.toHaveBeenCalled();
      expect(mockSetShowCCSignOutModal).not.toHaveBeenCalled();
    });

    it('should handle null ref gracefully', () => {
      const nullRef = {current: null};
      const mockSetShowCCSignOutModal = jest.fn();

      expect(() => {
        ccCancelButtonClicked(nullRef, mockSetShowCCSignOutModal);
      }).not.toThrow();
    });
  });

  describe('updateDialNumberLabel', () => {
    it('should update label and placeholder for DIALNUMBER option', () => {
      const mockSetDialNumberLabel = jest.fn();
      const mockSetDialNumberPlaceholder = jest.fn();

      updateDialNumberLabel(DIALNUMBER, mockSetDialNumberLabel, mockSetDialNumberPlaceholder);

      expect(mockSetDialNumberLabel).toHaveBeenCalledWith(LoginOptions[DIALNUMBER]);
      expect(mockSetDialNumberPlaceholder).toHaveBeenCalledWith(LoginOptions[DIALNUMBER]);
    });

    it('should update label and placeholder for EXTENSION option', () => {
      const mockSetDialNumberLabel = jest.fn();
      const mockSetDialNumberPlaceholder = jest.fn();

      updateDialNumberLabel(EXTENSION, mockSetDialNumberLabel, mockSetDialNumberPlaceholder);

      expect(mockSetDialNumberLabel).toHaveBeenCalledWith(LoginOptions[EXTENSION]);
      expect(mockSetDialNumberPlaceholder).toHaveBeenCalledWith(LoginOptions[EXTENSION]);
    });

    it('should not update label for DESKTOP option', () => {
      const mockSetDialNumberLabel = jest.fn();
      const mockSetDialNumberPlaceholder = jest.fn();

      updateDialNumberLabel(DESKTOP, mockSetDialNumberLabel, mockSetDialNumberPlaceholder);

      expect(mockSetDialNumberLabel).not.toHaveBeenCalled();
      expect(mockSetDialNumberPlaceholder).not.toHaveBeenCalled();
    });

    it('should not update label for invalid option', () => {
      const mockSetDialNumberLabel = jest.fn();
      const mockSetDialNumberPlaceholder = jest.fn();

      updateDialNumberLabel('INVALID_OPTION', mockSetDialNumberLabel, mockSetDialNumberPlaceholder);

      expect(mockSetDialNumberLabel).not.toHaveBeenCalled();
      expect(mockSetDialNumberPlaceholder).not.toHaveBeenCalled();
    });
  });

  describe('validateDialNumber', () => {
    const mockSetDNErrorText = jest.fn();

    beforeEach(() => {
      mockSetDNErrorText.mockClear();
    });

    it('should return false for valid dial number with default regex', () => {
      const validNumber = '15552234567'; // Changed 4th digit from 1 to 2 to match [2-9] pattern
      const result = validateDialNumber(validNumber, null, mockSetDNErrorText);
      expect(result).toBe(false);
      expect(mockSetDNErrorText).not.toHaveBeenCalled();
    });

    it('should return true for invalid dial number and set error text', () => {
      const invalidNumber = '911'; // This should be invalid for the default regex (too short and doesn't match pattern)
      const result = validateDialNumber(invalidNumber, null, mockSetDNErrorText);
      expect(result).toBe(true);
      expect(mockSetDNErrorText).toHaveBeenCalledWith(StationLoginLabels.DN_FORMAT_ERROR);
    });

    it('should accept any input when empty string regex is provided', () => {
      const anyNumber = '911'; // With empty string regex, this becomes /(?:)/ which matches everything
      const result = validateDialNumber(anyNumber, '', mockSetDNErrorText);
      expect(result).toBe(false); // Should return false (no error) because empty regex matches everything
      expect(mockSetDNErrorText).not.toHaveBeenCalled();
    });

    it('should use custom regex when provided', () => {
      const customRegex = '^\\d{10}$';
      const validNumber = '1234567890';
      const result = validateDialNumber(validNumber, customRegex, mockSetDNErrorText);
      expect(result).toBe(false);
      expect(mockSetDNErrorText).not.toHaveBeenCalled();
    });

    it('should return true for invalid number with custom regex', () => {
      const customRegex = '^\\d{10}$';
      const invalidNumber = '123';
      const result = validateDialNumber(invalidNumber, customRegex, mockSetDNErrorText);
      expect(result).toBe(true);
      expect(mockSetDNErrorText).toHaveBeenCalledWith(StationLoginLabels.DN_FORMAT_ERROR);
    });
  });

  describe('createStationLoginRefs', () => {
    it('should be a function that creates refs', () => {
      // Since this function uses React hooks, we can only test its structure
      expect(typeof createStationLoginRefs).toBe('function');
    });
  });

  describe('saveConfirmCancelClicked', () => {
    it('should close dialog and set show state to false when dialog is open', () => {
      const mockRef = {
        current: {
          open: true,
          close: jest.fn(),
        } as unknown as HTMLDialogElement,
      };
      const mockSetShowSaveConfirmDialog = jest.fn();

      saveConfirmCancelClicked(mockRef, mockSetShowSaveConfirmDialog);

      expect(mockRef.current?.close).toHaveBeenCalled();
      expect(mockSetShowSaveConfirmDialog).toHaveBeenCalledWith(false);
    });

    it('should handle null ref gracefully', () => {
      const nullRef = {current: null};
      const mockSetShowSaveConfirmDialog = jest.fn();

      expect(() => {
        saveConfirmCancelClicked(nullRef, mockSetShowSaveConfirmDialog);
      }).not.toThrow();
    });
  });

  describe('handleSaveConfirm', () => {
    it('should close dialog, set show state to false, and call saveLoginOptions', () => {
      const mockRef = {
        current: {
          open: true,
          close: jest.fn(),
        } as unknown as HTMLDialogElement,
      };
      const mockSetShowSaveConfirmDialog = jest.fn();
      const mockSaveLoginOptions = jest.fn();

      handleSaveConfirm(mockRef, mockSetShowSaveConfirmDialog, mockSaveLoginOptions);

      expect(mockRef.current?.close).toHaveBeenCalled();
      expect(mockSetShowSaveConfirmDialog).toHaveBeenCalledWith(false);
      expect(mockSaveLoginOptions).toHaveBeenCalled();
    });
  });

  describe('handleLoginOptionChanged', () => {
    const mockSetters = {
      setDeviceType: jest.fn(),
      setSelectedDeviceType: jest.fn(),
      setDialNumber: jest.fn(),
      setDialNumberValue: jest.fn(),
      setCurrentLoginOptions: jest.fn(),
      setDialNumberLabel: jest.fn(),
      setDialNumberPlaceholder: jest.fn(),
      setShowDNError: jest.fn(),
      setSelectedTeamId: jest.fn(),
      setTeamId: jest.fn(),
    };

    const mockUpdateDialNumberLabel = jest.fn();
    const originalLoginOptions = {
      deviceType: EXTENSION,
      dialNumber: '1234',
      teamId: 'team123',
    };

    beforeEach(() => {
      Object.values(mockSetters).forEach((mock) => mock.mockClear());
      mockUpdateDialNumberLabel.mockClear();
      loggerMock.info.mockClear();
    });

    it('should handle valid login option change', () => {
      const event = {detail: {value: DIALNUMBER}};

      handleLoginOptionChanged(
        event,
        mockSetters.setDeviceType,
        mockSetters.setSelectedDeviceType,
        mockUpdateDialNumberLabel,
        mockSetters.setDialNumber,
        mockSetters.setDialNumberValue,
        mockSetters.setCurrentLoginOptions,
        originalLoginOptions,
        mockSetters.setDialNumberLabel,
        mockSetters.setDialNumberPlaceholder,
        mockSetters.setShowDNError,
        mockSetters.setSelectedTeamId,
        mockSetters.setTeamId,
        loggerMock,
        'team456'
      );

      expect(loggerMock.info).toHaveBeenCalledWith(`CC-Widgets: StationLogin: login option changed to: ${DIALNUMBER}`, {
        module: 'cc-components#station-login.tsx',
        method: 'loginOptionChanged',
      });
      expect(mockSetters.setDeviceType).toHaveBeenCalledWith(DIALNUMBER);
      expect(mockSetters.setSelectedDeviceType).toHaveBeenCalledWith(DIALNUMBER);
      expect(mockUpdateDialNumberLabel).toHaveBeenCalled();
      expect(mockSetters.setDialNumber).toHaveBeenCalledWith('');
      expect(mockSetters.setShowDNError).toHaveBeenCalledWith(false);
      expect(mockSetters.setCurrentLoginOptions).toHaveBeenCalledWith({
        deviceType: DIALNUMBER,
        dialNumber: '',
        teamId: 'team456',
      });
    });

    it('should handle valid login option change without selectedTeamId', () => {
      const event = {detail: {value: DIALNUMBER}};

      handleLoginOptionChanged(
        event,
        mockSetters.setDeviceType,
        mockSetters.setSelectedDeviceType,
        mockUpdateDialNumberLabel,
        mockSetters.setDialNumber,
        mockSetters.setDialNumberValue,
        mockSetters.setCurrentLoginOptions,
        originalLoginOptions,
        mockSetters.setDialNumberLabel,
        mockSetters.setDialNumberPlaceholder,
        mockSetters.setShowDNError,
        mockSetters.setSelectedTeamId,
        mockSetters.setTeamId,
        loggerMock,
        null
      );

      expect(loggerMock.info).toHaveBeenCalledWith(`CC-Widgets: StationLogin: login option changed to: ${DIALNUMBER}`, {
        module: 'cc-components#station-login.tsx',
        method: 'loginOptionChanged',
      });
      expect(mockSetters.setDeviceType).toHaveBeenCalledWith(DIALNUMBER);
      expect(mockSetters.setSelectedDeviceType).toHaveBeenCalledWith(DIALNUMBER);
      expect(mockUpdateDialNumberLabel).toHaveBeenCalled();
      expect(mockSetters.setDialNumber).toHaveBeenCalledWith('');
      expect(mockSetters.setShowDNError).toHaveBeenCalledWith(false);
      expect(mockSetters.setCurrentLoginOptions).toHaveBeenCalledWith({
        deviceType: DIALNUMBER,
        dialNumber: '',
        teamId: '',
      });
    });

    it('should restore original values when switching back to original device type', () => {
      const event = {detail: {value: EXTENSION}};

      handleLoginOptionChanged(
        event,
        mockSetters.setDeviceType,
        mockSetters.setSelectedDeviceType,
        mockUpdateDialNumberLabel,
        mockSetters.setDialNumber,
        mockSetters.setDialNumberValue,
        mockSetters.setCurrentLoginOptions,
        originalLoginOptions,
        mockSetters.setDialNumberLabel,
        mockSetters.setDialNumberPlaceholder,
        mockSetters.setShowDNError,
        mockSetters.setSelectedTeamId,
        mockSetters.setTeamId,
        loggerMock,
        'team456'
      );

      expect(mockSetters.setCurrentLoginOptions).toHaveBeenCalledWith({
        deviceType: EXTENSION,
        dialNumber: '1234',
        teamId: 'team123',
      });
      expect(mockSetters.setDialNumberValue).toHaveBeenCalledWith('1234');
      expect(mockSetters.setDialNumber).toHaveBeenCalledWith('1234');
      expect(mockSetters.setSelectedTeamId).toHaveBeenCalledWith('team123');
      expect(mockSetters.setTeamId).toHaveBeenCalledWith('team123');
    });

    it('should restore original values when switching back to original device type without originalLoginOptions', () => {
      const event = {detail: {value: EXTENSION}};

      handleLoginOptionChanged(
        event,
        mockSetters.setDeviceType,
        mockSetters.setSelectedDeviceType,
        mockUpdateDialNumberLabel,
        mockSetters.setDialNumber,
        mockSetters.setDialNumberValue,
        mockSetters.setCurrentLoginOptions,
        {deviceType: EXTENSION}, // No original values
        mockSetters.setDialNumberLabel,
        mockSetters.setDialNumberPlaceholder,
        mockSetters.setShowDNError,
        mockSetters.setSelectedTeamId,
        mockSetters.setTeamId,
        loggerMock,
        'team456'
      );

      expect(mockSetters.setCurrentLoginOptions).toHaveBeenCalledWith({
        deviceType: EXTENSION,
        dialNumber: '',
        teamId: '',
      });
      expect(mockSetters.setDialNumberValue).toHaveBeenCalledWith('');
      expect(mockSetters.setDialNumber).toHaveBeenCalledWith('');
      expect(mockSetters.setSelectedTeamId).toHaveBeenCalledWith('');
      expect(mockSetters.setTeamId).toHaveBeenCalledWith('');
    });

    it('should not process invalid login options', () => {
      const event = {detail: {value: 'INVALID_OPTION'}};

      handleLoginOptionChanged(
        event,
        mockSetters.setDeviceType,
        mockSetters.setSelectedDeviceType,
        mockUpdateDialNumberLabel,
        mockSetters.setDialNumber,
        mockSetters.setDialNumberValue,
        mockSetters.setCurrentLoginOptions,
        originalLoginOptions,
        mockSetters.setDialNumberLabel,
        mockSetters.setDialNumberPlaceholder,
        mockSetters.setShowDNError,
        mockSetters.setSelectedTeamId,
        mockSetters.setTeamId,
        loggerMock,
        'team456'
      );

      expect(mockSetters.setDeviceType).not.toHaveBeenCalled();
    });
  });

  describe('handleDNInputChanged', () => {
    const mockSetters = {
      setDialNumberValue: jest.fn(),
      setDialNumber: jest.fn(),
      setShowDNError: jest.fn(),
      setDNErrorText: jest.fn(),
      setCurrentLoginOptions: jest.fn(),
    };

    beforeEach(() => {
      Object.values(mockSetters).forEach((mock) => mock.mockClear());
      loggerMock.info.mockClear();
    });

    it('should handle valid input for dial number', () => {
      const event = {target: {value: '15551234567'}};
      const dialNumberRegex = '';

      handleDNInputChanged(
        event,
        mockSetters.setDialNumberValue,
        mockSetters.setDialNumber,
        mockSetters.setShowDNError,
        mockSetters.setDNErrorText,
        dialNumberRegex,
        mockSetters.setCurrentLoginOptions,
        DIALNUMBER,
        loggerMock
      );

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: StationLogin: dialNumber input changed: 15551234567', {
        module: 'cc-components#station-login.tsx',
        method: 'dialNumberInputChanged',
      });
      expect(mockSetters.setDialNumberValue).toHaveBeenCalledWith('15551234567');
      expect(mockSetters.setDialNumber).toHaveBeenCalledWith('15551234567');
      expect(mockSetters.setShowDNError).toHaveBeenCalledWith(false);
    });

    it('should show error for empty input', () => {
      const event = {target: {value: '   '}};
      const dialNumberRegex = '';

      handleDNInputChanged(
        event,
        mockSetters.setDialNumberValue,
        mockSetters.setDialNumber,
        mockSetters.setShowDNError,
        mockSetters.setDNErrorText,
        dialNumberRegex,
        mockSetters.setCurrentLoginOptions,
        EXTENSION,
        loggerMock
      );

      expect(mockSetters.setDNErrorText).toHaveBeenCalledWith(
        `${LoginOptions[EXTENSION]} ${StationLoginLabels.IS_REQUIRED}`
      );
      expect(mockSetters.setShowDNError).toHaveBeenCalledWith(true);
    });

    it('should validate dial number format for DIALNUMBER type', () => {
      const event = {target: {value: '911'}};
      const dialNumberRegex = null; // Use null to trigger default regex

      handleDNInputChanged(
        event,
        mockSetters.setDialNumberValue,
        mockSetters.setDialNumber,
        mockSetters.setShowDNError,
        mockSetters.setDNErrorText,
        dialNumberRegex,
        mockSetters.setCurrentLoginOptions,
        DIALNUMBER,
        loggerMock
      );

      expect(mockSetters.setShowDNError).toHaveBeenCalledWith(true);
    });

    it('should update current login options', () => {
      const event = {target: {value: '1234'}};
      const dialNumberRegex = '';

      handleDNInputChanged(
        event,
        mockSetters.setDialNumberValue,
        mockSetters.setDialNumber,
        mockSetters.setShowDNError,
        mockSetters.setDNErrorText,
        dialNumberRegex,
        mockSetters.setCurrentLoginOptions,
        EXTENSION,
        loggerMock
      );

      expect(mockSetters.setCurrentLoginOptions).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should update current login options with correct callback function', () => {
      const event = {target: {value: '5678'}};
      const dialNumberRegex = '';

      // Mock the setCurrentLoginOptions to capture the callback function
      const mockSetCurrentLoginOptions = jest.fn();

      handleDNInputChanged(
        event,
        mockSetters.setDialNumberValue,
        mockSetters.setDialNumber,
        mockSetters.setShowDNError,
        mockSetters.setDNErrorText,
        dialNumberRegex,
        mockSetCurrentLoginOptions,
        EXTENSION,
        loggerMock
      );

      // Verify the callback function was called
      expect(mockSetCurrentLoginOptions).toHaveBeenCalledWith(expect.any(Function));

      // Test the callback function by calling it with mock previous state
      const callbackFunction = mockSetCurrentLoginOptions.mock.calls[0][0];
      const mockPreviousState = {
        deviceType: 'EXTENSION',
        teamId: 'team123',
        dialNumber: 'oldNumber',
      };

      const result = callbackFunction(mockPreviousState);

      // Verify the callback spreads previous state and updates dialNumber
      expect(result).toEqual({
        deviceType: 'EXTENSION',
        teamId: 'team123',
        dialNumber: '5678',
      });
    });
  });

  describe('handleTeamSelectChanged', () => {
    const mockSetters = {
      setSelectedTeamId: jest.fn(),
      setTeamId: jest.fn(),
      setCurrentLoginOptions: jest.fn(),
      setTeam: jest.fn(),
    };

    beforeEach(() => {
      Object.values(mockSetters).forEach((mock) => mock.mockClear());
      loggerMock.info.mockClear();
    });

    it('should handle team selection change', () => {
      const event = {detail: {value: 'team456'}};

      handleTeamSelectChanged(
        event,
        mockSetters.setSelectedTeamId,
        mockSetters.setTeamId,
        mockSetters.setCurrentLoginOptions,
        mockSetters.setTeam,
        loggerMock
      );

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: StationLogin: team selected: team456', {
        module: 'cc-components#station-login.tsx',
        method: 'teamSelected',
      });
      expect(mockSetters.setTeam).toHaveBeenCalledWith('team456');
      expect(mockSetters.setSelectedTeamId).toHaveBeenCalledWith('team456');
      expect(mockSetters.setTeamId).toHaveBeenCalledWith('team456');
      expect(mockSetters.setCurrentLoginOptions).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should update current login options with correct callback function for team change', () => {
      const event = {detail: {value: 'newTeam789'}};

      // Mock the setCurrentLoginOptions to capture the callback function
      const mockSetCurrentLoginOptions = jest.fn();

      handleTeamSelectChanged(
        event,
        mockSetters.setSelectedTeamId,
        mockSetters.setTeamId,
        mockSetCurrentLoginOptions,
        mockSetters.setTeam,
        loggerMock
      );

      // Verify the callback function was called
      expect(mockSetCurrentLoginOptions).toHaveBeenCalledWith(expect.any(Function));

      // Test the callback function by calling it with mock previous state
      const callbackFunction = mockSetCurrentLoginOptions.mock.calls[0][0];
      const mockPreviousState = {
        deviceType: 'EXTENSION',
        dialNumber: '1234',
        teamId: 'oldTeam',
      };

      const result = callbackFunction(mockPreviousState);

      // Verify the callback spreads previous state and updates teamId
      expect(result).toEqual({
        deviceType: 'EXTENSION',
        dialNumber: '1234',
        teamId: 'newTeam789',
      });
    });
  });

  describe('handleOnCCSignOut', () => {
    it('should close modal if open and call onCCSignOut', () => {
      const mockRef = {
        current: {
          open: true,
          close: jest.fn(),
        } as unknown as HTMLDialogElement,
      };
      const mockOnCCSignOut = jest.fn();

      handleOnCCSignOut(mockRef, mockOnCCSignOut);

      expect(mockRef.current?.close).toHaveBeenCalled();
      expect(mockOnCCSignOut).toHaveBeenCalled();
    });

    it('should call onCCSignOut even if modal is not open', () => {
      const mockRef = {
        current: {
          open: false,
          close: jest.fn(),
        } as unknown as HTMLDialogElement,
      };
      const mockOnCCSignOut = jest.fn();

      handleOnCCSignOut(mockRef, mockOnCCSignOut);

      expect(mockOnCCSignOut).toHaveBeenCalled();
    });

    it('should handle null ref gracefully', () => {
      const nullRef = {current: null};
      const mockOnCCSignOut = jest.fn();

      expect(() => {
        handleOnCCSignOut(nullRef, mockOnCCSignOut);
      }).not.toThrow();

      expect(mockOnCCSignOut).toHaveBeenCalled();
    });
  });

  describe('createStationLoginRefs', () => {
    it('should return an object with refs for modals and dialogs', () => {
      const useRefMock = jest.spyOn(React, 'useRef').mockReturnValue({
        current: document.createElement('dialog'),
      } as React.RefObject<HTMLDialogElement>);

      const refs = createStationLoginRefs();

      expect(useRefMock).toHaveBeenCalledTimes(3);
      expect(refs).toHaveProperty('multiSignInModalRef');
      expect(refs).toHaveProperty('ccSignOutModalRef');
      expect(refs).toHaveProperty('saveConfirmDialogRef');
      expect(refs.multiSignInModalRef.current).toBeInstanceOf(HTMLDialogElement);
      expect(refs.ccSignOutModalRef.current).toBeInstanceOf(HTMLDialogElement);
      expect(refs.saveConfirmDialogRef.current).toBeInstanceOf(HTMLDialogElement);
    });
  });
});
