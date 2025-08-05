import {ICustomState, IdleCode} from '@webex/cc-store';
import {AgentUserState} from './user-state.types';
import {userStateLabels} from './constant';

/**
 * Gets the CSS class for the dropdown based on current state
 */
export const getDropdownClass = (customState: ICustomState, currentState: string, idleCodes: IdleCode[]): string => {
  if (customState) {
    return 'custom'; // Custom state class
  }
  if (currentState === '0') {
    return '';
  }
  for (const item of idleCodes) {
    if (item.id === currentState && item.name === AgentUserState.RONA) {
      return 'rona';
    }
  }
  return 'idle';
};

/**
 * Gets the icon style configuration for a given item
 */
export const getIconStyle = (item: {
  id: string;
  name: string;
  developerName?: string;
}): {class: string; iconName: string} => {
  if (item.developerName) {
    return {class: 'custom', iconName: 'busy-presence-light'};
  }

  switch (item.name) {
    case AgentUserState.Available:
      return {class: 'available', iconName: 'active-presence-small-filled'};
    case AgentUserState.RONA:
      return {class: 'rona', iconName: 'dnd-presence-filled'};
    default:
      return {class: 'idle', iconName: 'recents-presence-filled'};
  }
};

/**
 * Gets the tooltip text based on current state
 */
export const getTooltipText = (customState: ICustomState, currentState: string, idleCodes: IdleCode[]): string => {
  if (customState) {
    const currentIdleCode = idleCodes.find((code) => code.id === currentState);
    if (currentIdleCode?.name === AgentUserState.Available) {
      return userStateLabels.customWithAvailableTooltip;
    }
    return userStateLabels.customWithIdleStateTooltip.replace('{{currentState}}', currentIdleCode?.name || '');
  }
  return userStateLabels.availableTooltip;
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
  // Remove 'hide-' prefix if present (for RONA states)
  const cleanKey = key.startsWith('hide-') ? key.substring(5) : key;

  if (cleanKey !== currentState) {
    logger?.info(`CC-Widgets: UserState: state changed to: ${cleanKey}`, {
      module: 'cc-components#user-state.tsx',
      method: 'handleSelectionChange',
    });
    setAgentStatus(cleanKey);
  }
};

/**
 * Sorts dropdown items with Available first, then others
 */
export const sortDropdownItems = (items: Array<{id: string; name: string}>): Array<{id: string; name: string}> => {
  // Keep Available at the top, sort the rest alphabetically
  return [
    ...items.filter((item) => item.name === AgentUserState.Available),
    ...items.filter((item) => item.name !== AgentUserState.Available).sort((a, b) => a.name.localeCompare(b.name)),
  ];
};

/**
 * Gets the previous selectable state (first non-RONA/Engaged state)
 */
export const getPreviousSelectableState = (idleCodes: IdleCode[]): string => {
  const selectableState = idleCodes.find(
    (code) => ![AgentUserState.RONA, AgentUserState.Engaged].includes(code.name as AgentUserState)
  );
  return selectableState?.id || '0';
};

/**
 * Gets the selected key for the dropdown
 */
export const getSelectedKey = (customState: ICustomState, currentState: string, idleCodes: IdleCode[]): string => {
  if (customState && 'developerName' in customState) {
    return `hide-${customState.developerName}`;
  }

  // Check if current state is RONA
  const currentIdleCode = idleCodes.find((code) => code.id === currentState);
  if (currentIdleCode?.name === AgentUserState.RONA) {
    return `hide-${currentState}`;
  }

  // Check if current state is Engaged
  const isEngaged = currentIdleCode?.name === AgentUserState.Engaged;
  if (isEngaged) {
    return getPreviousSelectableState(idleCodes);
  }

  return currentState;
};

/**
 * Builds the dropdown items including custom state and conditional RONA
 */
export const buildDropdownItems = (
  customState: ICustomState,
  idleCodes: IdleCode[],
  currentState: string
): Array<{id: string; name: string; developerName?: string}> => {
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
    if (code.name === AgentUserState.RONA) {
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
};
