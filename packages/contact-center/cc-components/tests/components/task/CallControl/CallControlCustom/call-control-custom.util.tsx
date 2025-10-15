import '@testing-library/jest-dom';
import {BuddyDetails} from '@webex/cc-store';
import {mockAgents, mockQueueDetails} from '@webex/test-fixtures';
import {
  createConsultButtons,
  getVisibleButtons,
  createInitials,
  handleTransferPress,
  handleEndConsultPress,
  handleMuteToggle,
  getConsultStatusText,
  handleListItemPress,
  shouldShowTabs,
  isAgentsEmpty,
  isQueuesEmpty,
  handleTabSelection,
  handleAgentSelection,
  handleQueueSelection,
  getEmptyStateMessage,
  createAgentListData,
  createQueueListData,
  createTimerKey,
  handlePopoverOpen,
  handlePopoverClose,
  handleHoldToggle,
  handleWrapupCall,
  isValidMenuType,
  getButtonStyleClass,
  formatElapsedTime,
  isAgentAvailable,
  isQueueAvailable,
  filterAvailableAgents,
  filterAvailableQueues,
  debounce,
} from '../../../../../src/components/task/CallControl/CallControlCustom/call-control-custom.utils';

const loggerMock = {
  info: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
};

describe('Call Control Custom Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createConsultButtons', () => {
    const defaultParams = {
      isMuted: false,
      isMuteDisabled: false,
      consultCompleted: true,
      isAgentBeingConsulted: true,
      isEndConsultEnabled: true,
      muteUnmute: true,
    };

    it('should create button configuration array with all buttons visible', () => {
      const mockTransfer = jest.fn();
      const mockMuteToggle = jest.fn();
      const mockEndConsult = jest.fn();

      const buttons = createConsultButtons(
        defaultParams.isMuted,
        defaultParams.isMuteDisabled,
        defaultParams.consultCompleted,
        defaultParams.isAgentBeingConsulted,
        defaultParams.isEndConsultEnabled,
        defaultParams.muteUnmute,
        mockTransfer,
        mockMuteToggle,
        mockEndConsult
      );

      expect(buttons).toHaveLength(3);
      expect(buttons[0].key).toBe('mute');
      expect(buttons[1].key).toBe('transfer');
      expect(buttons[2].key).toBe('cancel');
    });

    it('should configure mute button correctly when muted', () => {
      const buttons = createConsultButtons(
        true, // isMuted
        false,
        defaultParams.consultCompleted,
        defaultParams.isAgentBeingConsulted,
        defaultParams.isEndConsultEnabled,
        defaultParams.muteUnmute
      );

      const muteButton = buttons.find((b) => b.key === 'mute');
      expect(muteButton?.icon).toBe('microphone-muted-bold');
      expect(muteButton?.className).toBe('call-control-button-muted');
      expect(muteButton?.tooltip).toBe('Unmute');
    });

    it('should configure mute button correctly when not muted', () => {
      const buttons = createConsultButtons(
        false, // isMuted
        false,
        defaultParams.consultCompleted,
        defaultParams.isAgentBeingConsulted,
        defaultParams.isEndConsultEnabled,
        defaultParams.muteUnmute
      );

      const muteButton = buttons.find((b) => b.key === 'mute');
      expect(muteButton?.icon).toBe('microphone-bold');
      expect(muteButton?.className).toBe('call-control-button');
      expect(muteButton?.tooltip).toBe('Mute');
    });

    it('should disable transfer button when consult not completed', () => {
      const buttons = createConsultButtons(
        defaultParams.isMuted,
        defaultParams.isMuteDisabled,
        false, // consultCompleted
        defaultParams.isAgentBeingConsulted,
        defaultParams.isEndConsultEnabled,
        defaultParams.muteUnmute
      );

      const transferButton = buttons.find((b) => b.key === 'transfer');
      expect(transferButton?.disabled).toBe(true);
    });

    it('should hide transfer button when not agent being consulted or no onTransfer', () => {
      const buttons = createConsultButtons(
        defaultParams.isMuted,
        defaultParams.isMuteDisabled,
        defaultParams.consultCompleted,
        false, // isAgentBeingConsulted
        defaultParams.isEndConsultEnabled,
        defaultParams.muteUnmute
      );

      const transferButton = buttons.find((b) => b.key === 'transfer');
      expect(transferButton?.shouldShow).toBe(false);
    });

    it('should hide mute button when muteUnmute is false', () => {
      const buttons = createConsultButtons(
        defaultParams.isMuted,
        defaultParams.isMuteDisabled,
        defaultParams.consultCompleted,
        defaultParams.isAgentBeingConsulted,
        defaultParams.isEndConsultEnabled,
        false // muteUnmute
      );

      const muteButton = buttons.find((b) => b.key === 'mute');
      expect(muteButton?.shouldShow).toBe(false);
    });
  });

  describe('getVisibleButtons', () => {
    it('should filter buttons that should be shown', () => {
      const buttons = [
        {key: 'btn1', shouldShow: true, icon: '', onClick: jest.fn(), tooltip: '', className: ''},
        {key: 'btn2', shouldShow: false, icon: '', onClick: jest.fn(), tooltip: '', className: ''},
        {key: 'btn3', shouldShow: true, icon: '', onClick: jest.fn(), tooltip: '', className: ''},
      ];

      const visible = getVisibleButtons(buttons);
      expect(visible).toHaveLength(2);
      expect(visible[0].key).toBe('btn1');
      expect(visible[1].key).toBe('btn3');
    });

    it('should return empty array when no buttons should be shown', () => {
      const buttons = [{key: 'btn1', shouldShow: false, icon: '', onClick: jest.fn(), tooltip: '', className: ''}];

      const visible = getVisibleButtons(buttons);
      expect(visible).toHaveLength(0);
    });
  });

  describe('createInitials', () => {
    it('should create initials from full name', () => {
      expect(createInitials('John Doe')).toBe('JD');
    });

    it('should create initials from single name', () => {
      expect(createInitials('John')).toBe('J');
    });

    it('should create initials from multiple names, taking first two', () => {
      expect(createInitials('John Michael Doe')).toBe('JM');
    });

    it('should handle empty string', () => {
      expect(createInitials('')).toBe('');
    });

    it('should convert to uppercase', () => {
      expect(createInitials('john doe')).toBe('JD');
    });

    it('should handle names with extra spaces', () => {
      expect(createInitials('  John   Doe  ')).toBe('JD');
    });
  });

  describe('handleTransferPress', () => {
    it('should call onTransfer and log when provided', () => {
      const mockOnTransfer = jest.fn();

      handleTransferPress(mockOnTransfer, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: CallControlConsult: transfer button clicked', {
        module: 'call-control-consult.tsx',
        method: 'handleTransfer',
      });
      expect(mockOnTransfer).toHaveBeenCalled();
      expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: CallControlConsult: transfer completed', {
        module: 'call-control-consult.tsx',
        method: 'handleTransfer',
      });
    });

    it('should not call onTransfer when not provided', () => {
      expect(() => {
        handleTransferPress(undefined, loggerMock);
      }).not.toThrow();

      expect(loggerMock.info).toHaveBeenCalled();
      expect(loggerMock.log).not.toHaveBeenCalled();
    });

    it('should throw error when onTransfer throws', () => {
      const mockOnTransfer = jest.fn(() => {
        throw new Error('Transfer failed');
      });

      expect(() => {
        handleTransferPress(mockOnTransfer, loggerMock);
      }).toThrow('Error transferring call: Error: Transfer failed');
    });
  });

  describe('handleEndConsultPress', () => {
    it('should call endConsultCall and log when provided', () => {
      const mockEndConsult = jest.fn();

      handleEndConsultPress(mockEndConsult, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: CallControlConsult: end consult clicked', {
        module: 'call-control-consult.tsx',
        method: 'handleEndConsult',
      });
      expect(mockEndConsult).toHaveBeenCalled();
      expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: CallControlConsult: end consult completed', {
        module: 'call-control-consult.tsx',
        method: 'handleEndConsult',
      });
    });

    it('should throw error when endConsultCall throws', () => {
      const mockEndConsult = jest.fn(() => {
        throw new Error('End consult failed');
      });

      expect(() => {
        handleEndConsultPress(mockEndConsult, loggerMock);
      }).toThrow('Error ending consult call: Error: End consult failed');
    });
  });

  describe('handleMuteToggle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should disable button, call toggle, and re-enable after timeout', () => {
      const mockToggleMute = jest.fn();
      const mockSetDisabled = jest.fn();

      handleMuteToggle(mockToggleMute, mockSetDisabled, loggerMock);

      expect(mockSetDisabled).toHaveBeenCalledWith(true);
      expect(mockToggleMute).toHaveBeenCalled();

      jest.advanceTimersByTime(500);

      expect(mockSetDisabled).toHaveBeenCalledWith(false);
    });

    it('should handle error and still re-enable button', () => {
      const mockToggleMute = jest.fn(() => {
        throw new Error('Mute failed');
      });
      const mockSetDisabled = jest.fn();

      handleMuteToggle(mockToggleMute, mockSetDisabled, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith('Mute toggle failed: Error: Mute failed', {
        module: 'call-control-consult.tsx',
        method: 'handleConsultMuteToggle',
      });

      jest.advanceTimersByTime(500);
      expect(mockSetDisabled).toHaveBeenCalledWith(false);
    });

    it('should not call toggle when not provided', () => {
      const mockSetDisabled = jest.fn();

      expect(() => {
        handleMuteToggle(undefined, mockSetDisabled, loggerMock);
      }).not.toThrow();

      expect(mockSetDisabled).toHaveBeenCalledWith(true);
    });
  });

  describe('getConsultStatusText', () => {
    it('should return "Consulting" when completed', () => {
      expect(getConsultStatusText(true)).toBe('Consulting');
    });

    it('should return "Consult requested" when not completed', () => {
      expect(getConsultStatusText(false)).toBe('Consult requested');
    });
  });

  describe('handleListItemPress', () => {
    it('should call onButtonPress and log', () => {
      const mockButtonPress = jest.fn();
      const title = 'Test Agent';

      handleListItemPress(title, mockButtonPress, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith(
        `CC-Widgets: ConsultTransferListComponent: button pressed: ${title}`,
        {
          module: 'consult-transfer-list-item.tsx',
          method: 'handleButtonPress',
        }
      );
      expect(mockButtonPress).toHaveBeenCalled();
    });
  });

  describe('shouldShowTabs', () => {
    it('should return true when agents exist', () => {
      expect(
        shouldShowTabs(
          mockAgents.map((a) => ({
            agentId: a.agentId,
            agentName: a.agentName,
            state: a.state,
            teamId: a.teamId,
            dn: a.dn,
            siteId: a.siteId,
          })),
          []
        )
      ).toBe(true);
    });

    it('should return true when queues exist', () => {
      expect(shouldShowTabs([], mockQueueDetails)).toBe(true);
    });

    it('should return true when both exist', () => {
      expect(
        shouldShowTabs(
          mockAgents.map((a) => ({
            agentId: a.agentId,
            agentName: a.agentName,
            state: a.state,
            teamId: a.teamId,
            dn: a.dn,
            siteId: a.siteId,
          })),
          mockQueueDetails
        )
      ).toBe(true);
    });

    it('should return false when both are empty', () => {
      expect(shouldShowTabs([], [])).toBe(false);
    });

    it('should return false when both are null/undefined', () => {
      expect(shouldShowTabs(null!, undefined!)).toBe(false);
    });
  });

  describe('isAgentsEmpty', () => {
    it('should return false when agents exist', () => {
      expect(
        isAgentsEmpty(
          mockAgents.map((a) => ({
            agentId: a.agentId,
            agentName: a.agentName,
            state: a.state,
            teamId: a.teamId,
            dn: a.dn,
            siteId: a.siteId,
          }))
        )
      ).toBe(false);
    });

    it('should return true when agents array is empty', () => {
      expect(isAgentsEmpty([])).toBe(true);
    });

    it('should return true when agents is null', () => {
      expect(isAgentsEmpty(null!)).toBe(true);
    });

    it('should return true when agents is undefined', () => {
      expect(isAgentsEmpty(undefined!)).toBe(true);
    });
  });

  describe('isQueuesEmpty', () => {
    it('should return false when queues exist', () => {
      expect(isQueuesEmpty(mockQueueDetails)).toBe(false);
    });

    it('should return true when queues array is empty', () => {
      expect(isQueuesEmpty([])).toBe(true);
    });

    it('should return true when queues is null', () => {
      expect(isQueuesEmpty(null!)).toBe(true);
    });

    it('should return true when queues is undefined', () => {
      expect(isQueuesEmpty(undefined!)).toBe(true);
    });
  });

  describe('handleTabSelection', () => {
    it('should set selected tab and log', () => {
      const mockSetSelectedTab = jest.fn();
      const key = 'Agents';

      handleTabSelection(key, mockSetSelectedTab, loggerMock);

      expect(mockSetSelectedTab).toHaveBeenCalledWith(key);
      expect(loggerMock.log).toHaveBeenCalledWith(`CC-Widgets: ConsultTransferPopover: tab selected: ${key}`, {
        module: 'consult-transfer-popover.tsx',
        method: 'onTabSelection',
      });
    });
  });

  describe('handleAgentSelection', () => {
    it('should call onAgentSelect and log when provided', () => {
      const mockOnAgentSelect = jest.fn();
      const agentId = 'agent1';
      const agentName = 'John Doe';

      handleAgentSelection(agentId, agentName, mockOnAgentSelect, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith(`CC-Widgets: ConsultTransferPopover: agent selected: ${agentId}`, {
        module: 'consult-transfer-popover.tsx',
        method: 'onAgentSelect',
      });
      expect(mockOnAgentSelect).toHaveBeenCalledWith(agentId, agentName);
    });

    it('should not call onAgentSelect when not provided', () => {
      expect(() => {
        handleAgentSelection('agent1', 'John Doe', undefined, loggerMock);
      }).not.toThrow();

      expect(loggerMock.info).toHaveBeenCalled();
    });
  });

  describe('handleQueueSelection', () => {
    it('should call onQueueSelect and log when provided', () => {
      const mockOnQueueSelect = jest.fn();
      const queueId = 'queue1';
      const queueName = 'Support Queue';

      handleQueueSelection(queueId, queueName, mockOnQueueSelect, loggerMock);

      expect(loggerMock.log).toHaveBeenCalledWith(`CC-Widgets: ConsultTransferPopover: queue selected: ${queueId}`, {
        module: 'consult-transfer-popover.tsx',
        method: 'onQueueSelect',
      });
      expect(mockOnQueueSelect).toHaveBeenCalledWith(queueId, queueName);
    });

    it('should not call onQueueSelect when not provided', () => {
      expect(() => {
        handleQueueSelection('queue1', 'Support Queue', undefined, loggerMock);
      }).not.toThrow();

      expect(loggerMock.log).toHaveBeenCalled();
    });
  });

  describe('getEmptyStateMessage', () => {
    it('should return general message when tabs are not shown', () => {
      const message = getEmptyStateMessage('Agents', false);
      expect(message).toBe("We can't find any queue or agent available for now.");
    });

    it('should return agents message when Agents tab is selected', () => {
      const message = getEmptyStateMessage('Agents', true);
      expect(message).toBe("We can't find any agent available for now.");
    });

    it('should return queues message when Queues tab is selected', () => {
      const message = getEmptyStateMessage('Queues', true);
      expect(message).toBe("We can't find any queue available for now.");
    });

    it('should return queues message for any other tab', () => {
      const message = getEmptyStateMessage('SomeOtherTab', true);
      expect(message).toBe("We can't find any queue available for now.");
    });
  });

  describe('createAgentListData', () => {
    it('should transform buddy agents to list data', () => {
      const result = createAgentListData(
        mockAgents.map((a) => ({
          agentId: a.agentId,
          agentName: a.agentName,
          state: a.state,
          teamId: a.teamId,
          dn: a.dn,
          siteId: a.siteId,
        }))
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({id: mockAgents[0].agentId, name: mockAgents[0].agentName});
      expect(result[1]).toEqual({id: mockAgents[1].agentId, name: mockAgents[1].agentName});
    });

    it('should handle empty array', () => {
      const result = createAgentListData([]);
      expect(result).toEqual([]);
    });
  });

  describe('createQueueListData', () => {
    it('should transform queues to list data', () => {
      const result = createQueueListData(mockQueueDetails);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({id: mockQueueDetails[0].id, name: mockQueueDetails[0].name});
      expect(result[1]).toEqual({id: mockQueueDetails[1].id, name: mockQueueDetails[1].name});
    });

    it('should handle empty array', () => {
      const result = createQueueListData([]);
      expect(result).toEqual([]);
    });
  });

  describe('createTimerKey', () => {
    it('should create timer key with timestamp', () => {
      const timestamp = 1234567890;
      expect(createTimerKey(timestamp)).toBe('timer-1234567890');
    });

    it('should handle zero timestamp', () => {
      expect(createTimerKey(0)).toBe('timer-0');
    });
  });

  describe('handlePopoverOpen', () => {
    it('should set active menu and log', () => {
      const mockSetActiveMenu = jest.fn();
      const menuType = 'Consult';

      handlePopoverOpen(menuType, mockSetActiveMenu, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith(`CC-Widgets: CallControl: opening ${menuType} popover`, {
        module: 'call-control.tsx',
        method: 'handlePopoverOpen',
      });
      expect(mockSetActiveMenu).toHaveBeenCalledWith(menuType);
    });
  });

  describe('handlePopoverClose', () => {
    it('should set active menu to null and log', () => {
      const mockSetActiveMenu = jest.fn();

      handlePopoverClose(mockSetActiveMenu, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: CallControl: closing popover', {
        module: 'call-control.tsx',
        method: 'handlePopoverClose',
      });
      expect(mockSetActiveMenu).toHaveBeenCalledWith(null);
    });
  });

  describe('handleHoldToggle', () => {
    it('should call toggleHold and log when provided', () => {
      const mockToggleHold = jest.fn();

      handleHoldToggle(mockToggleHold, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: CallControl: hold toggle clicked', {
        module: 'call-control.tsx',
        method: 'handleHoldToggle',
      });
      expect(mockToggleHold).toHaveBeenCalled();
    });

    it('should not call toggleHold when not provided', () => {
      expect(() => {
        handleHoldToggle(undefined, loggerMock);
      }).not.toThrow();

      expect(loggerMock.info).toHaveBeenCalled();
    });
  });

  describe('handleWrapupCall', () => {
    it('should call onWrapupCall and log when provided', () => {
      const mockWrapupCall = jest.fn();

      handleWrapupCall(mockWrapupCall, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: CallControl: wrapup call clicked', {
        module: 'call-control.tsx',
        method: 'handleWrapupCall',
      });
      expect(mockWrapupCall).toHaveBeenCalled();
    });

    it('should not call onWrapupCall when not provided', () => {
      expect(() => {
        handleWrapupCall(undefined, loggerMock);
      }).not.toThrow();

      expect(loggerMock.info).toHaveBeenCalled();
    });
  });

  describe('isValidMenuType', () => {
    it('should return true for valid menu types', () => {
      expect(isValidMenuType('Consult')).toBe(true);
      expect(isValidMenuType('Transfer')).toBe(true);
    });

    it('should return false for invalid menu types', () => {
      expect(isValidMenuType('Invalid')).toBe(false);
      expect(isValidMenuType('')).toBe(false);
      expect(isValidMenuType('consult')).toBe(false); // case sensitive
    });
  });

  describe('getButtonStyleClass', () => {
    it('should return disabled class when disabled', () => {
      expect(getButtonStyleClass(false, true)).toBe('call-control-button-disabled');
    });

    it('should return active class when active and not disabled', () => {
      expect(getButtonStyleClass(true, false)).toBe('call-control-button-active');
    });

    it('should return base class when neither active nor disabled', () => {
      expect(getButtonStyleClass(false, false)).toBe('call-control-button');
    });

    it('should use custom base class', () => {
      expect(getButtonStyleClass(false, false, 'custom-button')).toBe('custom-button');
      expect(getButtonStyleClass(true, false, 'custom-button')).toBe('custom-button-active');
      expect(getButtonStyleClass(false, true, 'custom-button')).toBe('custom-button-disabled');
    });
  });

  describe('formatElapsedTime', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockImplementation(() => 1000000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should format minutes and seconds', () => {
      const startTime = 1000000 - 90000; // 90 seconds ago
      expect(formatElapsedTime(startTime)).toBe('1:30');
    });

    it('should format hours, minutes and seconds', () => {
      const startTime = 1000000 - 3661000; // 1 hour 1 minute 1 second ago
      expect(formatElapsedTime(startTime)).toBe('1:01:01');
    });

    it('should handle zero elapsed time', () => {
      const startTime = 1000000;
      expect(formatElapsedTime(startTime)).toBe('0:00');
    });

    it('should pad single digits correctly', () => {
      const startTime = 1000000 - 9000; // 9 seconds ago
      expect(formatElapsedTime(startTime)).toBe('0:09');
    });
  });

  describe('isAgentAvailable', () => {
    it('should return true for valid agent', () => {
      expect(
        isAgentAvailable({
          agentId: 'agent1',
          agentName: 'John Doe',
          state: 'Available',
          teamId: 'team1',
          dn: 'dn1',
          siteId: 'site1',
        })
      ).toBe(true);
    });

    it('should return false for missing agentId', () => {
      expect(
        isAgentAvailable({
          agentId: '',
          agentName: 'John Doe',
          state: 'Available',
          teamId: 'team1',
          dn: 'dn1',
          siteId: 'site1',
        })
      ).toBeFalsy();
    });

    it('should return false for missing agentName', () => {
      expect(
        isAgentAvailable({
          agentId: 'agent1',
          agentName: '',
          state: 'Available',
          teamId: 'team1',
          dn: 'dn1',
          siteId: 'site1',
        } as BuddyDetails)
      ).toBeFalsy();
    });

    it('should return false for whitespace-only agentName', () => {
      expect(
        isAgentAvailable({
          agentId: 'agent1',
          agentName: '   ',
          state: 'Available',
          teamId: 'team1',
          dn: 'dn1',
          siteId: 'site1',
        } as BuddyDetails)
      ).toBeFalsy();
    });

    it('should return false for null agent', () => {
      expect(isAgentAvailable(null!)).toBeFalsy();
    });

    it('should return false for undefined agent', () => {
      expect(isAgentAvailable(undefined!)).toBeFalsy();
    });
  });

  describe('isQueueAvailable', () => {
    it('should return true for valid queue', () => {
      expect(isQueueAvailable({...mockQueueDetails[0], id: 'queue1', name: 'Support Queue'})).toBe(true);
    });

    it('should return false for missing id', () => {
      expect(isQueueAvailable({...mockQueueDetails[0], id: '', name: 'Support Queue'})).toBeFalsy();
    });

    it('should return false for missing name', () => {
      expect(isQueueAvailable({...mockQueueDetails[0], id: 'queue1', name: ''})).toBeFalsy();
    });

    it('should return false for whitespace-only name', () => {
      expect(isQueueAvailable({...mockQueueDetails[0], id: 'queue1', name: '   '})).toBeFalsy();
    });

    it('should return false for null queue', () => {
      expect(isQueueAvailable(null!)).toBeFalsy();
    });

    it('should return false for undefined queue', () => {
      expect(isQueueAvailable(undefined!)).toBeFalsy();
    });
  });

  describe('filterAvailableAgents', () => {
    it('should filter out invalid agents', () => {
      const result = filterAvailableAgents(
        mockAgents.map((a) => ({
          agentId: a.agentId,
          agentName: a.agentName,
          state: a.state,
          teamId: a.teamId,
          dn: a.dn,
          siteId: a.siteId,
        }))
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({agentId: mockAgents[0].agentId, agentName: mockAgents[0].agentName})
      );
      expect(result[1]).toEqual(
        expect.objectContaining({agentId: mockAgents[1].agentId, agentName: mockAgents[1].agentName})
      );
    });

    it('should return empty array for null input', () => {
      expect(filterAvailableAgents(null!)).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      expect(filterAvailableAgents(undefined!)).toEqual([]);
    });
  });

  describe('filterAvailableQueues', () => {
    it('should filter out invalid queues', () => {
      const result = filterAvailableQueues(mockQueueDetails);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({id: mockQueueDetails[0].id, name: mockQueueDetails[0].name}));
      expect(result[1]).toEqual(expect.objectContaining({id: mockQueueDetails[1].id, name: mockQueueDetails[1].name}));
    });

    it('should return empty array for null input', () => {
      expect(filterAvailableQueues(null!)).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      expect(filterAvailableQueues(undefined!)).toEqual([]);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('should clear previous timeout on new call', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      jest.advanceTimersByTime(50);

      debouncedFn('arg2');
      jest.advanceTimersByTime(50);

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg2');
    });

    it('should handle multiple arguments', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1', 'arg2', 'arg3');

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });
  });
});
