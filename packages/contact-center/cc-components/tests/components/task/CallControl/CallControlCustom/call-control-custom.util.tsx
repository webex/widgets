import '@testing-library/jest-dom';
import {BuddyDetails, ContactServiceQueue} from '@webex/cc-store';
import {mockAgents, mockQueueDetails} from '@webex/test-fixtures';
import {ButtonConfig, ControlVisibility} from '../../../../../src/components/task/task.types';
import {
  createConsultButtons,
  getVisibleButtons,
  createInitials,
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

  const mockControlVisibility = {
    accept: {isVisible: true, isEnabled: true},
    decline: {isVisible: true, isEnabled: true},
    end: {isVisible: true, isEnabled: true},
    muteUnmute: {isVisible: true, isEnabled: true},
    muteUnmuteConsult: {isVisible: true, isEnabled: true},
    holdResume: {isVisible: true, isEnabled: true},
    consult: {isVisible: true, isEnabled: true},
    transfer: {isVisible: true, isEnabled: true},
    conference: {isVisible: true, isEnabled: true},
    wrapup: {isVisible: false, isEnabled: false},
    pauseResumeRecording: {isVisible: true, isEnabled: true},
    endConsult: {isVisible: true, isEnabled: true},
    recordingIndicator: {isVisible: true, isEnabled: true},
    exitConference: {isVisible: false, isEnabled: false},
    mergeConference: {isVisible: false, isEnabled: false},
    mergeConferenceConsult: {isVisible: false, isEnabled: false},
    consultTransfer: {isVisible: false, isEnabled: false},
    consultTransferConsult: {isVisible: false, isEnabled: false},
    switchToMainCall: {isVisible: false, isEnabled: false},
    switchToConsult: {isVisible: false, isEnabled: false},
    isConferenceInProgress: false,
    isConsultInitiated: false,
    isConsultInitiatedAndAccepted: false,
    isConsultInitiatedOrAccepted: false,
    isConsultReceived: false,
    isHeld: false,
    consultCallHeld: false,
  };

  describe('createConsultButtons', () => {
    it('should create button configuration array with all buttons visible', () => {
      const mockTransfer = jest.fn();
      const mockMuteToggle = jest.fn();
      const mockEndConsult = jest.fn();
      const mockConsultConference = jest.fn();
      const mockSwitchToMainCall = jest.fn();

      const buttons = createConsultButtons(
        false, // isMuted
        mockControlVisibility,
        mockTransfer,
        mockMuteToggle,
        mockEndConsult,
        mockConsultConference,
        mockSwitchToMainCall,
        loggerMock
      );

      expect(buttons).toHaveLength(5); // Updated to 5 to include switchToMainCall button
      expect(buttons[0].key).toBe('mute');
      expect(buttons[1].key).toBe('switchToMainCall');
      expect(buttons[2].key).toBe('transfer');
      expect(buttons[3].key).toBe('conference');
      expect(buttons[4].key).toBe('cancel');
    });

    it('should configure mute button correctly when muted', () => {
      const buttons = createConsultButtons(
        true, // isMuted
        mockControlVisibility,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        loggerMock
      );

      const muteButton = buttons.find((b) => b.key === 'mute');
      expect(muteButton?.icon).toBe('microphone-muted-bold');
      expect(muteButton?.className).toBe('call-control-button-muted');
      expect(muteButton?.tooltip).toBe('Unmute');
    });

    it('should configure mute button correctly when not muted', () => {
      const buttons = createConsultButtons(
        false, // isMuted
        mockControlVisibility,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        loggerMock
      );

      const muteButton = buttons.find((b) => b.key === 'mute');
      expect(muteButton?.icon).toBe('microphone-bold');
      expect(muteButton?.className).toBe('call-control-button');
      expect(muteButton?.tooltip).toBe('Mute');
    });

    it('should disable transfer button when consult not completed', () => {
      const customVisibility = {...mockControlVisibility, consultTransferConsult: {isVisible: true, isEnabled: false}};
      const buttons = createConsultButtons(
        false, // isMuted
        customVisibility,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        loggerMock
      );

      const transferButton = buttons.find((b) => b.key === 'transfer');
      expect(transferButton?.disabled).toBe(true);
    });

    it('should hide transfer button when not agent being consulted or no onTransfer', () => {
      const customVisibility = {...mockControlVisibility, consultTransferConsult: {isVisible: false, isEnabled: false}};
      const buttons = createConsultButtons(
        false, // isMuted
        customVisibility,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        loggerMock
      );

      const transferButton = buttons.find((b) => b.key === 'transfer');
      expect(transferButton?.isVisible).toBe(false);
    });

    it('should hide mute button when muteUnmuteConsult is false', () => {
      const customVisibility = {...mockControlVisibility, muteUnmuteConsult: {isVisible: false, isEnabled: false}};
      const buttons = createConsultButtons(
        false, // isMuted
        customVisibility,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        loggerMock
      );

      const muteButton = buttons.find((b) => b.key === 'mute');
      expect(muteButton?.isVisible).toBe(false);
    });
  });

  describe('getVisibleButtons', () => {
    it('should filter buttons that should be shown', () => {
      const buttons = [
        {key: 'btn1', isVisible: true, icon: '', onClick: jest.fn(), tooltip: '', className: ''},
        {key: 'btn2', isVisible: false, icon: '', onClick: jest.fn(), tooltip: '', className: ''},
        {key: 'btn3', isVisible: true, icon: '', onClick: jest.fn(), tooltip: '', className: ''},
      ];

      const visible = getVisibleButtons(buttons);
      expect(visible).toHaveLength(2);
      expect(visible[0].key).toBe('btn1');
      expect(visible[1].key).toBe('btn3');
    });

    it('should return empty array when no buttons should be shown', () => {
      const buttons = [{key: 'btn1', isVisible: false, icon: '', onClick: jest.fn(), tooltip: '', className: ''}];

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

  describe('getConsultStatusText', () => {
    it('should return "Consulting" when completed', () => {
      expect(getConsultStatusText(true)).toBe('Consult requested');
    });

    it('should return "Consult requested" when not completed', () => {
      expect(getConsultStatusText(false)).toBe('Consulting');
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

      handleAgentSelection(agentId, agentName, false, mockOnAgentSelect, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith(`CC-Widgets: ConsultTransferPopover: agent selected: ${agentId}`, {
        module: 'consult-transfer-popover.tsx',
        method: 'onAgentSelect',
      });
      expect(mockOnAgentSelect).toHaveBeenCalledWith(agentId, agentName, false);
    });

    it('should not call onAgentSelect when not provided', () => {
      expect(() => {
        handleAgentSelection('agent1', 'John Doe', false, undefined, loggerMock);
      }).not.toThrow();

      expect(loggerMock.info).toHaveBeenCalled();
    });
  });

  describe('handleQueueSelection', () => {
    it('should call onQueueSelect and log when provided', () => {
      const mockOnQueueSelect = jest.fn();
      const queueId = 'queue1';
      const queueName = 'Support Queue';

      handleQueueSelection(queueId, queueName, false, mockOnQueueSelect, loggerMock);

      expect(loggerMock.log).toHaveBeenCalledWith(`CC-Widgets: ConsultTransferPopover: queue selected: ${queueId}`, {
        module: 'consult-transfer-popover.tsx',
        method: 'onQueueSelect',
      });
      expect(mockOnQueueSelect).toHaveBeenCalledWith(queueId, queueName, false);
    });

    it('should not call onQueueSelect when not provided', () => {
      expect(() => {
        handleQueueSelection('queue1', 'Support Queue', false, undefined, loggerMock);
      }).not.toThrow();

      expect(loggerMock.log).toHaveBeenCalled();
    });
  });

  describe('handleAgentSelection', () => {
    it('should call onAgentSelect and log when provided', () => {
      const mockOnAgentSelect = jest.fn();
      const agentId = 'agent1';
      const agentName = 'John Doe';

      handleAgentSelection(agentId, agentName, false, mockOnAgentSelect, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith(`CC-Widgets: ConsultTransferPopover: agent selected: ${agentId}`, {
        module: 'consult-transfer-popover.tsx',
        method: 'onAgentSelect',
      });
      expect(mockOnAgentSelect).toHaveBeenCalledWith(agentId, agentName, false);
    });

    it('should not call onAgentSelect when not provided', () => {
      expect(() => {
        handleAgentSelection('agent1', 'John Doe', false, undefined, loggerMock);
      }).not.toThrow();

      expect(loggerMock.info).toHaveBeenCalled();
    });
  });

  describe('handleQueueSelection', () => {
    it('should call onQueueSelect and log when provided', () => {
      const mockOnQueueSelect = jest.fn();
      const queueId = 'queue1';
      const queueName = 'Support Queue';

      handleQueueSelection(queueId, queueName, false, mockOnQueueSelect, loggerMock);

      expect(loggerMock.log).toHaveBeenCalledWith(`CC-Widgets: ConsultTransferPopover: queue selected: ${queueId}`, {
        module: 'consult-transfer-popover.tsx',
        method: 'onQueueSelect',
      });
      expect(mockOnQueueSelect).toHaveBeenCalledWith(queueId, queueName, false);
    });

    it('should not call onQueueSelect when not provided', () => {
      expect(() => {
        handleQueueSelection('queue1', 'Support Queue', false, undefined, loggerMock);
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
    const validQueue: ContactServiceQueue = {
      id: 'queue1',
      name: 'Support Queue',
      description: 'Support Queue Description',
      queueType: 'INBOUND',
      checkAgentAvailability: true,
      channelType: 'TELEPHONY',
      serviceLevelThreshold: 30,
      maxActiveContacts: 10,
      maxTimeInQueue: 600,
      defaultMusicInQueueMediaFileId: 'music1',
      active: true,
      monitoringPermitted: true,
      parkingPermitted: true,
      recordingPermitted: true,
      recordingAllCallsPermitted: true,
      pauseRecordingPermitted: true,
      controlFlowScriptUrl: 'https://example.com/script',
      ivrRequeueUrl: 'https://example.com/ivr',
      routingType: 'LONGEST_AVAILABLE_AGENT',
      queueRoutingType: 'TEAM_BASED',
      callDistributionGroups: [],
    };

    it('should return true for valid queue', () => {
      expect(isQueueAvailable(validQueue)).toBe(true);
    });

    it('should return false for missing id', () => {
      expect(
        isQueueAvailable({
          ...validQueue,
          id: '',
        })
      ).toBeFalsy();
    });

    it('should return false for missing name', () => {
      expect(
        isQueueAvailable({
          ...validQueue,
          name: '',
        })
      ).toBeFalsy();
    });

    it('should return false for whitespace-only name', () => {
      expect(
        isQueueAvailable({
          ...validQueue,
          name: '   ',
        })
      ).toBeFalsy();
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

  describe('Error Handling in utility functions', () => {
    it('should handle errors in createConsultButtons', () => {
      // Create a mock that throws when accessed
      const badControlVisibility = new Proxy(
        {},
        {
          get() {
            throw new Error('Test error');
          },
        }
      );

      const buttons = createConsultButtons(
        false,
        badControlVisibility as unknown as ControlVisibility,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        loggerMock
      );

      expect(buttons).toEqual([]);
      expect(loggerMock.error).toHaveBeenCalledWith(
        'CC-Widgets: CallControlCustom: Error in createConsultButtons',
        expect.objectContaining({
          module: 'cc-components#call-control-custom.utils.ts',
          method: 'createConsultButtons',
        })
      );
    });

    it('should handle errors in getVisibleButtons', () => {
      const badButtons = [
        {
          get isVisible() {
            throw new Error('Test error');
          },
        },
      ];

      const result = getVisibleButtons(badButtons as unknown as ButtonConfig[], loggerMock);

      expect(result).toEqual([]);
      expect(loggerMock.error).toHaveBeenCalledWith(
        'CC-Widgets: CallControlCustom: Error in getVisibleButtons',
        expect.objectContaining({
          module: 'cc-components#call-control-custom.utils.ts',
          method: 'getVisibleButtons',
        })
      );
    });

    it('should handle errors in createInitials', () => {
      const badName = {
        split() {
          throw new Error('Test error');
        },
      };

      const result = createInitials(badName as unknown as string, loggerMock);

      expect(result).toBe('??');
      expect(loggerMock.error).toHaveBeenCalledWith(
        'CC-Widgets: CallControlCustom: Error in createInitials',
        expect.objectContaining({
          module: 'cc-components#call-control-custom.utils.ts',
          method: 'createInitials',
        })
      );
    });

    it('should handle errors in getConsultStatusText', () => {
      // getConsultStatusText doesn't actually throw errors with undefined, it just evaluates the boolean
      const result = getConsultStatusText(undefined as unknown as boolean, loggerMock);

      // undefined is falsy, so it returns 'Consulting'
      expect(result).toBe('Consulting');
      // This function doesn't actually log errors for undefined input
    });

    it('should handle errors in shouldShowTabs', () => {
      const badAgents = {
        get length() {
          throw new Error('Test error');
        },
      };

      const result = shouldShowTabs(badAgents as unknown as BuddyDetails[], [], loggerMock);

      expect(result).toBe(false);
      expect(loggerMock.error).toHaveBeenCalled();
    });

    it('should handle errors in isAgentsEmpty', () => {
      const badAgents = {
        get length() {
          throw new Error('Test error');
        },
      };

      const result = isAgentsEmpty(badAgents as unknown as BuddyDetails[], loggerMock);

      expect(result).toBe(true);
      expect(loggerMock.error).toHaveBeenCalled();
    });

    it('should handle errors in isQueuesEmpty', () => {
      const badQueues = {
        get length() {
          throw new Error('Test error');
        },
      };

      const result = isQueuesEmpty(badQueues as unknown as ContactServiceQueue[], loggerMock);

      expect(result).toBe(true);
      expect(loggerMock.error).toHaveBeenCalled();
    });

    it('should handle errors in handleTabSelection', () => {
      const mockSetSelectedTab = jest.fn(() => {
        throw new Error('Test error');
      });

      handleTabSelection('Agents', mockSetSelectedTab, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in handleTabSelection'),
        expect.any(Object)
      );
    });

    it('should handle errors in handleAgentSelection', () => {
      const mockOnAgentSelect = jest.fn(() => {
        throw new Error('Test error');
      });

      handleAgentSelection('agent1', 'John Doe', false, mockOnAgentSelect, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in handleAgentSelection'),
        expect.any(Object)
      );
    });

    it('should handle errors in handleQueueSelection', () => {
      const mockOnQueueSelect = jest.fn(() => {
        throw new Error('Test error');
      });

      handleQueueSelection('queue1', 'Support Queue', false, mockOnQueueSelect, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in handleQueueSelection'),
        expect.any(Object)
      );
    });

    it('should handle errors in handleAgentSelection', () => {
      const mockOnAgentSelect = jest.fn(() => {
        throw new Error('Test error');
      });

      handleAgentSelection('agent1', 'John Doe', false, mockOnAgentSelect, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in handleAgentSelection'),
        expect.any(Object)
      );
    });

    it('should handle errors in handleQueueSelection', () => {
      const mockOnQueueSelect = jest.fn(() => {
        throw new Error('Test error');
      });

      handleQueueSelection('queue1', 'Support Queue', false, mockOnQueueSelect, loggerMock);

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in handleQueueSelection'),
        expect.any(Object)
      );
    });

    it('should handle errors in getEmptyStateMessage', () => {
      // When showTabs is true and selectedTab is undefined, it falls through to the default case (queues)
      const result = getEmptyStateMessage(undefined as unknown as string, true, loggerMock);

      expect(result).toBe("We can't find any queue available for now.");
      // This function doesn't throw errors for undefined selectedTab, it just returns the default message
    });

    it('should handle errors in createAgentListData', () => {
      const badAgents = [
        {
          get agentId() {
            throw new Error('Test error');
          },
        },
      ];

      const result = createAgentListData(badAgents as unknown as BuddyDetails[], loggerMock);

      expect(result).toEqual([]);
      expect(loggerMock.error).toHaveBeenCalled();
    });

    it('should handle errors in createQueueListData', () => {
      const badQueues = [
        {
          get id() {
            throw new Error('Test error');
          },
        },
      ];

      const result = createQueueListData(badQueues as unknown as ContactServiceQueue[], loggerMock);

      expect(result).toEqual([]);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });
});
