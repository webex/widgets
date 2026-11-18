import {useEffect, useRef, useState} from 'react';
import store, {IdleCode} from '@webex/cc-store';
import {
  AVAILABLE_AUX_CODE_ID,
  GranularAgentStateValue,
  SelectableChannelType,
  buildChannelStates,
  getChannelsToChange,
  getLastSetIdleCode,
  getSelectableChannelTypes,
} from '@webex/cc-components';
import {UseGranularAgentStateProps} from './granular-agent-state.types';

const MODULE = 'useGranularAgentState';

// A worker keeps the one-second tick accurate while the tab is in the background.
const TICK_WORKER_SCRIPT = `
  let intervalId;
  self.onmessage = (event) => {
    if (event.data.type === 'start') {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => self.postMessage({type: 'tick', now: Date.now()}), 1000);
    }
    if (event.data.type === 'stop' && intervalId) {
      clearInterval(intervalId);
    }
  };
`;

export const useGranularAgentState = ({
  cc,
  agentId,
  idleCodes,
  channelStatesMap,
  logger,
  onStateChange,
}: UseGranularAgentStateProps) => {
  const [isSettingAgentState, setIsSettingAgentState] = useState(false);
  const [now, setNow] = useState(Date.now());
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    try {
      const blob = new Blob([TICK_WORKER_SCRIPT], {type: 'application/javascript'});
      const blobUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(blobUrl);
      URL.revokeObjectURL(blobUrl);
      workerRef.current.onmessage = (event) => {
        if (event.data.type === 'tick') setNow(event.data.now);
      };
      workerRef.current.postMessage({type: 'start'});
    } catch (error) {
      logger?.error(
        `CC-Widgets: GranularAgentState: Error initializing worker - ${error instanceof Error ? error.message : String(error)}`,
        {
          module: MODULE,
          method: 'useEffect - initial',
        }
      );
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({type: 'stop'});
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const channels = buildChannelStates(channelStatesMap, idleCodes, now);
  const selectableChannelTypes = getSelectableChannelTypes(channelStatesMap);

  const requestStateChange = (
    state: GranularAgentStateValue,
    auxCodeId: string,
    channelTypes: SelectableChannelType[],
    idleCode?: IdleCode
  ): Promise<boolean> => {
    if (channelTypes.length === 0) {
      logger.info(`CC-Widgets: GranularAgentState: channels already ${state}, skipping request`, {
        module: MODULE,
        method: 'requestStateChange',
      });
      return Promise.resolve(true);
    }

    logger.info(`CC-Widgets: GranularAgentState: setting [${channelTypes.join(', ')}] to ${state}`, {
      module: MODULE,
      method: 'requestStateChange',
    });
    setIsSettingAgentState(true);

    return cc
      .setAgentState({
        state,
        auxCodeId,
        agentId,
        lastStateChangeReason: idleCode?.name ?? state,
        channelType: channelTypes,
      })
      .then(() => {
        logger.log(`CC-Widgets: GranularAgentState: state set to ${state}`, {
          module: MODULE,
          method: 'requestStateChange',
        });
        store.refreshAgentStateControl();
        onStateChange?.({state, auxCodeId, channelTypes, idleCode});
        return true;
      })
      .catch((error) => {
        logger.error(`CC-Widgets: GranularAgentState: Error setting agent state - ${error}`, {
          module: MODULE,
          method: 'requestStateChange',
        });
        return false;
      })
      .finally(() => {
        setIsSettingAgentState(false);
      });
  };

  /**
   * Sets all selectable channels to Available.
   * Intentionally fire-and-forget: the panel closes immediately and
   * `requestStateChange` handles errors internally via logging + `isSettingAgentState`.
   */
  const setAllAvailable = () => {
    const channelTypes = getChannelsToChange(
      channelStatesMap,
      selectableChannelTypes,
      'Available',
      AVAILABLE_AUX_CODE_ID
    );
    void requestStateChange('Available', AVAILABLE_AUX_CODE_ID, channelTypes);
  };

  /**
   * Sets all selectable channels to the given Idle code.
   * Intentionally fire-and-forget: see {@link setAllAvailable}.
   */
  const setAllIdle = (idleCode: IdleCode) => {
    const channelTypes = getChannelsToChange(channelStatesMap, selectableChannelTypes, 'Idle', idleCode.id);
    void requestStateChange('Idle', idleCode.id, channelTypes, idleCode);
  };

  const applyChannelAvailability = async (
    availability: Partial<Record<SelectableChannelType, boolean>>
  ): Promise<boolean> => {
    const entries = Object.entries(availability) as [SelectableChannelType, boolean][];
    const toAvailable = entries.filter(([, isAvailable]) => isAvailable).map(([channelType]) => channelType);
    const toIdle = entries.filter(([, isAvailable]) => !isAvailable).map(([channelType]) => channelType);
    const idleCode = toIdle.length > 0 ? getLastSetIdleCode(channelStatesMap, idleCodes) : undefined;

    if (toIdle.length > 0 && !idleCode) {
      logger.error('CC-Widgets: GranularAgentState: no idle code available to switch channels off', {
        module: MODULE,
        method: 'applyChannelAvailability',
      });
      return false;
    }

    const availableOk = await requestStateChange('Available', AVAILABLE_AUX_CODE_ID, toAvailable);
    if (!availableOk) return false;
    if (!idleCode) return true;
    return requestStateChange('Idle', idleCode.id, toIdle, idleCode);
  };

  return {
    idleCodes,
    channels,
    primaryChannel: channels[0],
    setAllAvailable,
    setAllIdle,
    applyChannelAvailability,
    isSettingAgentState,
  };
};
