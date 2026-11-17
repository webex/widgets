import React, {useEffect, useRef, useState} from 'react';
import {Icon, Text} from '@momentum-design/components/dist/react';
import {withMetrics} from '@webex/cc-ui-logging';
import {formatTime} from '../../utils';
import ChannelAvatar from './channel-avatar';
import ChannelStatePreview from './channel-state-preview';
import GranularStateMenu from './granular-state-menu';
import ManageChannelAvailability from './manage-channel-availability';
import {GranularAgentStateComponentProps} from './granular-agent-state.types';
import {getPresenceType} from './granular-agent-state.utils';
import {granularAgentStateLabels} from './constant';
import './granular-agent-state.scss';

type PanelView = 'menu' | 'manage';
type ApplyError = string | null;

const GranularAgentStateComponent: React.FunctionComponent<GranularAgentStateComponentProps> = (props) => {
  const {
    idleCodes,
    channels,
    primaryChannel,
    setAllAvailable,
    setAllIdle,
    applyChannelAvailability,
    isSettingAgentState,
    logger,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [view, setView] = useState<PanelView>('menu');
  const [applyError, setApplyError] = useState<ApplyError>(null);

  const isMultiChannel = channels.length > 1;
  const secondaryChannels = channels.filter((channel) => channel.channelType !== primaryChannel?.channelType);

  const close = () => {
    setIsOpen(false);
    setView('menu');
    setApplyError(null);
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !event.composedPath().includes(containerRef.current)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Guards only against synchronous throws in the callback wiring;
  // async errors from the SDK are handled inside the hook's requestStateChange.
  const runAndClose = (action: () => void, method: string) => {
    try {
      action();
    } catch (error) {
      logger?.error(`CC-Widgets: GranularAgentState: Error in ${method} - ${error instanceof Error ? error.message : String(error)}`, {
        module: 'cc-components#granular-agent-state.tsx',
        method,
      });
    }
    close();
  };

  if (!primaryChannel) return null;

  return (
    <div
      ref={containerRef}
      className="granular-agent-state-container"
      data-testid="granular-agent-state-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        className={`granular-state-pill ${getPresenceType(primaryChannel.agentState, primaryChannel.pendingIdle)} ${isOpen ? 'open' : ''}`}
        aria-label={granularAgentStateLabels.stateSelector}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        data-testid="granular-state-pill"
      >
        <ChannelAvatar channel={primaryChannel} size={24} />
        <Text tagname="span" type="body-large-regular" className="granular-state-pill-label">
          {primaryChannel.displayState} -{' '}
          <span className="granular-state-pill-time" data-testid="granular-state-pill-time">
            {formatTime(primaryChannel.elapsedTime)}
          </span>
        </Text>
        {secondaryChannels.length > 0 && (
          <span className="granular-state-pill-channels" data-testid="granular-state-pill-channels">
            <span className="granular-state-pill-separator" />
            {secondaryChannels.map((channel) => (
              <ChannelAvatar key={channel.channelType} channel={channel} size={24} />
            ))}
          </span>
        )}
        <Icon name={isOpen ? 'arrow-up-bold' : 'arrow-down-bold'} className="granular-state-pill-chevron" />
      </button>

      {isHovered && !isOpen && <ChannelStatePreview channels={channels} />}

      {isOpen && (
        <div className="granular-state-panel" role="dialog" aria-label={granularAgentStateLabels.stateSelector} data-testid="granular-state-panel">
          {view === 'menu' ? (
            <GranularStateMenu
              idleCodes={idleCodes}
              isMultiChannel={isMultiChannel}
              isSettingAgentState={isSettingAgentState}
              onSetAllAvailable={() => runAndClose(setAllAvailable, 'setAllAvailable')}
              onSetAllIdle={(idleCode) => runAndClose(() => setAllIdle(idleCode), 'setAllIdle')}
              onManageChannels={() => setView('manage')}
            />
          ) : (
            <ManageChannelAvailability
              channels={channels}
              isSettingAgentState={isSettingAgentState}
              applyError={applyError}
              onApply={(availability) => {
                setApplyError(null);
                applyChannelAvailability(availability)
                  .then((applied) => {
                    if (applied) {
                      close();
                    } else {
                      setApplyError(granularAgentStateLabels.applyFailed);
                    }
                  })
                  .catch((error) => {
                    setApplyError(granularAgentStateLabels.applyFailed);
                    logger?.error(
                      `CC-Widgets: GranularAgentState: Error in applyChannelAvailability - ${error instanceof Error ? error.message : String(error)}`,
                      {
                        module: 'cc-components#granular-agent-state.tsx',
                        method: 'applyChannelAvailability',
                      }
                    );
                  });
              }}
              onCancel={() => { setApplyError(null); setView('menu'); }}
            />
          )}
        </div>
      )}
    </div>
  );
};

const GranularAgentStateComponentWithMetrics = withMetrics(GranularAgentStateComponent, 'GranularAgentState');
export default GranularAgentStateComponentWithMetrics;
