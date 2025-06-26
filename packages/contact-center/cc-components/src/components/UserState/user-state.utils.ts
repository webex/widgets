import {ICustomState, IdleCode} from '@webex/cc-store';
import {AgentUserState} from './user-state.types';
import {userStateLabels} from './constant';

/**
 * Gets the CSS class for the dropdown based on current state
 */
export const getDropdownClass = (customState: ICustomState, currentState: string, idleCodes: IdleCode[]): string => {
  if (customState) {
    return 'custom';
  }

  const currentIdleCode = idleCodes.find((code) => code.id === currentState);
  if (!currentIdleCode) {
    return 'idle';
  }

  switch (currentIdleCode.name) {
    case AgentUserState.Available:
      return 'available';
    case AgentUserState.RONA:
      return 'rona';
    default:
      return 'idle';
  }
};

/**
 * Gets the icon style configuration for a given item
 */
export const getIconStyle = (item: {id: string; name: string}): {class: string; iconName: string} => {
  switch (item.name) {
    case AgentUserState.Available:
      return {class: 'available', iconName: 'recents-presence-filled'};
    case AgentUserState.RONA:
      return {class: 'rona', iconName: 'warning-filled'};
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
  if (key !== currentState) {
    logger?.info(`CC-Widgets: UserState: state changed to: ${key}`, {
      module: 'cc-components#user-state.tsx',
      method: 'handleSelectionChange',
    });
    setAgentStatus(key);
  }
};

/**
 * Sorts dropdown items with Available first, then others
 */
export const sortDropdownItems = (items: Array<{id: string; name: string}>): Array<{id: string; name: string}> => {
  return [...items].sort((a, b) => {
    if (a.name === AgentUserState.Available) return -1;
    if (b.name === AgentUserState.Available) return 1;
    return a.name.localeCompare(b.name);
  });
};

/**
 * Gets the previous selectable state (first non-RONA/Engaged state)
 */
export const getPreviousSelectableState = (idleCodes: IdleCode[]): string => {
  const selectableState = idleCodes.find(
    (code) => ![AgentUserState.RONA, AgentUserState.Engaged].includes(code.name as AgentUserState)
  );
  return selectableState?.id || '';
};

/**
 * Gets the selected key for the dropdown
 */
export const getSelectedKey = (customState: ICustomState, currentState: string, idleCodes: IdleCode[]): string => {
  if (customState) {
    return `custom-${customState.developerName}`;
  }

  const currentIdleCode = idleCodes.find((code) => code.id === currentState);
  const isRonaOrEngaged = [AgentUserState.RONA, AgentUserState.Engaged].includes(
    currentIdleCode?.name as AgentUserState
  );

  if (isRonaOrEngaged) {
    return getPreviousSelectableState(idleCodes);
  }

  return currentState;
};

/**
 * Builds the dropdown items including custom state if present
 */
export const buildDropdownItems = (
  customState: ICustomState,
  idleCodes: IdleCode[]
): Array<{id: string; name: string}> => {
  const items = idleCodes
    .filter((code) => ![AgentUserState.RONA, AgentUserState.Engaged].includes(code.name as AgentUserState))
    .map((code) => ({
      id: code.id,
      name: code.name,
    }));

  if (customState) {
    items.push({
      id: `custom-${customState.developerName}`,
      name: customState.name,
    });
  }

  return items;
};
