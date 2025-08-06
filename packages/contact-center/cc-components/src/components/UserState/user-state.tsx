import React, {useMemo} from 'react';

import {AgentUserState, UserStateComponentsProps} from './user-state.types';
import {formatTime} from '../../utils';
import {ERROR_TRIGGERING_IDLE_CODES} from '@webex/cc-store';
import './user-state.scss';
import {SelectNext, Text} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';
import {Icon, Tooltip} from '@momentum-design/components/dist/react';
import {
  getDropdownClass,
  getIconStyle,
  getTooltipText,
  handleSelectionChange,
  sortDropdownItems,
  getPreviousSelectableState,
  getSelectedKey,
  buildDropdownItems,
} from './user-state.utils';

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

  const previousSelectableState = useMemo(() => getPreviousSelectableState(idleCodes), [idleCodes]);
  const selectedKey = getSelectedKey(customState, currentState, idleCodes);
  const items = buildDropdownItems(customState, idleCodes, currentState);
  const sortedItems = sortDropdownItems(items);

  return (
    <div className="user-state-container" data-testid="user-state-container">
      <SelectNext
        id="user-state-tooltip"
        label=""
        aria-label="user-state"
        direction="bottom"
        onSelectionChange={(key: string) => handleSelectionChange(key, currentState, setAgentStatus, logger)}
        showBorder
        selectedKey={selectedKey}
        items={sortedItems}
        className={`state-select ${getDropdownClass(customState, currentState, idleCodes)}`}
        data-testid="state-select"
      >
        {(item) => {
          const isRonaOrEngaged = [...Object.values(ERROR_TRIGGERING_IDLE_CODES), AgentUserState.Engaged].includes(
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

      <Tooltip
        data-testid="user-state-tooltip"
        placement="bottom"
        color="contrast"
        delay="0, 0"
        className="tooltip"
        triggerID="user-state-tooltip"
      >
        <Text tagName="small" className="tooltip-text">
          {getTooltipText(customState, currentState, idleCodes)}
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
