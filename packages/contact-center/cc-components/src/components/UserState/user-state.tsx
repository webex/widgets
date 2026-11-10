import React, {useMemo} from 'react';

import {AgentUserState, UserStateComponentsProps} from './user-state.types';
import {formatTime} from '../../utils';
import {ERROR_TRIGGERING_IDLE_CODES} from '@webex/cc-store';
import './user-state.scss';
import {SelectNext, Text} from '@momentum-ui/react-collaboration';
import {Button, Dialog} from '@momentum-design/components/dist/react';
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
import {withMetrics} from '@webex/cc-ui-logging';
import {VOICE_CONNECTION_STATUS, VoiceLineStatus} from '@webex/cc-store';

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
    voiceConnectionState,
    stateChangeError,
    voiceConnectionLossDialogOpen,
    onVoiceReconnect,
    onVoiceConnectionLossDialogClose,
    voiceReconnectError,
  } = props;
  const isVoiceUnavailable = voiceConnectionState?.status === VOICE_CONNECTION_STATUS.UNAVAILABLE;
  const isConnecting = voiceConnectionState?.lineStatus === VoiceLineStatus.CONNECTING;
  const isReconnecting = voiceConnectionState?.lineStatus === VoiceLineStatus.RECONNECTING;
  const voiceWarning = isVoiceUnavailable
    ? isConnecting
      ? 'Browser calling is connecting. Agent state changes are disabled until voice is ready.'
      : isReconnecting
        ? 'Browser calling is reconnecting. Agent state changes are disabled until voice is ready.'
        : 'Browser calling is unavailable. Agent state changes are disabled.'
    : undefined;

  const previousSelectableState = useMemo(() => getPreviousSelectableState(idleCodes, logger), [idleCodes, logger]);
  const selectedKey = getSelectedKey(customState, currentState, idleCodes, logger);
  const items = buildDropdownItems(customState, idleCodes, currentState, logger);
  const sortedItems = sortDropdownItems(items, logger);

  return (
    <div className="user-state-container" data-testid="user-state-container">
      <div className="user-state-select-wrapper">
        <SelectNext
          id="user-state-tooltip"
          label=""
          aria-label="user-state"
          isDisabled={isVoiceUnavailable}
          direction="bottom"
          onSelectionChange={(key: string) => handleSelectionChange(key, currentState, setAgentStatus, logger)}
          showBorder
          selectedKey={selectedKey}
          items={sortedItems}
          className={`state-select ${getDropdownClass(customState, currentState, idleCodes, logger)}`}
          data-testid="state-select"
        >
          {(item) => {
            const isRonaOrEngaged = [...Object.values(ERROR_TRIGGERING_IDLE_CODES), AgentUserState.Engaged].includes(
              idleCodes.find((code) => code.id === currentState)?.name || ''
            );
            const shouldHighlight =
              currentState === item.id || (isRonaOrEngaged && item.id === previousSelectableState);

            return (
              <Item key={item.id} textValue={item.name} data-testid={`state-item-${item.name}`}>
                <div
                  className="item-container"
                  data-testid={`item-container ${shouldHighlight ? `selected ${getIconStyle(item, logger).class}` : ''}`}
                >
                  <Icon
                    name={getIconStyle(item, logger).iconName}
                    title=""
                    className={`state-icon ${getIconStyle(item, logger).class}`}
                    data-testid="state-icon"
                  />
                  <Text
                    className={`state-name ${getIconStyle(item, logger).class}`}
                    tagName={'small'}
                    data-testid="state-name"
                  >
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
            {getTooltipText(customState, currentState, idleCodes, logger)}
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

      {voiceWarning && (
        <div role="alert" aria-live="assertive" className="voice-connection-warning">
          <Text tagName="small">{voiceWarning}</Text>
        </div>
      )}
      {stateChangeError && (
        <div role="alert" aria-live="assertive" className="state-change-error">
          <Text tagName="small">{stateChangeError}</Text>
        </div>
      )}

      {voiceConnectionLossDialogOpen && (
        <Dialog
          visible
          size="small"
          headerText="Desktop connection lost"
          descriptionText="You're no longer connected to Desktop, and your availability state has changed to Idle. Check your internet connection, then try reconnecting."
          closeButtonAriaLabel="Close browser calling recovery dialog"
          onClose={onVoiceConnectionLossDialogClose}
          data-testid="voice-connection-loss-dialog"
        >
          <div slot="dialog-body">
            {voiceReconnectError && (
              <div role="alert" aria-live="assertive" className="voice-reconnect-error">
                <Text tagName="p">{voiceReconnectError}</Text>
              </div>
            )}
            {!onVoiceReconnect && <Text tagName="p">Reconnect is managed by the host application.</Text>}
          </div>
          <Button
            slot="footer-button-primary"
            type="button"
            disabled={!onVoiceReconnect}
            onClick={() => void onVoiceReconnect?.()}
            data-testid="voice-connection-reconnect"
          >
            Reconnect
          </Button>
        </Dialog>
      )}
    </div>
  );
};

const UserStateComponentWithMetrics = withMetrics(UserStateComponent, 'UserState');
export default UserStateComponentWithMetrics;
