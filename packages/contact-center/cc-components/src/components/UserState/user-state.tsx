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
    errorMessage,
    elapsedTime,
    lastIdleStateChangeElapsedTime,
    currentState,
  } = props;

  return (
    <div className="user-state-container">
      <div className="select-trigger">
        <SelectNext
          label=""
          aria-label="user-state"
          direction="bottom"
          onSelectionChange={(key) => {
            const selectedItem = idleCodes?.find((code) => code.id === key);
            if (selectedItem && selectedItem != currentState) setAgentStatus(selectedItem);
          }}
          showBorder
          selectedKey={currentState}
          items={idleCodes.filter((code) => !code.isSystem)}
          className={currentState == '0' ? 'state-select' : 'state-select-idle'}
        >
          {(item) => {
            return (
              <Item key={item.id} textValue={item.name}>
                <div className="item-container">
                  <Icon
                    name={item.id == '0' ? 'active-presence-small-filled' : 'recents-presence-filled'}
                    title=""
                    className={item.id == '0' ? 'state-icon' : 'state-icon state-icon-idle'}
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

      {errorMessage && <div className="error-message">{errorMessage}</div>}
    </div>
  );
};

export default UserStateComponent;
