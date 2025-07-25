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
  handleEndConsult?: () => void
): ButtonConfig[] => {
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
};

/**
 * Filters buttons that should be visible
 */
export const getVisibleButtons = (buttons: ButtonConfig[]): ButtonConfig[] => {
  return buttons.filter((button) => button.shouldShow);
};

/**
 * Creates initials from a name string
 */
export const createInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
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
export const getConsultStatusText = (consultCompleted: boolean): string => {
  return consultCompleted ? 'Consulting' : 'Consult requested';
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
export const shouldShowTabs = (buddyAgents: BuddyDetails[], queues: ContactServiceQueue[]): boolean => {
  const noAgents = !buddyAgents || buddyAgents.length === 0;
  const noQueues = !queues || queues.length === 0;
  return !(noAgents && noQueues);
};

/**
 * Checks if agents list is empty
 */
export const isAgentsEmpty = (buddyAgents: BuddyDetails[]): boolean => {
  return !buddyAgents || buddyAgents.length === 0;
};

/**
 * Checks if queues list is empty
 */
export const isQueuesEmpty = (queues: ContactServiceQueue[]): boolean => {
  return !queues || queues.length === 0;
};

/**
 * Handles tab selection with logging
 */
export const handleTabSelection = (key: string, setSelectedTab: (tab: string) => void, logger: ILogger): void => {
  setSelectedTab(key);
  logger.log(`CC-Widgets: ConsultTransferPopover: tab selected: ${key}`, {
    module: 'consult-transfer-popover.tsx',
    method: 'onTabSelection',
  });
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
  logger.info(`CC-Widgets: ConsultTransferPopover: agent selected: ${agentId}`, {
    module: 'consult-transfer-popover.tsx',
    method: 'onAgentSelect',
  });
  if (onAgentSelect) {
    onAgentSelect(agentId, agentName);
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
  logger.log(`CC-Widgets: ConsultTransferPopover: queue selected: ${queueId}`, {
    module: 'consult-transfer-popover.tsx',
    method: 'onQueueSelect',
  });
  if (onQueueSelect) {
    onQueueSelect(queueId, queueName);
  }
};

/**
 * Gets the appropriate empty state message based on context
 */
export const getEmptyStateMessage = (selectedTab: string, showTabs: boolean): string => {
  if (!showTabs) {
    return "We can't find any queue or agent available for now.";
  }

  if (selectedTab === 'Agents') {
    return "We can't find any agent available for now.";
  }

  return "We can't find any queue available for now.";
};

/**
 * Creates list item data from buddy agents
 */
export const createAgentListData = (buddyAgents: BuddyDetails[]): ListItemData[] => {
  return buddyAgents.map((agent) => ({
    id: agent.agentId,
    name: agent.agentName,
  }));
};

/**
 * Creates list item data from queues
 */
export const createQueueListData = (queues: ContactServiceQueue[]): ListItemData[] => {
  return queues.map((queue) => ({
    id: queue.id,
    name: queue.name,
  }));
};

/**
 * Creates a timer key based on timestamp
 */
export const createTimerKey = (startTimeStamp: number): string => {
  return `timer-${startTimeStamp}`;
};

/**
 * Handles popover open with logging
 */
export const handlePopoverOpen = (menuType: string, setActiveMenu: (menu: string) => void, logger: ILogger): void => {
  logger.info(`CC-Widgets: CallControl: opening ${menuType} popover`, {
    module: 'call-control.tsx',
    method: 'handlePopoverOpen',
  });
  setActiveMenu(menuType);
};

/**
 * Handles popover close with logging
 */
export const handlePopoverClose = (setActiveMenu: (menu: string | null) => void, logger: ILogger): void => {
  logger.info('CC-Widgets: CallControl: closing popover', {
    module: 'call-control.tsx',
    method: 'handlePopoverClose',
  });
  setActiveMenu(null);
};

/**
 * Handles hold toggle with logging
 */
export const handleHoldToggle = (toggleHold: (() => void) | undefined, logger: ILogger): void => {
  logger.info('CC-Widgets: CallControl: hold toggle clicked', {
    module: 'call-control.tsx',
    method: 'handleHoldToggle',
  });
  if (toggleHold) {
    toggleHold();
  }
};

/**
 * Handles wrapup call with logging
 */
export const handleWrapupCall = (onWrapupCall: (() => void) | undefined, logger: ILogger): void => {
  logger.info('CC-Widgets: CallControl: wrapup call clicked', {
    module: 'call-control.tsx',
    method: 'handleWrapupCall',
  });
  if (onWrapupCall) {
    onWrapupCall();
  }
};

/**
 * Validates if a menu type is supported
 */
export const isValidMenuType = (menuType: string): boolean => {
  const validMenuTypes = ['Consult', 'Transfer'];
  return validMenuTypes.includes(menuType);
};

/**
 * Gets button style class based on state
 */
export const getButtonStyleClass = (
  isActive: boolean,
  isDisabled: boolean,
  baseClass = 'call-control-button'
): string => {
  if (isDisabled) {
    return `${baseClass}-disabled`;
  }
  if (isActive) {
    return `${baseClass}-active`;
  }
  return baseClass;
};

/**
 * Formats elapsed time for display
 */
export const formatElapsedTime = (startTime: number): string => {
  const elapsed = Date.now() - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
};

/**
 * Checks if an agent is available for selection
 */
export const isAgentAvailable = (agent: BuddyDetails): boolean => {
  return agent && agent.agentId && agent.agentName && agent.agentName.trim().length > 0;
};

/**
 * Checks if a queue is available for selection
 */
export const isQueueAvailable = (queue: ContactServiceQueue): boolean => {
  return queue && queue.id && queue.name && queue.name.trim().length > 0;
};

/**
 * Filters available agents
 */
export const filterAvailableAgents = (agents: BuddyDetails[]): BuddyDetails[] => {
  return agents ? agents.filter(isAgentAvailable) : [];
};

/**
 * Filters available queues
 */
export const filterAvailableQueues = (queues: ContactServiceQueue[]): ContactServiceQueue[] => {
  return queues ? queues.filter(isQueueAvailable) : [];
};

/**
 * Debounces a function call
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
