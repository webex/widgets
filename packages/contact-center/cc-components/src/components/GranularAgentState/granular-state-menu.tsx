import React, {useMemo, useState} from 'react';
import {Icon, Input, Text} from '@momentum-design/components/dist/react';
import {GranularStateMenuProps} from './granular-agent-state.types';
import {AVAILABLE_ICON, IDLE_CODE_ICON, granularAgentStateLabels} from './constant';
import {filterIdleCodes, getSelectableIdleCodes} from './granular-agent-state.utils';

const GranularStateMenu: React.FunctionComponent<GranularStateMenuProps> = ({
  idleCodes,
  isMultiChannel,
  isSettingAgentState,
  onSetAllAvailable,
  onSetAllIdle,
  onManageChannels,
}) => {
  const [searchText, setSearchText] = useState('');
  const selectableIdleCodes = useMemo(() => getSelectableIdleCodes(idleCodes), [idleCodes]);
  const filteredIdleCodes = filterIdleCodes(selectableIdleCodes, searchText);
  const isSearching = searchText.trim().length > 0;

  const availableItem = (label: string) => (
    <button
      type="button"
      role="menuitem"
      className="granular-state-menu-item available"
      disabled={isSettingAgentState}
      onClick={onSetAllAvailable}
      data-testid="granular-state-set-available"
    >
      <Icon name={AVAILABLE_ICON} className="granular-state-available-icon" />
      <Text tagname="span" type="body-large-regular">
        {label}
      </Text>
    </button>
  );

  return (
    <div className="granular-state-menu" role="menu" data-testid="granular-state-menu">
      <Input
        className="granular-state-search"
        placeholder={granularAgentStateLabels.searchPlaceholder}
        aria-label={granularAgentStateLabels.searchPlaceholder}
        leading-icon="search-bold"
        value={searchText}
        onInput={(event) => setSearchText((event.target as unknown as {value?: string}).value ?? '')}
        data-testid="granular-state-search"
      />

      {!isSearching && isMultiChannel && (
        <div className="granular-state-menu-section">
          {availableItem(granularAgentStateLabels.setAvailableAllChannels)}
          <button
            type="button"
            role="menuitem"
            className="granular-state-menu-item manage"
            disabled={isSettingAgentState}
            onClick={onManageChannels}
            data-testid="granular-state-manage-channels"
          >
            <Text tagname="span" type="body-large-regular">
              {granularAgentStateLabels.manageChannelAvailability}
            </Text>
            <Icon name="arrow-right-bold" className="granular-state-chevron" />
          </button>
          <hr className="granular-state-divider" />
          <Text tagname="p" type="body-large-bold" className="granular-state-idle-title">
            {granularAgentStateLabels.setIdleAllChannels}
          </Text>
          <Text tagname="p" type="body-large-regular" className="granular-state-idle-subtitle">
            {granularAgentStateLabels.selectReason}
          </Text>
        </div>
      )}

      <div className="granular-state-idle-list" data-testid="granular-state-idle-list">
        {!isSearching && !isMultiChannel && availableItem(granularAgentStateLabels.available)}
        {filteredIdleCodes.map((code) => (
          <button
            key={code.id}
            type="button"
            role="menuitem"
            className="granular-state-menu-item idle"
            disabled={isSettingAgentState}
            onClick={() => onSetAllIdle(code)}
            data-testid={`granular-state-idle-code-${code.id}`}
          >
            <Icon name={IDLE_CODE_ICON} className="granular-state-idle-icon" />
            <Text tagname="span" type="body-large-regular">
              {code.name}
            </Text>
          </button>
        ))}
        {isSearching && filteredIdleCodes.length === 0 && (
          <Text tagname="p" type="body-midsize-regular" className="granular-state-no-match">
            {granularAgentStateLabels.noMatchFound}
          </Text>
        )}
      </div>
    </div>
  );
};

export default GranularStateMenu;
