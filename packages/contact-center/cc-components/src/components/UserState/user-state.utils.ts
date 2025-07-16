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
export const getIconStyle = (item): {class: string; iconName: string} => {
  if (item.developerName) {
    return {class: 'custom', iconName: 'busy-presence-light'};
  }
  switch (item.id) {
    case '0':
      return {class: 'available', iconName: 'active-presence-small-filled'};
    case item.name === AgentUserState.RONA && item.id:
      return {class: 'rona', iconName: 'dnd-presence-filled'};
    default:
      return {class: 'idle', iconName: 'recents-presence-filled'};
  }
};

/**
 * Gets the tooltip text based on current state
 */
export const getTooltipText = (customState: ICustomState, currentState: string, idleCodes: IdleCode[]): string => {
  if (customState && customState.developerName === 'ENGAGED') {
    const currentStateObj = idleCodes.find((item) => item.id === currentState);

    if (currentStateObj.name === AgentUserState.Available) {
      return userStateLabels.customWithAvailableTooltip;
    } else {
      return userStateLabels.customWithIdleStateTooltip.replace(/{{.*?}}/g, currentStateObj.name);
    }
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
  const cleanKey = key.startsWith('hide-') ? key.substring(5) : key;
  if (logger) {
    logger.info(`CC-Widgets: UserState: selection changed from ${currentState} to ${cleanKey}`, {
      module: 'user-state.tsx',
      method: 'handleSelectionChange',
    });
  }
  if (cleanKey !== currentState) {
    setAgentStatus(cleanKey);
  }
};

/**
 * Sorts dropdown items with Available first, then others
 */
export const sortDropdownItems = (items: Array<{id: string; name: string}>): Array<{id: string; name: string}> => {
  return [
    ...items.filter((item) => item.name === AgentUserState.Available),
    ...items.filter((item) => item.name !== AgentUserState.Available).sort((a, b) => a.name.localeCompare(b.name)),
  ];
};

/**
 * Gets the previous selectable state (first non-RONA/Engaged state)
 */
export const getPreviousSelectableState = (idleCodes: IdleCode[]): string => {
  return idleCodes.find((code) => code.id !== AgentUserState.RONA && code.id !== AgentUserState.Engaged)?.id ?? '0';
};

/**
 * Gets the selected key for the dropdown
 */
export const getSelectedKey = (customState: ICustomState, currentState: string, idleCodes: IdleCode[]): string => {
  let selectedKey;
  if (customState) {
    selectedKey = `hide-${customState.developerName}`;
  } else {
    selectedKey = currentState;
  }

  for (const item of idleCodes) {
    if (item.name === AgentUserState.RONA && item.id === currentState) {
      selectedKey = `hide-${item.id}`;
    }
    if (item.name === AgentUserState.RONA && item.id !== currentState) {
      continue; // Skip RONA unless it matches the current state
    }
  }

  return selectedKey;
};

/**
 * Builds the dropdown items including custom state if present
 */
export const buildDropdownItems = (
  customState: ICustomState,
  idleCodes: IdleCode[]
): Array<{id: string; name: string}> => {
  const items = customState
    ? [{name: customState.name, id: `hide-${customState.developerName}`, developerName: customState.developerName}]
    : [];

  for (const item of idleCodes) {
    if (item.name === AgentUserState.RONA || item.name === AgentUserState.Engaged) {
      continue; // Skip RONA and ENGAGED states
    }
    items.push({
      ...item,
      id: item.name === AgentUserState.RONA ? `hide-${item.id}` : item.id,
    });
  }

  return items;
};
