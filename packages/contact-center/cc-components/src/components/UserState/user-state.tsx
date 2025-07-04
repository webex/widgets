import React, {useMemo} from 'react';

import {AgentUserState, UserStateComponentsProps} from './user-state.types';
import {formatTime} from '../../utils';

import './user-state.scss';
import {SelectNext, Text} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';
import {Icon, Tooltip} from '@momentum-design/components/dist/react';
import {userStateLabels} from './constant';

const UserStateComponent: React.FunctionComponent<UserStateComponentsProps> = (props) => {
  const {
    idleCodes,
    setAgentStatus,
    isSettingAgentStatus,
    elapsedTime,
    lastIdleStateChangeElapsedTime,
    currentState,
    customState,
    logger,
  } = props;

  const previousSelectableState = useMemo(() => {
    return idleCodes.find((code) => code.id !== AgentUserState.RONA && code.id !== AgentUserState.Engaged)?.id ?? '0';
  }, [idleCodes]);

  let selectedKey;
  if (customState && 'developerName' in customState) {
    selectedKey = `hide-${customState.developerName}`;
  } else {
    selectedKey = currentState;
  }

  const items =
    customState && 'developerName' in customState
      ? [{name: customState.name, id: `hide-${customState.developerName}`, developerName: customState.developerName}]
      : [];

  for (const item of idleCodes) {
    if (item.name === AgentUserState.RONA && item.id === currentState) {
      selectedKey = `hide-${item.id}`;
    }
    if (item.name === AgentUserState.RONA && item.id !== currentState) {
      continue; // Skip RONA unless it matches the current state
    }

    //@ts-expect-error:  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
    items.push({
      ...item,
      id: item.name === AgentUserState.RONA ? `hide-${item.id}` : item.id,
    });
  }

  const getDropdownClass = () => {
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

  const getIconStyle = (item) => {
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

  const getTooltipText = () => {
    if (customState && 'developerName' in customState && customState.developerName === 'ENGAGED') {
      const currentStateObj = idleCodes.find((item) => item.id === currentState);

      if (currentStateObj.name === AgentUserState.Available) {
        return userStateLabels.customWithAvailableTooltip;
      } else {
        return userStateLabels.customWithIdleStateTooltip.replace(/{{.*?}}/g, currentStateObj.name);
      }
    }

    return userStateLabels.availableTooltip;
  };

  // Sorts the dropdown items by keeping 'Available' at the top and sorting the rest alphabetically by name
  const sortedItems = [
    ...items.filter((item) => item.name === AgentUserState.Available),
    ...items.filter((item) => item.name !== AgentUserState.Available).sort((a, b) => a.name.localeCompare(b.name)),
  ];

  const handleSelectionChange = (key: string) => {
    const cleanKey = key.startsWith('hide-') ? key.substring(5) : key;
    logger.info(`CC-Widgets: UserState: selection changed from ${currentState} to ${cleanKey}`, {
      module: 'user-state.tsx',
      method: 'handleSelectionChange',
    });
    setAgentStatus(cleanKey);
  };

  return (
    <div className="user-state-container" data-testid="user-state-container">
      <SelectNext
        id="user-state-tooltip"
        label=""
        aria-label="user-state"
        direction="bottom"
        onSelectionChange={handleSelectionChange} // replaced direct call
        showBorder
        selectedKey={selectedKey}
        items={sortedItems}
        className={`state-select ${getDropdownClass()}`}
        data-testid="state-select"
      >
        {(item) => {
          const isRonaOrEngaged = [AgentUserState.RONA, AgentUserState.Engaged].includes(
            //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
            idleCodes.find((code) => code.id === currentState)?.name || ''
          );
          const shouldHighlight = currentState === item.id || (isRonaOrEngaged && item.id === previousSelectableState);

          return (
            <Item key={item.id} textValue={item.name} data-testid={`state-item-${item.name}`}>
              <div
                className="item-container"
                data-testid={`item-container ${shouldHighlight ? `selected ${getIconStyle(item).class}` : ''}`}
              >
                <Icon
                  name={getIconStyle(item).iconName}
                  title=""
                  className={`state-icon ${getIconStyle(item).class}`}
                  data-testid="state-icon"
                />
                <Text className={`state-name ${getIconStyle(item).class}`} tagName={'small'} data-testid="state-name">
                  {item.name}
                </Text>
              </div>
            </Item>
          );
        }}
      </SelectNext>

      <Tooltip placement="bottom" color="contrast" delay="0, 0" className="tooltip" triggerID="user-state-tooltip">
        <Text tagName="small" className="tooltip-text">
          {getTooltipText()}
        </Text>
      </Tooltip>

      {!customState && (
        <span
          className={`elapsedTime ${isSettingAgentStatus ? 'elapsedTime-disabled' : ''}`}
          data-testid="elapsed-time"
        >
          {lastIdleStateChangeElapsedTime >= 0 ? formatTime(lastIdleStateChangeElapsedTime) + ' / ' : ''}
          {formatTime(elapsedTime)}
        </span>
      )}
      <Icon className="select-arrow-icon" name="arrow-down-bold" title="" data-testid="select-arrow-icon" />
    </div>
  );
};

export default UserStateComponent;
