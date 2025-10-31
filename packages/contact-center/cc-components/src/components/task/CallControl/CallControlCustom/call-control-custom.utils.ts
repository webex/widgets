import {BuddyDetails, ContactServiceQueue, ILogger} from '@webex/cc-store';
import {MUTE_CALL, UNMUTE_CALL} from '../../constants';

/**
 * Interface for button configuration
 */
export interface ButtonConfig {
  key: string;
  icon: string;
  onClick: () => void;
  tooltip: string;
  className: string;
  disabled?: boolean;
  shouldShow: boolean;
}

/**
 * Interface for list item data
 */
export interface ListItemData {
  id: string;
  name: string;
}

/**
 * Creates the consult button configuration array
 */
export const createConsultButtons = (
  isMuted: boolean,
  isMuteDisabled: boolean,
  consultCompleted: boolean,
  isAgentBeingConsulted: boolean,
  isEndConsultEnabled: boolean,
  muteUnmute: boolean,
  onTransfer?: () => void,
  handleConsultMuteToggle?: () => void,
  handleEndConsult?: () => void,
  logger?
): ButtonConfig[] => {
  try {
    return [
      {
        key: 'mute',
        icon: isMuted ? 'microphone-muted-bold' : 'microphone-bold',
        onClick: handleConsultMuteToggle || (() => {}),
        tooltip: isMuted ? UNMUTE_CALL : MUTE_CALL,
        className: `${isMuted ? 'call-control-button-muted' : 'call-control-button'}`,
        disabled: isMuteDisabled,
        shouldShow: muteUnmute,
      },
      {
        key: 'transfer',
        icon: 'next-bold',
        tooltip: 'Transfer Consult',
        onClick: onTransfer || (() => {}),
        className: 'call-control-button',
        disabled: !consultCompleted,
        shouldShow: isAgentBeingConsulted && !!onTransfer,
      },
      {
        key: 'cancel',
        icon: 'headset-muted-bold',
        tooltip: 'End Consult',
        onClick: handleEndConsult || (() => {}),
        className: 'call-control-consult-button-cancel',
        shouldShow: isEndConsultEnabled || isAgentBeingConsulted,
      },
    ];
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in createConsultButtons', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'createConsultButtons',
      error: error.message,
    });
    // Return empty safe fallback
    return [];
  }
};

/**
 * Filters buttons that should be visible
 */
export const getVisibleButtons = (buttons: ButtonConfig[], logger?): ButtonConfig[] => {
  try {
    return buttons.filter((button) => button.shouldShow);
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in getVisibleButtons', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'getVisibleButtons',
      error: error.message,
    });
    // Return empty safe fallback
    return [];
  }
};

/**
 * Creates initials from a name string
 */
export const createInitials = (name: string, logger?): string => {
  try {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in createInitials', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'createInitials',
      error: error.message,
    });
    // Return safe default
    return '??';
  }
};

/**
 * Handles transfer button press with logging
 */
export const handleTransferPress = (onTransfer: (() => void) | undefined, logger: ILogger): void => {
  logger.info('CC-Widgets: CallControlConsult: transfer button clicked', {
    module: 'call-control-consult.tsx',
    method: 'handleTransfer',
  });

  try {
    if (onTransfer) {
      onTransfer();
      logger.log('CC-Widgets: CallControlConsult: transfer completed', {
        module: 'call-control-consult.tsx',
        method: 'handleTransfer',
      });
    }
  } catch (error) {
    throw new Error(`Error transferring call: ${error}`);
  }
};

/**
 * Handles end consult button press with logging
 */
export const handleEndConsultPress = (endConsultCall: (() => void) | undefined, logger: ILogger): void => {
  logger.info('CC-Widgets: CallControlConsult: end consult clicked', {
    module: 'call-control-consult.tsx',
    method: 'handleEndConsult',
  });

  try {
    if (endConsultCall) {
      endConsultCall();
      logger.log('CC-Widgets: CallControlConsult: end consult completed', {
        module: 'call-control-consult.tsx',
        method: 'handleEndConsult',
      });
    }
  } catch (error) {
    throw new Error(`Error ending consult call: ${error}`);
  }
};

/**
 * Handles mute toggle with disabled state management
 */
export const handleMuteToggle = (
  onToggleConsultMute: (() => void) | undefined,
  setIsMuteDisabled: (disabled: boolean) => void,
  logger: ILogger
): void => {
  setIsMuteDisabled(true);

  try {
    if (onToggleConsultMute) {
      onToggleConsultMute();
    }
  } catch (error) {
    logger.error(`Mute toggle failed: ${error}`, {
      module: 'call-control-consult.tsx',
      method: 'handleConsultMuteToggle',
    });
  } finally {
    // Re-enable button after operation
    setTimeout(() => {
      setIsMuteDisabled(false);
    }, 500);
  }
};

/**
 * Gets the consult status text based on completion state
 */
export const getConsultStatusText = (consultCompleted: boolean, logger?): string => {
  try {
    return consultCompleted ? 'Consulting' : 'Consult requested';
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in getConsultStatusText', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'getConsultStatusText',
      error: error.message,
    });
    // Return safe default
    return 'Consulting';
  }
};

/**
 * Handles list item button press with logging
 */
export const handleListItemPress = (title: string, onButtonPress: () => void, logger: ILogger): void => {
  logger.info(`CC-Widgets: ConsultTransferListComponent: button pressed: ${title}`, {
    module: 'consult-transfer-list-item.tsx',
    method: 'handleButtonPress',
  });
  onButtonPress();
};

/**
 * Determines if tabs should be shown based on available data
 */
export const shouldShowTabs = (buddyAgents: BuddyDetails[], queues: ContactServiceQueue[], logger?): boolean => {
  try {
    const noAgents = !buddyAgents || buddyAgents.length === 0;
    const noQueues = !queues || queues.length === 0;
    return !(noAgents && noQueues);
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in shouldShowTabs', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'shouldShowTabs',
      error: error.message,
    });
    // Return safe default
    return false;
  }
};

/**
 * Checks if agents list is empty
 */
export const isAgentsEmpty = (buddyAgents: BuddyDetails[], logger?): boolean => {
  try {
    return !buddyAgents || buddyAgents.length === 0;
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in isAgentsEmpty', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'isAgentsEmpty',
      error: error.message,
    });
    // Return safe default
    return true;
  }
};

/**
 * Checks if queues list is empty
 */
export const isQueuesEmpty = (queues: ContactServiceQueue[], logger?): boolean => {
  try {
    return !queues || queues.length === 0;
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in isQueuesEmpty', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'isQueuesEmpty',
      error: error.message,
    });
    // Return safe default
    return true;
  }
};

/**
 * Handles tab selection with logging
 */
export const handleTabSelection = (key: string, setSelectedTab: (tab: string) => void, logger: ILogger): void => {
  try {
    setSelectedTab(key);
    logger.log(`CC-Widgets: ConsultTransferPopover: tab selected: ${key}`, {
      module: 'consult-transfer-popover.tsx',
      method: 'onTabSelection',
    });
  } catch (error) {
    logger.error(`CC-Widgets: CallControlCustom: Error in handleTabSelection: ${error.message}`, {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'handleTabSelection',
    });
  }
};

/**
 * Handles agent selection with logging
 */
export const handleAgentSelection = (
  agentId: string,
  agentName: string,
  onAgentSelect: ((agentId: string, agentName: string) => void) | undefined,
  logger: ILogger
): void => {
  try {
    logger.info(`CC-Widgets: ConsultTransferPopover: agent selected: ${agentId}`, {
      module: 'consult-transfer-popover.tsx',
      method: 'onAgentSelect',
    });
    if (onAgentSelect) {
      onAgentSelect(agentId, agentName);
    }
  } catch (error) {
    logger.error(`CC-Widgets: CallControlCustom: Error in handleAgentSelection: ${error.message}`, {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'handleAgentSelection',
    });
  }
};

/**
 * Handles queue selection with logging
 */
export const handleQueueSelection = (
  queueId: string,
  queueName: string,
  onQueueSelect: ((queueId: string, queueName: string) => void) | undefined,
  logger: ILogger
): void => {
  try {
    logger.log(`CC-Widgets: ConsultTransferPopover: queue selected: ${queueId}`, {
      module: 'consult-transfer-popover.tsx',
      method: 'onQueueSelect',
    });
    if (onQueueSelect) {
      onQueueSelect(queueId, queueName);
    }
  } catch (error) {
    logger.error(`CC-Widgets: CallControlCustom: Error in handleQueueSelection: ${error.message}`, {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'handleQueueSelection',
    });
  }
};

/**
 * Gets the appropriate empty state message based on context
 */
export const getEmptyStateMessage = (selectedTab: string, showTabs: boolean, logger?): string => {
  try {
    if (!showTabs) {
      return "We can't find any queue or agent available for now.";
    }

    if (selectedTab === 'Agents') {
      return "We can't find any agent available for now.";
    }

    return "We can't find any queue available for now.";
  } catch (error) {
    logger.error(`CC-Widgets: CallControlCustom: Error in getEmptyStateMessage: ${error.message}`, {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'getEmptyStateMessage',
    });
    // Return safe default
    return "We can't find any queue or agent available for now.";
  }
};

/**
 * Creates list item data from buddy agents
 */
export const createAgentListData = (buddyAgents: BuddyDetails[], logger?): ListItemData[] => {
  try {
    return buddyAgents.map((agent) => ({
      id: agent.agentId,
      name: agent.agentName,
    }));
  } catch (error) {
    logger.error(`CC-Widgets: CallControlCustom: Error in createAgentListData: ${error.message}`, {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'createAgentListData',
    });
    // Return empty safe fallback
    return [];
  }
};

/**
 * Creates list item data from queues
 */
export const createQueueListData = (queues: ContactServiceQueue[], logger?): ListItemData[] => {
  try {
    return queues.map((queue) => ({
      id: queue.id,
      name: queue.name,
    }));
  } catch (error) {
    logger.error(`CC-Widgets: CallControlCustom: Error in createQueueListData: ${error.message}`, {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'createQueueListData',
    });
    // Return empty safe fallback
    return [];
  }
};

/**
 * Creates a timer key based on timestamp
 */
export const createTimerKey = (startTimeStamp: number, logger?): string => {
  try {
    return `timer-${startTimeStamp}`;
  } catch (error) {
    logger.error(`CC-Widgets: CallControlCustom: Error in createTimerKey: ${error.message}`, {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'createTimerKey',
    });
    // Return safe default
    return 'timer-0';
  }
};

/**
 * Handles popover open with logging
 */
export const handlePopoverOpen = (menuType: string, setActiveMenu: (menu: string) => void, logger: ILogger): void => {
  try {
    logger.info(`CC-Widgets: CallControl: opening ${menuType} popover`, {
      module: 'call-control.tsx',
      method: 'handlePopoverOpen',
    });
    setActiveMenu(menuType);
  } catch (error) {
    logger.error(`CC-Widgets: CallControlCustom: Error in handlePopoverOpen: ${error.message}`, {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'handlePopoverOpen',
    });
  }
};

/**
 * Handles popover close with logging
 */
export const handlePopoverClose = (setActiveMenu: (menu: string | null) => void, logger: ILogger): void => {
  try {
    logger.info('CC-Widgets: CallControl: closing popover', {
      module: 'call-control.tsx',
      method: 'handlePopoverClose',
    });
    setActiveMenu(null);
  } catch (error) {
    logger.error(`CC-Widgets: CallControlCustom: Error in handlePopoverClose: ${error.message}`, {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'handlePopoverClose',
    });
  }
};

/**
 * Handles hold toggle with logging
 */
export const handleHoldToggle = (toggleHold: (() => void) | undefined, logger: ILogger): void => {
  try {
    logger.info('CC-Widgets: CallControl: hold toggle clicked', {
      module: 'call-control.tsx',
      method: 'handleHoldToggle',
    });
    if (toggleHold) {
      toggleHold();
    }
  } catch (error) {
    logger.error(`CC-Widgets: CallControlCustom: Error in handleHoldToggle: ${error.message}`, {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'handleHoldToggle',
    });
  }
};

/**
 * Handles wrapup call with logging
 */
export const handleWrapupCall = (onWrapupCall: (() => void) | undefined, logger: ILogger): void => {
  try {
    logger.info('CC-Widgets: CallControl: wrapup call clicked', {
      module: 'call-control.tsx',
      method: 'handleWrapupCall',
    });
    if (onWrapupCall) {
      onWrapupCall();
    }
  } catch (error) {
    logger.error(`CC-Widgets: CallControlCustom: Error in handleWrapupCall: ${error.message}`, {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'handleWrapupCall',
    });
  }
};

/**
 * Validates if a menu type is supported
 */
export const isValidMenuType = (menuType: string, logger?): boolean => {
  try {
    const validMenuTypes = ['Consult', 'Transfer'];
    return validMenuTypes.includes(menuType);
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in isValidMenuType', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'isValidMenuType',
      error: error.message,
    });
    // Return safe default
    return false;
  }
};

/**
 * Gets button style class based on state
 */
export const getButtonStyleClass = (
  isActive: boolean,
  isDisabled: boolean,
  baseClass = 'call-control-button',
  logger?
): string => {
  try {
    if (isDisabled) {
      return `${baseClass}-disabled`;
    }
    if (isActive) {
      return `${baseClass}-active`;
    }
    return baseClass;
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in getButtonStyleClass', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'getButtonStyleClass',
      error: error.message,
    });
    // Return safe default
    return 'call-control-button';
  }
};

/**
 * Formats elapsed time for display
 */
export const formatElapsedTime = (startTime: number, logger?): string => {
  try {
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in formatElapsedTime', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'formatElapsedTime',
      error: error.message,
    });
    // Return safe default
    return '0:00';
  }
};

/**
 * Checks if an agent is available for selection
 */
export const isAgentAvailable = (agent: BuddyDetails, logger?): boolean => {
  try {
    return agent && agent.agentId && agent.agentName && agent.agentName.trim().length > 0;
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in isAgentAvailable', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'isAgentAvailable',
      error: error.message,
    });
    // Return safe default
    return false;
  }
};

/**
 * Checks if a queue is available for selection
 */
export const isQueueAvailable = (queue: ContactServiceQueue, logger?): boolean => {
  try {
    return queue && queue.id && queue.name && queue.name.trim().length > 0;
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in isQueueAvailable', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'isQueueAvailable',
      error: error.message,
    });
    // Return safe default
    return false;
  }
};

/**
 * Filters available agents
 */
export const filterAvailableAgents = (agents: BuddyDetails[], logger?): BuddyDetails[] => {
  try {
    return agents ? agents.filter((agent) => isAgentAvailable(agent, logger)) : [];
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in filterAvailableAgents', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'filterAvailableAgents',
      error: error.message,
    });
    // Return empty safe fallback
    return [];
  }
};

/**
 * Filters buddy agents by a free-text query across name, dn and id.
 */
export const filterAgentsByQuery = (agents: BuddyDetails[], query: string): BuddyDetails[] => {
  const searchTerm = (query ?? '').trim().toLowerCase();
  if (!searchTerm) return agents ?? [];
  return (agents ?? []).filter((agent) =>
    `${agent.agentName ?? ''}|${(agent as {dn?: string}).dn ?? ''}|${agent.agentId ?? ''}`
      .toLowerCase()
      .includes(searchTerm)
  );
};

/**
 * Returns agents to display for current category, applying search only for Agents tab, since other tabs support via the SDK
 */
export const getAgentsForDisplay = (
  selectedCategory: 'Agents' | string,
  agents: BuddyDetails[],
  query: string
): BuddyDetails[] => (selectedCategory === 'Agents' ? filterAgentsByQuery(agents, query) : agents || []);

/**
 * Filters available queues
 */
export const filterAvailableQueues = (queues: ContactServiceQueue[], logger?): ContactServiceQueue[] => {
  try {
    return queues ? queues.filter((queue) => isQueueAvailable(queue, logger)) : [];
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in filterAvailableQueues', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'filterAvailableQueues',
      error: error.message,
    });
    // Return empty safe fallback
    return [];
  }
};

/**
 * Debounces a function call
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  logger?
): ((...args: Parameters<T>) => void) => {
  try {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  } catch (error) {
    logger?.error('CC-Widgets: CallControlCustom: Error in debounce', {
      module: 'cc-components#call-control-custom.utils.ts',
      method: 'debounce',
      error: error.message,
    });
    // Return safe fallback function
    return (...args: Parameters<T>) => {
      func(...args);
    };
  }
};

/**
 * Helpers for Dial Number / Entry Point manual actions
 */
export const shouldAddConsultTransferAction = (
  selectedCategory: string,
  isEntryPointTabVisible: boolean,
  query: string,
  entryPoints: {id: string; name: string}[],
  onDialNumberSelect: ((dialNumber: string) => void) | undefined,
  onEntryPointSelect: ((entryPointId: string, entryPointName: string) => void) | undefined
): {visible: boolean; onClick?: () => void; title?: string} => {
  const DN_REGEX = new RegExp('^[+1][0-9]{3,18}$|^[*#:][+1][0-9*#:]{3,18}$|^[0-9*#:]{3,18}$');

  const isDial = selectedCategory === 'Dial Number';
  const isEntry = selectedCategory === 'Entry Point' && isEntryPointTabVisible;
  const valid = DN_REGEX.test(query || '');

  if (isDial) {
    return valid && onDialNumberSelect
      ? {visible: true, onClick: () => onDialNumberSelect(query), title: query}
      : {visible: false};
  }

  if (isEntry) {
    const match = query ? entryPoints?.find((e) => e.name === query || e.id === query) : null;
    return valid && match && onEntryPointSelect
      ? {visible: true, onClick: () => onEntryPointSelect(match.id, match.name), title: match.name}
      : {visible: false};
  }

  return {visible: false};
};
