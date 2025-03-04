import React from 'react';

import {IUserState} from './user-state.types';
import {formatTime} from '../../utils';

import './user-state.scss';
import {SelectNext, Text} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';
import {Icon} from '@momentum-design/components/dist/react';

const UserStateComponent: React.FunctionComponent<IUserState> = (props) => {
  const {
    idleCodes,
    setAgentStatus,
    isSettingAgentStatus,
    elapsedTime,
    lastIdleStateChangeElapsedTime,
    currentState,
    customState,
  } = props;

  let selectedKey;
  if (customState) {
    selectedKey = `hide-${customState.developerName}`;
  } else {
    selectedKey = currentState;
  }

  const items = customState
    ? [{name: customState.name, id: `hide-${customState.developerName}`, developerName: customState.developerName}]
    : [];

  for (const item of idleCodes) {
    if (item.name === 'RONA' && item.id === currentState) {
      selectedKey = `hide-${item.id}`;
    }
    if (item.name === 'RONA' && item.id !== currentState) {
      continue; // Skip RONA unless it matches the current state
    }
    items.push({
      ...item,
      id: item.name === 'RONA' ? `hide-${item.id}` : item.id,
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
      if (item.id === currentState && item.name === 'RONA') {
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
        return {class: '', iconName: 'active-presence-small-filled'};
      case item.name === 'RONA' && item.id:
        return {class: 'rona', iconName: 'dnd-presence-filled'};
      default:
        return {class: 'idle', iconName: 'recents-presence-filled'};
    }
  };

  return (
    <div className="user-state-container">
      <SelectNext
        label=""
        aria-label="user-state"
        direction="bottom"
        onSelectionChange={(key: string) => {
          const cleanKey = key.startsWith('hide-') ? key.substring(5) : key;
          setAgentStatus(cleanKey);
        }}
        showBorder
        selectedKey={selectedKey}
        items={items}
        className={`state-select ${getDropdownClass()}`}
      >
        {(item) => {
          return (
            <Item key={item.id} textValue={item.name} data-key={item.id}>
              <div className="item-container">
                <Icon
                  name={getIconStyle(item).iconName}
                  title=""
                  className={`state-icon ${getIconStyle(item).class}`}
                />
                <Text className="state-name" tagName={'small'}>
                  {item.name}
                </Text>
              </div>
            </Item>
          );
        }}
      </SelectNext>

      <span className={`elapsedTime ${isSettingAgentStatus ? 'elapsedTime-disabled' : ''}`}>
        {lastIdleStateChangeElapsedTime >= 0 ? formatTime(lastIdleStateChangeElapsedTime) + ' / ' : ''}
        {formatTime(elapsedTime)}
      </span>
      <Icon className="select-arrow-icon" name="arrow-down-bold" title="" />
    </div>
  );
};

export default UserStateComponent;
