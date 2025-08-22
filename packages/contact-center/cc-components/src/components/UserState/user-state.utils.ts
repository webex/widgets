import {ICustomState, IdleCode, ERROR_TRIGGERING_IDLE_CODES} from '@webex/cc-store';
import {AgentUserState} from './user-state.types';
import {userStateLabels} from './constant';

/**
 * Gets the CSS class for the dropdown based on current state
 */
export const getDropdownClass = (
  customState: ICustomState,
  currentState: string,
  idleCodes: IdleCode[],
  logger?
): string => {
  try {
    if (customState) {
      return 'custom'; // Custom state class
    }
    if (currentState === '0') {
      return '';
    }
    for (const item of idleCodes) {
      if (item.id === currentState && item.name === ERROR_TRIGGERING_IDLE_CODES.RONA) {
        return 'rona';
      }
    }
    return 'idle';
  } catch (error) {
    logger?.error('CC-Widgets: UserState: Error in getDropdownClass', {
      module: 'cc-components#user-state.utils.ts',
      method: 'getDropdownClass',
      error: error.message,
    });
    return 'idle'; // Default fallback
  }
};

/**
 * Gets the icon style configuration for a given item
 */
export const getIconStyle = (
  item: {
    id: string;
    name: string;
    developerName?: string;
  },
  logger?
): {class: string; iconName: string} => {
  try {
    if (item.developerName) {
      return {class: 'custom', iconName: 'busy-presence-light'};
    }

    switch (item.name) {
      case AgentUserState.Available:
        return {class: 'available', iconName: 'active-presence-small-filled'};
      case ERROR_TRIGGERING_IDLE_CODES.RONA:
        return {class: 'rona', iconName: 'dnd-presence-filled'};
      case ERROR_TRIGGERING_IDLE_CODES.INVALID_NUMBER:
      case ERROR_TRIGGERING_IDLE_CODES.UNAVAILABLE:
      case ERROR_TRIGGERING_IDLE_CODES.DECLINED:
      case ERROR_TRIGGERING_IDLE_CODES.BUSY:
      case ERROR_TRIGGERING_IDLE_CODES.CHANNEL_FAILURE:
        return {class: 'idle', iconName: 'dnd-presence-filled'};
      default:
        return {class: 'idle', iconName: 'recents-presence-filled'};
    }
  } catch (error) {
    logger?.error('CC-Widgets: UserState: Error in getIconStyle', {
      module: 'cc-components#user-state.utils.ts',
      method: 'getIconStyle',
      error: error.message,
    });
    return {class: 'idle', iconName: 'recents-presence-filled'}; // Default fallback
  }
};

/**
 * Gets the tooltip text based on current state
 */
export const getTooltipText = (
  customState: ICustomState,
  currentState: string,
  idleCodes: IdleCode[],
  logger?
): string => {
  try {
    if (customState) {
      const currentIdleCode = idleCodes.find((code) => code.id === currentState);
      if (currentIdleCode?.name === AgentUserState.Available) {
        return userStateLabels.customWithAvailableTooltip;
      }
      return userStateLabels.customWithIdleStateTooltip.replace('{{currentState}}', currentIdleCode?.name || '');
    }
    return userStateLabels.availableTooltip;
  } catch (error) {
    logger?.error('CC-Widgets: UserState: Error in getTooltipText', {
      module: 'cc-components#user-state.utils.ts',
      method: 'getTooltipText',
      error: error.message,
    });
    return userStateLabels.availableTooltip; // Default fallback
  }
};

/**
 * Handles selection change in the dropdown
 */
export const handleSelectionChange = (
  key: string,
  currentState: string,
  setAgentStatus: (auxCodeId: string) => void,
  logger
): void => {
  try {
    // Remove 'hide-' prefix if present (for RONA states)
    const cleanKey = key.startsWith('hide-') ? key.substring(5) : key;

    if (cleanKey !== currentState) {
      logger?.info(`CC-Widgets: UserState: state changed to: ${cleanKey}`, {
        module: 'cc-components#user-state.tsx',
        method: 'handleSelectionChange',
      });
      setAgentStatus(cleanKey);
    }
  } catch (error) {
    logger?.error('CC-Widgets: UserState: Error in handleSelectionChange', {
      module: 'cc-components#user-state.utils.ts',
      method: 'handleSelectionChange',
      error: error.message,
    });
  }
};

/**
 * Sorts dropdown items with Available first, then others
 */
export const sortDropdownItems = (
  items: Array<{id: string; name: string}>,
  logger?
): Array<{id: string; name: string}> => {
  try {
    // Keep Available at the top, sort the rest alphabetically
    return [
      ...items.filter((item) => item.name === AgentUserState.Available),
      ...items.filter((item) => item.name !== AgentUserState.Available).sort((a, b) => a.name.localeCompare(b.name)),
    ];
  } catch (error) {
    logger?.error('CC-Widgets: UserState: Error in sortDropdownItems', {
      module: 'cc-components#user-state.utils.ts',
      method: 'sortDropdownItems',
      error: error.message,
    });
    return items || []; // Return original array or empty array as fallback
  }
};

/**
 * Gets the previous selectable state (first non-RONA/Engaged state)
 */
export const getPreviousSelectableState = (idleCodes: IdleCode[], logger?): string => {
  try {
    const selectableState = idleCodes.find(
      (code) =>
        ![...Object.values(ERROR_TRIGGERING_IDLE_CODES), AgentUserState.Engaged].includes(code.name as AgentUserState)
    );
    return selectableState?.id || '0';
  } catch (error) {
    logger?.error('CC-Widgets: UserState: Error in getPreviousSelectableState', {
      module: 'cc-components#user-state.utils.ts',
      method: 'getPreviousSelectableState',
      error: error.message,
    });
    return '0'; // Default fallback
  }
};

/**
 * Gets the selected key for the dropdown
 */
export const getSelectedKey = (
  customState: ICustomState,
  currentState: string,
  idleCodes: IdleCode[],
  logger?
): string => {
  try {
    if (customState && 'developerName' in customState) {
      return `hide-${customState.developerName}`;
    }

    // Check if current state exists in idleCodes first
    const currentIdleCode = idleCodes.find((code) => code.id === currentState);

    // If currentIdleCode is not found, return currentState as-is
    if (!currentIdleCode) {
      return currentState;
    }

    // Check if current state is an error-triggering idle code (like RONA)
    if (Object.values(ERROR_TRIGGERING_IDLE_CODES).includes(currentIdleCode.name)) {
      return `hide-${currentState}`;
    }

    // Check if current state is Engaged
    const isEngaged = currentIdleCode.name === AgentUserState.Engaged;
    if (isEngaged) {
      return getPreviousSelectableState(idleCodes, logger);
    }

    return currentState;
  } catch (error) {
    logger?.error('CC-Widgets: UserState: Error in getSelectedKey', {
      module: 'cc-components#user-state.utils.ts',
      method: 'getSelectedKey',
      error: error.message,
    });
    return currentState; // Return original state as fallback
  }
};

/**
 * Builds the dropdown items including custom state and conditional RONA
 */
export const buildDropdownItems = (
  customState: ICustomState,
  idleCodes: IdleCode[],
  currentState: string,
  logger?
): Array<{id: string; name: string; developerName?: string}> => {
  try {
    const items: Array<{id: string; name: string; developerName?: string}> = [];

    // Add custom state if present
    if (customState && 'developerName' in customState) {
      items.push({
        name: customState.name,
        id: `hide-${customState.developerName}`,
        developerName: customState.developerName,
      });
    }

    // Add regular idle codes, but handle RONA specially
    for (const code of idleCodes) {
      // Skip Engaged states entirely
      if (code.name === AgentUserState.Engaged) {
        continue;
      }

      // For RONA: only include if it's the current state
      if (Object.values(ERROR_TRIGGERING_IDLE_CODES).includes(code.name)) {
        if (code.id === currentState) {
          items.push({
            ...code,
            id: `hide-${code.id}`, // Use hide- prefix for RONA
          });
        }
        continue;
      }

      // Add all other states normally
      items.push({
        id: code.id,
        name: code.name,
      });
    }

    return items;
  } catch (error) {
    logger?.error('CC-Widgets: UserState: Error in buildDropdownItems', {
      module: 'cc-components#user-state.utils.ts',
      method: 'buildDropdownItems',
      error: error.message,
    });
    return []; // Return empty array as fallback
  }
};
