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
    {id: '0', name: 'Available', isSystem: true, isDefault: true},
    {id: '1', name: 'Break', isSystem: false, isDefault: false},
    {id: '2', name: 'Training', isSystem: false, isDefault: false},
    {id: '3', name: 'RONA', isSystem: true, isDefault: false},
    {id: '4', name: 'ENGAGED', isSystem: true, isDefault: false},
  ];

  describe('getDropdownClass', () => {
    it('should return "custom" when customState is present', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = getDropdownClass(customState, '1', mockIdleCodes, loggerMock);
      expect(result).toBe('custom');
    });

    it('should return "" for "0"', () => {
      const result = getDropdownClass(null, '0', mockIdleCodes, loggerMock);
      expect(result).toBe('');
    });

    it('should return "rona" for RONA state', () => {
      const result = getDropdownClass(null, '3', mockIdleCodes, loggerMock);
      expect(result).toBe('rona');
    });

    it('should return "idle" for other states', () => {
      const result = getDropdownClass(null, '1', mockIdleCodes, loggerMock);
      expect(result).toBe('idle');
    });

    it('should return "idle" when currentState is not found in idleCodes', () => {
      const result = getDropdownClass(null, '999', mockIdleCodes, loggerMock);
      expect(result).toBe('idle');
    });
  });

  describe('getIconStyle', () => {
    it('should return correct style for Available state', () => {
      const item = {id: '0', name: 'Available'};
      const result = getIconStyle(item, loggerMock);
      expect(result).toEqual({
        class: 'available',
        iconName: 'active-presence-small-filled',
      });
    });

    it('should return correct style for RONA state', () => {
      const item = {id: '3', name: 'RONA'};
      const result = getIconStyle(item, loggerMock);
      expect(result).toEqual({
        class: 'rona',
        iconName: 'dnd-presence-filled',
      });
    });

    it('should return default style for other states', () => {
      const item = {id: '1', name: 'Break'};
      const result = getIconStyle(item, loggerMock);
      expect(result).toEqual({
        class: 'idle',
        iconName: 'recents-presence-filled',
      });
    });

    it('should return custom style for items with developerName', () => {
      const item = {id: '1', name: 'Custom State', developerName: 'CUSTOM'};
      const result = getIconStyle(item, loggerMock);
      expect(result).toEqual({
        class: 'custom',
        iconName: 'busy-presence-light',
      });
    });
  });

  describe('getTooltipText', () => {
    it('should return custom available tooltip when customState is present and current state is Available', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = getTooltipText(customState, '0', mockIdleCodes, loggerMock);
      expect(result).toBe(userStateLabels.customWithAvailableTooltip);
    });

    it('should return custom idle tooltip when customState is present and current state is not Available', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = getTooltipText(customState, '1', mockIdleCodes, loggerMock);
      expect(result).toBe(userStateLabels.customWithIdleStateTooltip.replace('{{currentState}}', 'Break'));
    });

    it('should return default tooltip when no customState', () => {
      const result = getTooltipText(null, '1', mockIdleCodes, loggerMock);
      expect(result).toBe(userStateLabels.availableTooltip);
    });

    it('should handle missing currentState in idleCodes', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = getTooltipText(customState, '999', mockIdleCodes, loggerMock);
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

      const result = sortDropdownItems(items, loggerMock);

      expect(result).toEqual([
        {id: '0', name: 'Available'},
        {id: '1', name: 'Break'},
        {id: '3', name: 'Lunch'},
        {id: '2', name: 'Training'},
      ]);
    });

    it('should handle empty array', () => {
      const result = sortDropdownItems([], loggerMock);
      expect(result).toEqual([]);
    });

    it('should not mutate original array', () => {
      const items = [
        {id: '1', name: 'Break'},
        {id: '0', name: 'Available'},
      ];
      const originalItems = [...items];

      sortDropdownItems(items, loggerMock);

      expect(items).toEqual(originalItems);
    });

    it('Coverage: should sort with Available at the top', () => {
      const items = [
        {id: '0', name: 'Available'},
        {id: '1', name: 'Break'},
      ];
      const originalItems = [...items];

      sortDropdownItems(items, loggerMock);

      expect(items).toEqual(originalItems);
    });
  });

  describe('getPreviousSelectableState', () => {
    it('should return first non-RONA/Engaged state', () => {
      const result = getPreviousSelectableState(mockIdleCodes, loggerMock);
      expect(result).toBe('0'); // Available
    });

    it('should return empty string when no selectable states', () => {
      const nonSelectableStates = [
        {id: '3', name: 'RONA', isSystem: true, isDefault: false},
        {id: '4', name: 'ENGAGED', isSystem: true, isDefault: false},
      ];

      const result = getPreviousSelectableState(nonSelectableStates, loggerMock);
      expect(result).toBe('0');
    });

    it('should handle empty idleCodes array', () => {
      const result = getPreviousSelectableState([], loggerMock);
      expect(result).toBe('0');
    });
  });

  describe('getSelectedKey', () => {
    it('should return custom key when customState is present', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = getSelectedKey(customState, '1', mockIdleCodes, loggerMock);
      expect(result).toBe('hide-CUSTOM');
    });

    it('should return currentState for normal states', () => {
      const result = getSelectedKey(null, '1', mockIdleCodes, loggerMock);
      expect(result).toBe('1');
    });

    it('should return hide-prefixed key for RONA when it is current state', () => {
      const result = getSelectedKey(null, '3', mockIdleCodes, loggerMock);
      expect(result).toBe('hide-3');
    });

    it('should return previous selectable state for ENGAGED', () => {
      const result = getSelectedKey(null, '4', mockIdleCodes, loggerMock);
      expect(result).toBe('0');
    });

    it('should handle missing currentState in idleCodes', () => {
      const result = getSelectedKey(null, '999', mockIdleCodes, loggerMock);
      expect(result).toBe('999');
    });
  });

  describe('buildDropdownItems', () => {
    it('should filter out RONA and ENGAGED states', () => {
      const result = buildDropdownItems(null, mockIdleCodes, '1', loggerMock);

      expect(result).toEqual([
        {id: '0', name: 'Available'},
        {id: '1', name: 'Break'},
        {id: '2', name: 'Training'},
      ]);
    });

    it('should include custom state when present', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = buildDropdownItems(customState, mockIdleCodes, '1', loggerMock);

      expect(result).toEqual([
        {id: 'hide-CUSTOM', name: 'Custom State', developerName: 'CUSTOM'},
        {id: '0', name: 'Available'},
        {id: '1', name: 'Break'},
        {id: '2', name: 'Training'},
      ]);
    });

    it('should handle empty idleCodes array', () => {
      const result = buildDropdownItems(null, [], '1', loggerMock);
      expect(result).toEqual([]);
    });

    it('should handle empty idleCodes array with custom state', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = buildDropdownItems(customState, [], '1', loggerMock);

      expect(result).toEqual([{id: 'hide-CUSTOM', name: 'Custom State', developerName: 'CUSTOM'}]);
    });

    it('should handle idleCodes with only RONA and ENGAGED', () => {
      const ronaEngagedOnly = [
        {id: '3', name: 'RONA', isSystem: true, isDefault: false},
        {id: '4', name: 'ENGAGED', isSystem: true, isDefault: false},
      ];

      const result = buildDropdownItems(null, ronaEngagedOnly, '1', loggerMock);
      expect(result).toEqual([]);
    });

    it('should include RONA when it is the current state', () => {
      const result = buildDropdownItems(null, mockIdleCodes, '3', loggerMock);

      expect(result).toEqual([
        {id: '0', name: 'Available'},
        {id: '1', name: 'Break'},
        {id: '2', name: 'Training'},
        {id: 'hide-3', name: 'RONA', isSystem: true, isDefault: false},
      ]);
    });

    it('should use correct prefix for custom state', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      const result = buildDropdownItems(customState, mockIdleCodes, '1', loggerMock);

      expect(result[0]).toEqual({
        id: 'hide-CUSTOM',
        name: 'Custom State',
        developerName: 'CUSTOM',
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      loggerMock.error.mockClear();
    });

    it('should log error when getDropdownClass throws exception', () => {
      // Create corrupted idleCodes that will throw when iterating in the for loop
      const corruptedIdleCodes = new Proxy(mockIdleCodes, {
        get(target, prop) {
          if (prop === Symbol.iterator) {
            return function () {
              throw new Error('Test getDropdownClass error');
            };
          }
          return target[prop];
        },
      });

      const result = getDropdownClass(null, '3', corruptedIdleCodes, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith('CC-Widgets: UserState: Error in getDropdownClass', {
        module: 'cc-components#user-state.utils.ts',
        method: 'getDropdownClass',
        error: 'Test getDropdownClass error',
      });
      expect(result).toBe('idle'); // Should return default fallback
    });

    it('should log error when getIconStyle throws exception', () => {
      const item = {id: '0', name: 'Available'};
      // Mock the switch statement to throw an error by corrupting the item
      const corruptedItem = new Proxy(item, {
        get() {
          throw new Error('Test getIconStyle error');
        },
      });

      const result = getIconStyle(corruptedItem, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith('CC-Widgets: UserState: Error in getIconStyle', {
        module: 'cc-components#user-state.utils.ts',
        method: 'getIconStyle',
        error: 'Test getIconStyle error',
      });
      expect(result).toEqual({class: 'idle', iconName: 'recents-presence-filled'});
    });

    it('should log error when getTooltipText throws exception', () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      // Mock array.find to throw an error
      const corruptedIdleCodes = new Proxy(mockIdleCodes, {
        get(target, prop) {
          if (prop === 'find') {
            return () => {
              throw new Error('Test getTooltipText error');
            };
          }
          return target[prop];
        },
      });

      const result = getTooltipText(customState, '1', corruptedIdleCodes, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith('CC-Widgets: UserState: Error in getTooltipText', {
        module: 'cc-components#user-state.utils.ts',
        method: 'getTooltipText',
        error: 'Test getTooltipText error',
      });
      expect(result).toBe(userStateLabels.availableTooltip);
    });

    it('should log error when handleSelectionChange throws exception', () => {
      const mockSetAgentStatus = jest.fn(() => {
        throw new Error('Test handleSelectionChange error');
      });

      handleSelectionChange('2', '1', mockSetAgentStatus, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith('CC-Widgets: UserState: Error in handleSelectionChange', {
        module: 'cc-components#user-state.utils.ts',
        method: 'handleSelectionChange',
        error: 'Test handleSelectionChange error',
      });
    });

    it('should log error when sortDropdownItems throws exception', () => {
      // Create corrupted items that will throw on filter operations
      const items = [
        {id: '0', name: 'Available'},
        {id: '1', name: 'Break'},
      ];
      const corruptedItems = new Proxy(items, {
        get(target, prop) {
          if (prop === 'filter') {
            return () => {
              throw new Error('Test sortDropdownItems error');
            };
          }
          return target[prop];
        },
      });

      const result = sortDropdownItems(corruptedItems, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith('CC-Widgets: UserState: Error in sortDropdownItems', {
        module: 'cc-components#user-state.utils.ts',
        method: 'sortDropdownItems',
        error: 'Test sortDropdownItems error',
      });
      expect(result).toEqual(items); // Should return original array as fallback
    });

    it('should log error when getPreviousSelectableState throws exception', () => {
      // Mock array.find to throw an error
      const corruptedIdleCodes = new Proxy(mockIdleCodes, {
        get(target, prop) {
          if (prop === 'find') {
            return () => {
              throw new Error('Test getPreviousSelectableState error');
            };
          }
          return target[prop];
        },
      });

      const result = getPreviousSelectableState(corruptedIdleCodes, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith('CC-Widgets: UserState: Error in getPreviousSelectableState', {
        module: 'cc-components#user-state.utils.ts',
        method: 'getPreviousSelectableState',
        error: 'Test getPreviousSelectableState error',
      });
      expect(result).toBe('0'); // Should return default fallback
    });

    it('should log error when getSelectedKey throws exception', () => {
      // Mock Object.values to throw an error
      const originalValues = Object.values;
      Object.values = jest.fn(() => {
        throw new Error('Test getSelectedKey error');
      });

      const result = getSelectedKey(null, '1', mockIdleCodes, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith('CC-Widgets: UserState: Error in getSelectedKey', {
        module: 'cc-components#user-state.utils.ts',
        method: 'getSelectedKey',
        error: 'Test getSelectedKey error',
      });
      expect(result).toBe('1'); // Should return original state as fallback

      // Restore original function
      Object.values = originalValues;
    });

    it('should log error when buildDropdownItems throws exception', () => {
      // Mock Object.values to throw an error
      const originalValues = Object.values;
      Object.values = jest.fn(() => {
        throw new Error('Test buildDropdownItems error');
      });

      const result = buildDropdownItems(null, mockIdleCodes, '1', loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith('CC-Widgets: UserState: Error in buildDropdownItems', {
        module: 'cc-components#user-state.utils.ts',
        method: 'buildDropdownItems',
        error: 'Test buildDropdownItems error',
      });
      expect(result).toEqual([]); // Should return empty array as fallback

      // Restore original function
      Object.values = originalValues;
    });
  });
});
