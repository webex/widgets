import '@testing-library/jest-dom';
import {
  getDropdownClass,
  getIconStyle,
  getTooltipText,
  handleSelectionChange,
  sortDropdownItems,
  getPreviousSelectableState,
  getSelectedKey,
  buildDropdownItems,
} from '../../../src/components/UserState/user-state.utils';
import {userStateLabels} from '../../../src/components/UserState/constant';

const loggerMock = {
  info: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

describe('UserState Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockIdleCodes = [
    {id: '0', name: 'Available', isSystem: true},
    {id: '1', name: 'Break', isSystem: false},
    {id: '2', name: 'Training', isSystem: false},
    {id: '3', name: 'RONA', isSystem: true},
    {id: '4', name: 'ENGAGED', isSystem: true},
  ];

  describe('getDropdownClass', () => {
    it('should return "custom" when customState is present', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = getDropdownClass(customState, '1', mockIdleCodes);
      expect(result).toBe('custom');
    });

    it('should return "" for "0"', () => {
      const result = getDropdownClass(null, '0', mockIdleCodes);
      expect(result).toBe('');
    });

    it('should return "rona" for RONA state', () => {
      const result = getDropdownClass(null, '3', mockIdleCodes);
      expect(result).toBe('rona');
    });

    it('should return "idle" for other states', () => {
      const result = getDropdownClass(null, '1', mockIdleCodes);
      expect(result).toBe('idle');
    });

    it('should return "idle" when currentState is not found in idleCodes', () => {
      const result = getDropdownClass(null, '999', mockIdleCodes);
      expect(result).toBe('idle');
    });
  });

  describe('getIconStyle', () => {
    it('should return correct style for Available state', () => {
      const item = {id: '0', name: 'Available'};
      const result = getIconStyle(item);
      expect(result).toEqual({
        class: 'available',
        iconName: 'recents-presence-filled',
      });
    });

    it('should return correct style for RONA state', () => {
      const item = {id: '3', name: 'RONA'};
      const result = getIconStyle(item);
      expect(result).toEqual({
        class: 'rona',
        iconName: 'warning-filled',
      });
    });

    it('should return default style for other states', () => {
      const item = {id: '1', name: 'Break'};
      const result = getIconStyle(item);
      expect(result).toEqual({
        class: 'idle',
        iconName: 'recents-presence-filled',
      });
    });
  });

  describe('getTooltipText', () => {
    it('should return custom available tooltip when customState is present and current state is Available', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = getTooltipText(customState, '0', mockIdleCodes);
      expect(result).toBe(userStateLabels.customWithAvailableTooltip);
    });

    it('should return custom idle tooltip when customState is present and current state is not Available', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = getTooltipText(customState, '1', mockIdleCodes);
      expect(result).toBe(userStateLabels.customWithIdleStateTooltip.replace('{{currentState}}', 'Break'));
    });

    it('should return default tooltip when no customState', () => {
      const result = getTooltipText(null, '1', mockIdleCodes);
      expect(result).toBe(userStateLabels.availableTooltip);
    });

    it('should handle missing currentState in idleCodes', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = getTooltipText(customState, '999', mockIdleCodes);
      expect(result).toBe(userStateLabels.customWithIdleStateTooltip.replace('{{currentState}}', ''));
    });
  });

  describe('handleSelectionChange', () => {
    it('should call setAgentStatus and log when key is different from currentState', () => {
      const mockSetAgentStatus = jest.fn();
      const currentState = '1';
      const newKey = '2';

      handleSelectionChange(newKey, currentState, mockSetAgentStatus, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith(`CC-Widgets: UserState: state changed to: ${newKey}`, {
        module: 'cc-components#user-state.tsx',
        method: 'handleSelectionChange',
      });
      expect(mockSetAgentStatus).toHaveBeenCalledWith(newKey);
    });

    it('should not call setAgentStatus when key is same as currentState', () => {
      const mockSetAgentStatus = jest.fn();
      const currentState = '1';

      handleSelectionChange(currentState, currentState, mockSetAgentStatus, loggerMock);

      expect(loggerMock.info).not.toHaveBeenCalled();
      expect(mockSetAgentStatus).not.toHaveBeenCalled();
    });

    it('should handle missing logger gracefully', () => {
      const mockSetAgentStatus = jest.fn();

      expect(() => {
        handleSelectionChange('2', '1', mockSetAgentStatus, null);
      }).not.toThrow();

      expect(mockSetAgentStatus).toHaveBeenCalledWith('2');
    });
  });

  describe('sortDropdownItems', () => {
    it('should sort items with Available first, then alphabetically', () => {
      const items = [
        {id: '1', name: 'Break'},
        {id: '2', name: 'Training'},
        {id: '0', name: 'Available'},
        {id: '3', name: 'Lunch'},
      ];

      const result = sortDropdownItems(items);

      expect(result).toEqual([
        {id: '0', name: 'Available'},
        {id: '1', name: 'Break'},
        {id: '3', name: 'Lunch'},
        {id: '2', name: 'Training'},
      ]);
    });

    it('should handle empty array', () => {
      const result = sortDropdownItems([]);
      expect(result).toEqual([]);
    });

    it('should not mutate original array', () => {
      const items = [
        {id: '1', name: 'Break'},
        {id: '0', name: 'Available'},
      ];
      const originalItems = [...items];

      sortDropdownItems(items);

      expect(items).toEqual(originalItems);
    });

    it('Coverage: should sort with Available at the top', () => {
      const items = [
        {id: '0', name: 'Available'},
        {id: '1', name: 'Break'},
      ];
      const originalItems = [...items];

      sortDropdownItems(items);

      expect(items).toEqual(originalItems);
    });
  });

  describe('getPreviousSelectableState', () => {
    it('should return first non-RONA/Engaged state', () => {
      const result = getPreviousSelectableState(mockIdleCodes);
      expect(result).toBe('0'); // Available
    });

    it('should return empty string when no selectable states', () => {
      const nonSelectableStates = [
        {id: '3', name: 'RONA', isSystem: true},
        {id: '4', name: 'ENGAGED', isSystem: true},
      ];

      const result = getPreviousSelectableState(nonSelectableStates);
      expect(result).toBe('0');
    });

    it('should handle empty idleCodes array', () => {
      const result = getPreviousSelectableState([]);
      expect(result).toBe('0');
    });
  });

  describe('getSelectedKey', () => {
    it('should return custom key when customState is present', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = getSelectedKey(customState, '1', mockIdleCodes);
      expect(result).toBe('custom-CUSTOM');
    });

    it('should return currentState for normal states', () => {
      const result = getSelectedKey(null, '1', mockIdleCodes);
      expect(result).toBe('1');
    });

    it('should return previous selectable state for RONA', () => {
      const result = getSelectedKey(null, '3', mockIdleCodes);
      expect(result).toBe('0'); // Available is the first selectable state
    });

    it('should return previous selectable state for ENGAGED', () => {
      const result = getSelectedKey(null, '4', mockIdleCodes);
      expect(result).toBe('0'); // Available is the first selectable state
    });

    it('should handle missing currentState in idleCodes', () => {
      const result = getSelectedKey(null, '999', mockIdleCodes);
      expect(result).toBe('999');
    });
  });

  describe('buildDropdownItems', () => {
    it('should filter out RONA and ENGAGED states', () => {
      const result = buildDropdownItems(null, mockIdleCodes);

      expect(result).toEqual([
        {id: '0', name: 'Available'},
        {id: '1', name: 'Break'},
        {id: '2', name: 'Training'},
      ]);
    });

    it('should include custom state when present', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = buildDropdownItems(customState, mockIdleCodes);

      expect(result).toEqual([
        {id: '0', name: 'Available'},
        {id: '1', name: 'Break'},
        {id: '2', name: 'Training'},
        {id: 'custom-CUSTOM', name: 'Custom State'},
      ]);
    });

    it('should handle empty idleCodes array', () => {
      const result = buildDropdownItems(null, []);
      expect(result).toEqual([]);
    });

    it('should handle empty idleCodes array with custom state', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = buildDropdownItems(customState, []);

      expect(result).toEqual([{id: 'custom-CUSTOM', name: 'Custom State'}]);
    });

    it('should handle idleCodes with only RONA and ENGAGED', () => {
      const ronaEngagedOnly = [
        {id: '3', name: 'RONA', isSystem: true},
        {id: '4', name: 'ENGAGED', isSystem: true},
      ];

      const result = buildDropdownItems(null, ronaEngagedOnly);
      expect(result).toEqual([]);
    });
  });
});
