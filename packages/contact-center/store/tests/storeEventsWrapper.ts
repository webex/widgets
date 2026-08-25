import {act, waitFor} from '@testing-library/react';

// Add a global mock for MediaStreamTrack to avoid undefined errors
// @ts-expect-error: Avoiding to mock the whole MediaStreamTrack class
global.MediaStreamTrack = class MediaStreamTrackMock {
  constructor() {
    // @ts-expect-error: Avoiding to mock the whole MediaStreamTrack class
    this.kind = 'audio';
  }
};

// Add a global mock for MediaStream to avoid undefined errors
// @ts-expect-error: Avoiding to mock the whole MediaStream class
global.MediaStream = class MediaStreamMock {
  constructor(tracks) {
    // @ts-expect-error: Avoiding to mock the whole MediaStream class
    this.tracks = tracks;
  }
};

// Mock console.error to prevent output during tests
console.error = jest.fn();
console.log = jest.fn();

import {CC_EVENTS, TASK_EVENTS} from '../src/store.types';
import type {RealTimeAssistPayload} from '../src/store.types';
import storeWrapper from '../src/storeEventsWrapper';
import {ITask} from '../src/store.types';
import {getConferenceParticipantDropRoster} from '../src/task-utils';
import {
  mockCC,
  mockTask as mockTaskFixture,
  makeMockTask,
  mockEntryPointsResponse,
  mockAddressBookEntriesResponse,
  mockQueueDetails,
} from '@webex/test-fixtures';

const TASK_MULTI_LOGIN_HYDRATE = 'task:multiLoginHydrate';

jest.mock('../src/store', () => ({
  getInstance: jest.fn().mockReturnValue({
    teams: 'mockTeams',
    loginOptions: 'mockLoginOptions',
    cc: {
      on: jest.fn(),
      off: jest.fn(),
      addressBook: {
        getEntries: jest.fn(),
      },
      taskManager: {
        getAllTasks: jest.fn().mockReturnValue({}),
      },
      webex: {
        credentials: {
          getUserToken: jest.fn(),
        },
        internal: {
          device: {
            userId: 'mock-ci-user-id',
          },
        },
      },
    },
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      trace: jest.fn(),
    },
    idleCodes: [
      {
        id: 'mockId1',
        name: 'mockName',
        isSystem: false,
        isDefault: false,
      },
      {
        id: 'mockId2',
        name: 'RONA',
        isSystem: true,
        isDefault: false,
      },
      {
        id: 'mockId3',
        name: 'RONA2',
        isSystem: true,
        isDefault: false,
      },
    ],
    agentId: 'mockAgentId',
    wrapupCodes: [],
    currentTask: null,
    isAgentLoggedIn: false,
    deviceType: 'BROWSER',
    dialNumber: '12345',
    itemId: '1234',
    taskList: {},
    incomingTask: 'mockIncomingTask',
    currentState: 'mockCurrentState',
    lastStateChangeTimestamp: 'mockLastStateChangeTimestamp',
    lastIdleCodeChangeTimestamp: 'mockLastIdleCodeChangeTimestamp',
    showMultipleLoginAlert: 'mockShowMultipleLoginAlert',
    currentTheme: 'mockCurrentTheme',
    dataCenter: 'mockDataCenter',
    customState: 'mockCustomState',
    consultStartTimeStamp: null,
    callControlAudio: null,
    isQueueConsultInProgress: false,
    currentConsultQueueId: null,
    isEndConsultEnabled: true,
    allowConsultToQueue: false,
    isDeclineButtonEnabled: false,
    isDigitalChannelsInitialized: false,
    acceptedCampaignIds: new Set<string>(),
    showE911Modal: false,
    isEmergencyModalAlreadyDisplayed: false,
    realTimeAssist: {},
    setShowMultipleLoginAlert: jest.fn(),
    setCurrentState: jest.fn(),
    setLastStateChangeTimestamp: jest.fn(),
    setLastIdleCodeChangeTimestamp: jest.fn(),
    setDeviceType: jest.fn(),
    setDialNumber: jest.fn(),
    setTeamId: jest.fn(),
    init: jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
      setupIncomingTaskHandler(mockCC);
      return Promise.resolve();
    }),
    setCurrentTask: jest.fn(),
    refreshTaskList: jest.fn(),
    setCurrentTheme: jest.fn(),
    setIsAgentLoggedIn: jest.fn(),
    registerCC: jest.fn(),
  }),
}));

const mockAgentProfile = {
  deviceType: 'EXTENSION',
  mmProfile: {chat: 4, email: 5, social: 5, telephony: 1},
  roles: ['agent'],
  orgId: 'mockOrgId',
  profileType: 'BLENDED',
  isTimeoutDesktopInactivityEnabled: true,
  timeoutDesktopInactivityMins: 30,
};

const mockAgentProfilePayload = {
  ...mockAgentProfile,
  agentId: 'c5198251-b0ec-4a7f-b9dd-c29c86915694',
  chatCount: 4,
  deviceId: '1001',
  dn: '1001',
  emailCount: 5,
  eventType: 'AgentDesktopMessage',
  interactionIds: [],
  siteId: 'c6a5451f-5ba7-49a1-aee8-fbef70c19ece',
  type: 'AgentStationLoginSuccess',
  voiceCount: 1,
};

describe('storeEventsWrapper', () => {
  describe('storeEventsWrapper Proxies', () => {
    it('should proxy teams', () => {
      expect(storeWrapper.teams).toBe('mockTeams');
    });

    it('should proxy loginOptions', () => {
      expect(storeWrapper.loginOptions).toBe('mockLoginOptions');
    });

    it('should proxy idleCodes and include RONA', () => {
      expect(storeWrapper.idleCodes.length).toBe(2);
      expect(storeWrapper.idleCodes[1].name).toBe('RONA');
    });

    it('should proxy agentId', () => {
      expect(storeWrapper.agentId).toBe('mockAgentId');
    });

    it('should proxy deviceType', () => {
      expect(storeWrapper.deviceType).toBe('BROWSER');
    });

    it('should proxy wrapupCodes', () => {
      expect(storeWrapper.wrapupCodes).toEqual([]);
    });

    it('should proxy currentTask', () => {
      // Set the store's agentId to match the task's agentId
      storeWrapper['store'].agentId = 'agent1';
      const mockCurrentTask = makeMockTask({
        data: {
          interactionId: 'mockInteractionId',
          interaction: {
            state: 'connected',
            participants: {
              agent1: {
                hasJoined: true,
              },
            },
          },
          agentId: 'agent1',
        },
      });
      storeWrapper.setCurrentTask(mockCurrentTask);
      expect(storeWrapper.currentTask).toEqual(mockCurrentTask);
    });

    it('should proxy isAgentLoggedIn', () => {
      expect(storeWrapper.isAgentLoggedIn).toBe(false);
    });

    it('should proxy deviceType', () => {
      expect(storeWrapper.deviceType).toBe('BROWSER');
    });

    it('should proxy taskList', () => {
      expect(storeWrapper.taskList).toEqual({});
    });

    it('should proxy currentState', () => {
      expect(storeWrapper.currentState).toBe('mockCurrentState');
    });

    it('should proxy customState', () => {
      expect(storeWrapper.customState).toBe('mockCustomState');
    });

    it('should proxy lastStateChangeTimestamp', () => {
      expect(storeWrapper.lastStateChangeTimestamp).toBe('mockLastStateChangeTimestamp');
    });

    it('should proxy showMultipleLoginAlert', () => {
      expect(storeWrapper.showMultipleLoginAlert).toBe('mockShowMultipleLoginAlert');

      storeWrapper.setShowMultipleLoginAlert(true);
      expect(storeWrapper['store'].showMultipleLoginAlert).toBe(true);
    });

    it('should proxy lastIdleCodeChangeTimestamp', () => {
      expect(storeWrapper['store'].lastIdleCodeChangeTimestamp).toBe('mockLastIdleCodeChangeTimestamp');

      storeWrapper.setLastIdleCodeChangeTimestamp(123456678);
      expect(storeWrapper['store'].lastIdleCodeChangeTimestamp).toBe(123456678);
    });

    it('should setShowMultipleLoginAlert', () => {
      expect(storeWrapper.setShowMultipleLoginAlert).toBeInstanceOf(Function);

      storeWrapper.setShowMultipleLoginAlert(true);
      expect(storeWrapper['store'].showMultipleLoginAlert).toBe(true);
    });

    it('should setCurrentState', () => {
      expect(storeWrapper.setCurrentState).toBeInstanceOf(Function);

      storeWrapper.setCurrentState('newState');
      expect(storeWrapper['store'].currentState).toBe('newState');
      expect(storeWrapper['store'].customState).not.toBeNull();
    });

    it('should proxy isQueueConsultInProgress', () => {
      expect(storeWrapper.isQueueConsultInProgress).toBe(false);
    });

    it('should proxy currentConsultQueueId', () => {
      expect(storeWrapper.currentConsultQueueId).toBe(null);
    });

    it('should proxy isEndConsultEnabled', () => {
      expect(storeWrapper.isEndConsultEnabled).toBe(storeWrapper['store'].isEndConsultEnabled);
    });

    it('should proxy allowConsultToQueue', () => {
      expect(storeWrapper.allowConsultToQueue).toBe(storeWrapper['store'].allowConsultToQueue);
    });

    it('should proxy isDeclineButtonEnabled', () => {
      expect(storeWrapper.isDeclineButtonEnabled).toBe(false);
    });

    it('should setIsDeclineButtonEnabled', () => {
      expect(storeWrapper.setIsDeclineButtonEnabled).toBeInstanceOf(Function);

      storeWrapper.setIsDeclineButtonEnabled(true);
      expect(storeWrapper['store'].isDeclineButtonEnabled).toBe(true);

      storeWrapper.setIsDeclineButtonEnabled(false);
      expect(storeWrapper['store'].isDeclineButtonEnabled).toBe(false);
    });

    it('should proxy consultStartTimeStamp', () => {
      expect(storeWrapper.consultStartTimeStamp).toBe(storeWrapper['store'].consultStartTimeStamp);
    });

    it('should proxy callControlAudio', () => {
      expect(storeWrapper.callControlAudio).toBe(storeWrapper['store'].callControlAudio);
    });

    it('should proxy featureFlags', () => {
      expect(storeWrapper.featureFlags).toBe(storeWrapper['store'].featureFlags);
    });

    it('should proxy dialNumber', () => {
      expect(storeWrapper.dialNumber).toBe(storeWrapper['store'].dialNumber);
    });

    it('should proxy teamId', () => {
      expect(storeWrapper.teamId).toBe(storeWrapper['store'].teamId);
    });

    it('should proxy agentProfile', () => {
      expect(storeWrapper.agentProfile).toBe(storeWrapper['store'].agentProfile);
    });

    it('should proxy isDigitalChannelsInitialized', () => {
      expect(storeWrapper.isDigitalChannelsInitialized).toBe(storeWrapper['store'].isDigitalChannelsInitialized);
    });

    it('should setDigitalChannelsInitialized', () => {
      expect(storeWrapper.setDigitalChannelsInitialized).toBeInstanceOf(Function);

      storeWrapper.setDigitalChannelsInitialized(true);
      expect(storeWrapper['store'].isDigitalChannelsInitialized).toBe(true);

      storeWrapper.setDigitalChannelsInitialized(false);
      expect(storeWrapper['store'].isDigitalChannelsInitialized).toBe(false);
    });

    describe('setState', () => {
      it('should call setCurrentState if idleCode is passed', () => {
        const idleCode = storeWrapper.idleCodes[0];
        storeWrapper.setState(idleCode);
        expect(storeWrapper.currentState).toBe(idleCode.id);
      });

      it('should set customState if customState is passed', () => {
        const customState = {
          name: 'customState',
          developerName: 'customState',
        };
        storeWrapper.setState(customState);
        expect(storeWrapper.customState).toBe(customState);
      });

      it('should set customState to null if reset is passed', () => {
        const customState = {
          reset: true,
        };
        storeWrapper.setState(customState);
        expect(storeWrapper.customState).toBe(null);
      });
    });

    it('should call registerCC', () => {
      const mockRegisterCC = jest.fn();
      storeWrapper['store'].registerCC = mockRegisterCC;

      storeWrapper.registerCC();
      expect(mockRegisterCC).toHaveBeenCalled();

      const mockLogger = {log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), trace: jest.fn()};
      storeWrapper.registerCC({
        cc: mockCC,
        logger: mockLogger,
      });
      expect(mockRegisterCC).toHaveBeenCalledWith({cc: mockCC, logger: mockLogger});
    });

    it('should setLastStateChangeTimestamp', () => {
      expect(storeWrapper.setLastStateChangeTimestamp).toBeInstanceOf(Function);

      const timestamp = new Date().getTime();
      storeWrapper.setLastStateChangeTimestamp(timestamp);
      expect(storeWrapper['store'].lastStateChangeTimestamp).toBe(timestamp);
    });

    it('should setLastIdleCodeChangeTimestamp', () => {
      expect(storeWrapper.setLastIdleCodeChangeTimestamp).toBeInstanceOf(Function);

      const timestamp = new Date().getTime();
      storeWrapper.setLastIdleCodeChangeTimestamp(timestamp);
      expect(storeWrapper.lastIdleCodeChangeTimestamp).toBe(timestamp);
    });

    it('should currentTheme', () => {
      expect(storeWrapper.currentTheme).toBe('mockCurrentTheme');
    });

    it('should proxy dataCenter', () => {
      expect(storeWrapper.dataCenter).toBe('mockDataCenter');
    });

    it('should setDataCenter', () => {
      expect(storeWrapper.setDataCenter).toBeInstanceOf(Function);

      storeWrapper.setDataCenter('newDataCenter');
      expect(storeWrapper['store'].dataCenter).toBe('newDataCenter');
    });

    it('should setCurrentTheme', () => {
      expect(storeWrapper.setCurrentTheme).toBeInstanceOf(Function);

      storeWrapper.setCurrentTheme('newTheme');
      expect(storeWrapper['store'].currentTheme).toBe('newTheme');
    });

    it('should setIsAgentLoggedIn', () => {
      expect(storeWrapper.setIsAgentLoggedIn).toBeInstanceOf(Function);

      storeWrapper.setIsAgentLoggedIn(false);
      expect(storeWrapper['store'].isAgentLoggedIn).toBe(false);
    });

    it('should setIsAgentLoggedIn', () => {
      expect(storeWrapper.setIsAgentLoggedIn).toBeInstanceOf(Function);

      storeWrapper.setIsAgentLoggedIn(false);
      expect(storeWrapper['store'].isAgentLoggedIn).toBe(false);
    });

    it('should setWrapupCodes', () => {
      const mockCodes = [{id: 'code1', name: 'code1'}];
      expect(storeWrapper.setWrapupCodes).toBeInstanceOf(Function);

      storeWrapper.setWrapupCodes(mockCodes);
      expect(storeWrapper['store'].wrapupCodes).toBe(mockCodes);
    });

    it('should setIsQueueConsultInProgress', () => {
      expect(storeWrapper.setIsQueueConsultInProgress).toBeInstanceOf(Function);

      storeWrapper.setIsQueueConsultInProgress(true);
      expect(storeWrapper['store'].isQueueConsultInProgress).toBe(true);
    });

    it('should setCurrentConsultQueueId', () => {
      expect(storeWrapper.setCurrentConsultQueueId).toBeInstanceOf(Function);

      storeWrapper.setCurrentConsultQueueId('queue-123');
      expect(storeWrapper['store'].currentConsultQueueId).toBe('queue-123');
    });

    describe('setCCCallback/removeCCCallback', () => {
      it('should set cc callback', () => {
        const mockCb = jest.fn();
        expect(storeWrapper.setCCCallback).toBeInstanceOf(Function);

        storeWrapper.setCCCallback(CC_EVENTS.AGENT_DN_REGISTERED, mockCb);
        expect(storeWrapper['store'].cc.on).toHaveBeenCalledWith(CC_EVENTS.AGENT_DN_REGISTERED, mockCb);
      });

      it('should return if callback is not passed or task is ', () => {
        const mockCb = jest.fn();
        expect(storeWrapper.setCCCallback).toBeInstanceOf(Function);

        storeWrapper.setCCCallback(CC_EVENTS.AGENT_DN_REGISTERED, undefined);
        expect(storeWrapper['store'].cc.on).not.toHaveBeenCalledWith(CC_EVENTS.AGENT_DN_REGISTERED, mockCb);
      });

      it('should remove cc callback', () => {
        expect(storeWrapper.removeCCCallback).toBeInstanceOf(Function);

        storeWrapper.removeCCCallback(CC_EVENTS.AGENT_DN_REGISTERED);
        expect(storeWrapper['store'].cc.off).toHaveBeenCalledWith(CC_EVENTS.AGENT_DN_REGISTERED);
      });
    });

    describe('setTaskCallback/removeTaskCallback', () => {
      let mockTask: ITask;
      beforeEach(() => {
        mockTask = mockTaskFixture;
        // Reset currentTask to null before test
        storeWrapper['store'].currentTask = null;
        // mock return the task list from cc.taskManager
        storeWrapper['store'].cc.taskManager.getAllTasks = jest
          .fn()
          .mockReturnValue({[mockTask.data.interactionId]: mockTask});
        storeWrapper.refreshTaskList();
      });

      it('should set task callback', () => {
        const mockCb = jest.fn();
        expect(storeWrapper.setTaskCallback).toBeInstanceOf(Function);
        storeWrapper['store'].taskList = {
          mockTaskId: mockTask,
        };

        storeWrapper.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, mockCb, 'mockTaskId');
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, mockCb);
      });

      it('should return if callback is not present or task is not found', () => {
        const mockCb = jest.fn();
        expect(storeWrapper.setTaskCallback).toBeInstanceOf(Function);

        storeWrapper.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, undefined, 'mockTaskId');
        expect(mockTask.on).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, mockCb);

        storeWrapper.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, mockCb, 'mockTaskI2');
        expect(mockTask.on).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, mockCb);
      });

      it('should remove task callback', () => {
        const mockCb = jest.fn();
        storeWrapper['store'].taskList = {
          mockTaskId: mockTask,
        };
        expect(storeWrapper.removeTaskCallback).toBeInstanceOf(Function);

        storeWrapper.removeTaskCallback(TASK_EVENTS.TASK_WRAPPEDUP, mockCb, 'mockTaskId');
        expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_WRAPPEDUP, mockCb);
      });

      it('should return and not remove callback if callback is not present or task is not found', () => {
        const mockCb = jest.fn();
        expect(storeWrapper.removeTaskCallback).toBeInstanceOf(Function);

        storeWrapper.removeTaskCallback(TASK_EVENTS.TASK_ASSIGNED, undefined, 'mockTaskId');
        expect(mockTask.on).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, mockCb);

        storeWrapper.removeTaskCallback(TASK_EVENTS.TASK_ASSIGNED, mockCb, 'mockTaskI2');
        expect(mockTask.on).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, mockCb);
      });
    });
  });

  describe('storeEventsWrapper', () => {
    const mockTask = makeMockTask({
      data: {
        interactionId: 'interaction1',
        interaction: {
          state: 'connected',
          participants: {
            agent1: {
              hasJoined: true,
            },
          },
        },
        agentId: 'agent1',
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
      storeWrapper['store'].realtimeTranscriptionData = [];
      // mock return the task list from cc.taskManager
    });

    it('should initialize the store and set up incoming task handler', async () => {
      const options = {
        webex: {
          cc: mockCC,
          logger: {
            log: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            trace: jest.fn(),
            error: jest.fn(),
          },
        },
      };
      await storeWrapper.init(options);

      expect(storeWrapper['store'].init).toHaveBeenCalledWith(options, expect.any(Function));
    });

    it('should handle incoming task and call onIncomingTask callback', () => {
      // Set the store's agentId to match the task's agentId
      storeWrapper['store'].agentId = 'agent1';
      storeWrapper.setCurrentTask(null);
      const mockIncomingTaskCallback = jest.fn();
      storeWrapper.setIncomingTaskCb(mockIncomingTaskCallback);
      // Ensure mockTask is properly set up
      const mockTask2 = makeMockTask({
        data: {
          interactionId: 'interaction1',
          interaction: {
            state: 'new',
          },
          agentId: 'agent1',
          // Note: mockTask2 doesn't have hasJoined: true to simulate an incoming task
        },
      });

      // Set up mockTask with hasJoined: true so it can be set as current task
      const mockTaskWithJoined = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interaction: {
            ...mockTask.data.interaction,
            participants: {
              agent1: {
                hasJoined: true,
              },
            },
          },
          agentId: 'agent1',
        },
      } as unknown as ITask;

      storeWrapper['store'].taskList = {interaction2: mockTaskWithJoined};
      storeWrapper.setCurrentTask(mockTaskWithJoined);
      storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({
        [mockTaskWithJoined.data.interactionId]: mockTaskWithJoined,
        [mockTask2.data.interactionId]: mockTask2,
      });

      // Call the method under test
      storeWrapper.handleIncomingTask(mockTask2);
      expect(mockIncomingTaskCallback).toHaveBeenCalledWith({task: mockTask2});

      // Verify that the correct event handlers were registered
      // Note: currentTask should remain as mockTaskWithJoined because incoming tasks are not set as current
      expect(storeWrapper.currentTask).toBeTruthy();
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_CREATED, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_MEDIA, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULTING, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_ACCEPTED, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_END, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_WRAPPEDUP, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_AUTO_ANSWERED, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_HOLD, storeWrapper.refreshTaskList);
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_RESUME, storeWrapper.refreshTaskList);
    });

    it('should handle consulting i.e handleIncomingTask with the task already present in the taskList', () => {
      const mockIncomingTaskCallback = jest.fn();
      storeWrapper.setIncomingTaskCb(mockIncomingTaskCallback);
      // Ensure mockTask is properly set up
      const mockTask = makeMockTask({
        data: {
          interactionId: 'interaction1',
          interaction: {
            state: 'connected',
          },
        },
      });

      storeWrapper['store'].cc.taskManager.getAllTasks = jest
        .fn()
        .mockReturnValue({[mockTask.data.interactionId]: mockTask});
      storeWrapper.refreshTaskList();

      // Add the mock task to the task list
      storeWrapper['store'].taskList = {interaction1: mockTask};

      // Call the method under test
      storeWrapper.handleIncomingTask(mockTask);
      expect(mockIncomingTaskCallback).not.toHaveBeenCalledWith({task: mockTask});

      // Verify that the correct event handlers were registered
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_CREATED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_MEDIA, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULTING, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_ACCEPTED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_END, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_WRAPPEDUP, expect.any(Function));
    });

    it('should handle incoming call without onIncomingTask callback', () => {
      const mockIncomingTaskCallback = jest.fn();
      storeWrapper.setIncomingTaskCb(undefined);
      // Ensure mockTask is properly set up
      const mockTask = makeMockTask({
        data: {
          interactionId: 'interaction1',
          interaction: {
            state: 'connected',
          },
        },
      });

      // Add the mock task to the task list
      storeWrapper['store'].taskList = {interaction1: mockTask};

      // Call the method under test
      storeWrapper.handleIncomingTask(mockTask);
      expect(mockIncomingTaskCallback).not.toHaveBeenCalledWith(mockTask);

      // Verify that the correct event handlers were registered
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_CREATED, expect.any(Function));
    });

    describe('handleTaskMuteState', () => {
      it('resets isMuted on new incoming telephony task for Extension login', () => {
        storeWrapper['store'].deviceType = 'EXTENSION';
        storeWrapper['store'].isMuted = true;

        storeWrapper.handleTaskMuteState(mockTask);

        expect(storeWrapper.isMuted).toBe(false);
      });

      it('resets isMuted when current task is removed after ending muted', () => {
        storeWrapper['store'].isMuted = true;
        storeWrapper['store'].currentTask = mockTask;

        storeWrapper.handleTaskRemove(mockTask);

        expect(storeWrapper.isMuted).toBe(false);
      });

      it('resets isMuted on task end', () => {
        storeWrapper['store'].isMuted = true;

        storeWrapper.handleTaskEnd();

        expect(storeWrapper.isMuted).toBe(false);
      });
    });

    it('should call onErrorCallback and rethrow when store.init rejects with an Error', async () => {
      const cc = storeWrapper['store'].cc;
      const logger = storeWrapper['store'].logger;
      const error = new Error('init failed');
      const onErrorCallback = jest.fn();

      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.reject(error);
      });
      // Directly set onErrorCallback to focus on init error handling behavior
      storeWrapper.onErrorCallback = onErrorCallback;

      const options = {
        webex: {
          cc,
          logger,
        },
      };

      await expect(storeWrapper.init(options)).rejects.toThrow('init failed');

      expect(onErrorCallback).toHaveBeenCalledWith('Store', error);
    });

    it('should wrap non-Error rejections and pass wrapped Error to onErrorCallback', async () => {
      const cc = storeWrapper['store'].cc;
      const logger = storeWrapper['store'].logger;
      const rawError = 'init failed as string';
      const onErrorCallback = jest.fn();

      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.reject(rawError);
      });
      storeWrapper.onErrorCallback = onErrorCallback;

      const options = {
        webex: {
          cc,
          logger,
        },
      };

      await expect(storeWrapper.init(options)).rejects.toThrow('init failed as string');

      expect(onErrorCallback).toHaveBeenCalledWith('Store', expect.any(Error));
      const [, wrappedError] = onErrorCallback.mock.calls[0];
      expect(wrappedError).toBeInstanceOf(Error);
      expect(wrappedError.message).toBe('Store initialization failed: init failed as string');
    });

    it('should handle task assignment and call onTaskAssigned callback', () => {
      const mockTaskAssignedCallback = jest.fn();
      storeWrapper.setTaskAssigned(mockTaskAssignedCallback);

      storeWrapper.handleTaskAssigned(mockTask);
      expect(mockTaskAssignedCallback).toHaveBeenCalledWith(mockTask);
    });

    it('should handle consultAccepted event', () => {
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
      const setStateSpy = jest.spyOn(storeWrapper, 'setState');

      // Mock getAllTasks to return the mockTask
      storeWrapper['store'].cc.taskManager.getAllTasks = jest
        .fn()
        .mockReturnValue({[mockTask.data.interactionId]: mockTask});
      storeWrapper['store'].currentTask = mockTask;

      storeWrapper.handleConsultAccepted(mockTask);
      expect(setCurrentTaskSpy).toHaveBeenCalledWith(mockTask);
      expect(setStateSpy).toHaveBeenCalledWith({
        developerName: 'ENGAGED',
        name: 'Engaged',
      });
    });

    it('should handle consult event', () => {
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');

      // Mock getAllTasks to return the mockTask
      storeWrapper['store'].cc.taskManager.getAllTasks = jest
        .fn()
        .mockReturnValue({[mockTask.data.interactionId]: mockTask});
      storeWrapper['store'].currentTask = mockTask;

      storeWrapper.handleConsulting();
      expect(setCurrentTaskSpy).toHaveBeenCalledWith(mockTask);
    });

    it('should handle task media', () => {
      const mockTrack = new MediaStreamTrack();
      const setCallControlAudioSpy = jest.spyOn(storeWrapper, 'setCallControlAudio');

      storeWrapper.handleTaskMedia(mockTrack);

      expect(setCallControlAudioSpy).toHaveBeenCalledWith(new MediaStream([mockTrack]));
    });

    it('should append and then replace realtime transcript content by messageId', () => {
      storeWrapper.handleRealtimeTranscription({
        agentId: 'agent-1',
        data: {
          content: 'Hello',
          conversationId: 'conversation-1',
          isFinal: false,
          messageId: 'message-1',
          orgId: 'org-1',
          publishTimestamp: 101,
          role: 'caller',
          trackingId: 'tracking-1',
          utteranceId: 'utterance-1',
        },
        notifDetails: {actionEvent: 'REAL_TIME_TRANSCRIPTION'},
        notifType: 'REAL_TIME_TRANSCRIPTION',
        orgId: 'org-1',
      });

      expect(storeWrapper['store'].realtimeTranscriptionData).toEqual([
        expect.objectContaining({
          content: 'Hello',
          isFinal: false,
          messageId: 'message-1',
          publishTimestamp: 101,
          role: 'CALLER',
        }),
      ]);

      storeWrapper.handleRealtimeTranscription({
        agentId: 'agent-1',
        data: {
          content: 'Hello there',
          conversationId: 'conversation-1',
          isFinal: true,
          messageId: 'message-1',
          orgId: 'org-1',
          publishTimestamp: 102,
          role: 'caller',
          trackingId: 'tracking-1',
          utteranceId: 'utterance-1',
        },
        notifDetails: {actionEvent: 'REAL_TIME_TRANSCRIPTION'},
        notifType: 'REAL_TIME_TRANSCRIPTION',
        orgId: 'org-1',
      });

      expect(storeWrapper['store'].realtimeTranscriptionData).toEqual([
        expect.objectContaining({
          content: 'Hello there',
          isFinal: true,
          messageId: 'message-1',
          publishTimestamp: 102,
          role: 'CALLER',
        }),
      ]);
    });

    it('should accept wrapped realtime transcript event payloads', () => {
      storeWrapper.handleRealtimeTranscription({
        agentId: 'agent-2',
        data: {
          content: 'Agent speaking',
          conversationId: 'conversation-2',
          isFinal: false,
          messageId: 'message-2',
          orgId: 'org-2',
          publishTimestamp: '201',
          role: 'agent',
          trackingId: 'tracking-2',
          utteranceId: 'utterance-2',
        },
        notifDetails: {actionEvent: 'REAL_TIME_TRANSCRIPTION'},
        notifType: 'REAL_TIME_TRANSCRIPTION',
        orgId: 'org-2',
      });

      expect(storeWrapper['store'].realtimeTranscriptionData).toEqual([
        expect.objectContaining({
          content: 'Agent speaking',
          isFinal: false,
          messageId: 'message-2',
          publishTimestamp: 201,
          role: 'AGENT',
        }),
      ]);
    });

    it('should append real-time assist payloads by interaction id', () => {
      const first: RealTimeAssistPayload = {
        data: {
          adaptiveCard: {type: 'AdaptiveCard'},
          adaptiveCardId: 'card-1',
          suggestion: 'First suggestion',
        },
      };
      const second: RealTimeAssistPayload = {
        data: {
          adaptiveCard: {type: 'AdaptiveCard'},
          adaptiveCardId: 'card-2',
          suggestion: 'Second suggestion',
        },
      };
      storeWrapper['store'].realTimeAssist = {};

      storeWrapper.handleRealTimeAssist('interaction-assist', first);
      storeWrapper.handleRealTimeAssist('interaction-assist', second);

      expect(storeWrapper.realTimeAssist).toEqual({
        'interaction-assist': [first, second],
      });
    });

    it('should ignore invalid real-time assist events and clear only the requested interaction', () => {
      const retained: RealTimeAssistPayload = {
        data: {adaptiveCard: {type: 'AdaptiveCard'}, adaptiveCardId: 'retained-card'},
      };
      const removed: RealTimeAssistPayload = {
        data: {adaptiveCard: {type: 'AdaptiveCard'}, adaptiveCardId: 'removed-card'},
      };
      storeWrapper['store'].realTimeAssist = {
        retained: [retained],
        removed: [removed],
      };

      storeWrapper.handleRealTimeAssist('', removed);
      storeWrapper.handleRealTimeAssist('invalid', {data: undefined} as unknown as RealTimeAssistPayload);
      storeWrapper.clearRealTimeAssist('removed');

      expect(storeWrapper.realTimeAssist).toEqual({retained: [retained]});
    });

    it('should register one suggested-response listener and remove its state with the task', () => {
      const interactionId = 'interaction-listener';
      const task = makeMockTask({
        data: {interactionId, interaction: {state: 'connected'}},
      });
      const registerTaskEventListeners = storeWrapper as unknown as {
        registerTaskEventListeners: (taskToRegister: ITask) => void;
      };
      storeWrapper['store'].realTimeAssist = {};

      registerTaskEventListeners.registerTaskEventListeners(task);
      registerTaskEventListeners.registerTaskEventListeners(task);

      const listenerCalls = (task.on as jest.Mock).mock.calls.filter(([event]) => event === 'SUGGESTED_RESPONSE');
      expect(listenerCalls).toHaveLength(1);

      const payload: RealTimeAssistPayload = {
        data: {adaptiveCard: {type: 'AdaptiveCard'}, adaptiveCardId: 'card-listener'},
      };
      listenerCalls[0][1](payload);
      expect(storeWrapper.realTimeAssist[interactionId]).toEqual([payload]);

      storeWrapper.handleTaskRemove(task);
      expect(task.off).toHaveBeenCalledWith('SUGGESTED_RESPONSE', listenerCalls[0][1]);
      expect(storeWrapper.realTimeAssist[interactionId]).toBeUndefined();
    });

    it('should update isMuted for current task on TASK_WXAPP_MUTE_STATE_UPDATED', () => {
      const interactionId = 'interaction-wxapp-mute';
      const task = makeMockTask({
        data: {interactionId, interaction: {state: 'connected'}},
      });
      storeWrapper['store'].currentTask = task;
      const setIsMutedSpy = jest.spyOn(storeWrapper, 'setIsMuted');

      storeWrapper.handleWxAppMuteStateUpdated({muted: true}, task);

      expect(setIsMutedSpy).toHaveBeenCalledWith(true);
    });

    it('should ignore TASK_WXAPP_MUTE_STATE_UPDATED for non-current task', () => {
      const task = makeMockTask({
        data: {interactionId: 'interaction-wxapp-mute', interaction: {state: 'connected'}},
      });
      storeWrapper['store'].currentTask = makeMockTask({
        data: {interactionId: 'other-interaction', interaction: {state: 'connected'}},
      });
      const setIsMutedSpy = jest.spyOn(storeWrapper, 'setIsMuted');

      storeWrapper.handleWxAppMuteStateUpdated({muted: true}, task);

      expect(setIsMutedSpy).not.toHaveBeenCalled();
    });

    it('should register one wxApp mute listener and remove it with the task', () => {
      const interactionId = 'interaction-wxapp-mute-listener';
      const task = makeMockTask({
        data: {interactionId, interaction: {state: 'connected'}},
      });
      const registerTaskEventListeners = storeWrapper as unknown as {
        registerTaskEventListeners: (taskToRegister: ITask) => void;
      };

      registerTaskEventListeners.registerTaskEventListeners(task);
      registerTaskEventListeners.registerTaskEventListeners(task);

      const listenerCalls = (task.on as jest.Mock).mock.calls.filter(
        ([event]) => event === TASK_EVENTS.TASK_WXAPP_MUTE_STATE_UPDATED
      );
      expect(listenerCalls).toHaveLength(1);

      storeWrapper['store'].currentTask = task;
      const setIsMutedSpy = jest.spyOn(storeWrapper, 'setIsMuted');
      listenerCalls[0][1]({muted: false});
      expect(setIsMutedSpy).toHaveBeenCalledWith(false);

      storeWrapper.handleTaskRemove(task);
      expect(task.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_WXAPP_MUTE_STATE_UPDATED, listenerCalls[0][1]);
    });

    it('should seed isMuted from syncWxAppMuteFromCallDetails on setCurrentTask', async () => {
      storeWrapper['store'].agentId = 'mockAgentId';
      const interactionId = 'interaction-wxapp-mute-seed';
      const task = makeMockTask({
        data: {
          interactionId,
          agentId: 'mockAgentId',
          interaction: {
            state: 'connected',
            participants: {
              mockAgentId: {hasJoined: true},
            },
          },
        },
      }) as ITask & {
        syncWxAppMuteFromCallDetails: jest.Mock;
        getWxAppMuted: jest.Mock;
      };
      task.syncWxAppMuteFromCallDetails = jest.fn().mockResolvedValue(true);
      task.getWxAppMuted = jest.fn().mockReturnValue(true);

      storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({
        [interactionId]: task,
      });

      storeWrapper.setCurrentTask(task);
      await waitFor(() => {
        expect(task.syncWxAppMuteFromCallDetails).toHaveBeenCalled();
      });
      expect(storeWrapper.isMuted).toBe(true);
    });

    it('should not re-seed isMuted when setCurrentTask is called with the same interactionId', async () => {
      const interactionId = 'interaction-wxapp-mute-dedupe';
      storeWrapper['store'].agentId = 'mockAgentId';
      const task = makeMockTask({
        data: {
          interactionId,
          agentId: 'mockAgentId',
          interaction: {
            state: 'connected',
            participants: {
              mockAgentId: {hasJoined: true},
            },
          },
        },
      }) as ITask & {
        syncWxAppMuteFromCallDetails: jest.Mock;
        getWxAppMuted: jest.Mock;
      };
      task.syncWxAppMuteFromCallDetails = jest.fn().mockResolvedValue(true);
      task.getWxAppMuted = jest.fn().mockReturnValue(true);

      storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({
        [interactionId]: task,
      });

      storeWrapper.setCurrentTask(task);
      await waitFor(() => {
        expect(task.syncWxAppMuteFromCallDetails).toHaveBeenCalledTimes(1);
      });

      task.syncWxAppMuteFromCallDetails.mockClear();
      storeWrapper.setCurrentTask(task);
      expect(task.syncWxAppMuteFromCallDetails).not.toHaveBeenCalled();
    });

    it('should not trigger additional mute sync when refreshTaskList re-promotes the same current task', async () => {
      storeWrapper['store'].agentId = 'mockAgentId';
      const interactionId = 'interaction-wxapp-mute-refresh';
      const task = makeMockTask({
        data: {
          interactionId,
          agentId: 'mockAgentId',
          interaction: {
            state: 'connected',
            participants: {
              mockAgentId: {hasJoined: true},
            },
          },
        },
      }) as ITask & {
        syncWxAppMuteFromCallDetails: jest.Mock;
        getWxAppMuted: jest.Mock;
      };
      task.syncWxAppMuteFromCallDetails = jest.fn().mockResolvedValue(true);
      task.getWxAppMuted = jest.fn().mockReturnValue(false);

      storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({
        [interactionId]: task,
      });

      storeWrapper.setCurrentTask(task);
      await waitFor(() => {
        expect(task.syncWxAppMuteFromCallDetails).toHaveBeenCalledTimes(1);
      });

      task.syncWxAppMuteFromCallDetails.mockClear();
      storeWrapper.refreshTaskList();
      expect(task.syncWxAppMuteFromCallDetails).not.toHaveBeenCalled();
    });

    it('should handle task removal', () => {
      const refreshTaskListSpy = jest.spyOn(storeWrapper, 'refreshTaskList');
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');

      storeWrapper['store'].cc.taskManager.getAllTasks = jest
        .fn()
        .mockReturnValue({[mockTask.data.interactionId]: mockTask});
      storeWrapper.refreshTaskList();
      storeWrapper['store'].currentTask = mockTask;

      storeWrapper.handleTaskRemove(mockTask);

      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_AUTO_ANSWERED, expect.any(Function));
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_HOLD, storeWrapper.refreshTaskList);
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_RESUME, storeWrapper.refreshTaskList);

      expect(refreshTaskListSpy).toHaveBeenCalledWith();
      expect(setCurrentTaskSpy).toHaveBeenCalledWith(null);
    });

    it('should handle task removal when no task is present', () => {
      storeWrapper['store'].taskList = {};
      storeWrapper['store'].currentTask = null;
      storeWrapper.handleTaskRemove(storeWrapper['store'].currentTask);

      expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      const refreshTaskListSpy = jest.spyOn(storeWrapper, 'refreshTaskList');
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');

      storeWrapper.handleTaskRemove(storeWrapper['store'].currentTask);

      expect(refreshTaskListSpy).toHaveBeenCalledWith();
      // When task list is empty and currentTask is null, setCurrentTask(null) is still called to ensure state consistency
      expect(setCurrentTaskSpy).toHaveBeenCalled();
    });

    it('should set selected login option', () => {
      const setDeviceTypeSpy = jest.spyOn(storeWrapper, 'setDeviceType');
      const option = 'newLoginOption';

      storeWrapper.setDeviceType(option);

      expect(setDeviceTypeSpy).toHaveBeenCalledWith(option);
    });

    it('should set selected Id', () => {
      const setTeamIdSpy = jest.spyOn(storeWrapper, 'setTeamId');
      const id = '1234';

      storeWrapper.setTeamId(id);

      expect(setTeamIdSpy).toHaveBeenCalledWith(id);
    });

    it('should return buddy agents list', async () => {
      const buddyAgents = [
        {agentName: 'Zeta Agent', agentId: '3'},
        {agentName: 'Alpha Agent', agentId: '1'},
        {agentName: 'Beta Agent', agentId: '2'},
      ];
      storeWrapper['store'].currentTask = {data: {interaction: {mediaType: 'telephony'}}} as ITask;
      storeWrapper['store'].cc.getBuddyAgents = jest.fn().mockResolvedValue({data: {agentList: buddyAgents}});
      const result = await storeWrapper.getBuddyAgents('Consult');
      expect(result).toEqual(buddyAgents);
      expect(storeWrapper['store'].cc.getBuddyAgents).toHaveBeenCalledWith({
        action: 'Consult',
        mediaType: 'telephony',
      });
    });

    it('should pass the transfer intent to the SDK', async () => {
      storeWrapper['store'].currentTask = {data: {interaction: {mediaType: 'telephony'}}} as ITask;
      storeWrapper['store'].cc.getBuddyAgents = jest.fn().mockResolvedValue({data: {agentList: []}});

      await storeWrapper.getBuddyAgents('Transfer');

      expect(storeWrapper['store'].cc.getBuddyAgents).toHaveBeenCalledWith({
        action: 'Transfer',
        mediaType: 'telephony',
      });
    });

    it('should preserve the legacy media-type buddy-agent call', async () => {
      storeWrapper['store'].cc.getBuddyAgents = jest.fn().mockResolvedValue({data: {agentList: []}});

      await storeWrapper.getBuddyAgents('chat');

      expect(storeWrapper['store'].cc.getBuddyAgents).toHaveBeenCalledWith({
        mediaType: 'chat',
        state: 'Available',
      });
    });

    it('should omit an unsupported task media type and use the SDK default', async () => {
      storeWrapper['store'].currentTask = {data: {interaction: {mediaType: 'video'}}} as ITask;
      storeWrapper['store'].cc.getBuddyAgents = jest.fn().mockResolvedValue({data: {agentList: []}});

      await storeWrapper.getBuddyAgents('Consult');

      expect(storeWrapper['store'].cc.getBuddyAgents).toHaveBeenCalledWith({action: 'Consult'});
    });

    it('should handle error in getBuddyAgents and throw error', async () => {
      storeWrapper['store'].currentTask = null;
      storeWrapper['store'].cc.getBuddyAgents = jest.fn().mockRejectedValue(new Error('error'));
      await expect(storeWrapper.getBuddyAgents('Consult')).rejects.toThrow('error');
    });

    it('should return contact service queues list', async () => {
      const queueList = [
        {id: 'queue1', name: 'Queue 1', channelType: 'TELEPHONY'},
        {id: 'queue2', name: 'Queue 2', channelType: 'TELEPHONY'},
        {id: 'queue3', name: 'Queue 3', channelType: 'CHAT'},
      ];
      const response = {data: queueList, meta: {page: 0, totalPages: 1}};
      storeWrapper['store'].currentTask = {data: {interaction: {mediaType: 'telephony'}}} as ITask;
      storeWrapper['store'].cc.getQueues = jest.fn().mockResolvedValue(response);

      const result = await storeWrapper.getQueues();

      expect(result.data).toEqual(queueList);
      expect(storeWrapper['store'].cc.getQueues).toHaveBeenCalledWith({});
    });

    it('should pass only runtime context and list inputs when getQueues is called with params', async () => {
      const queueList = [{id: 'queue1', name: 'Queue 1', channelType: 'TELEPHONY'}];
      storeWrapper['store'].currentTask = {data: {interaction: {mediaType: 'telephony'}}} as ITask;
      storeWrapper['store'].cc.getQueues = jest
        .fn()
        .mockResolvedValue({data: queueList, meta: {page: 1, totalPages: 1}});

      await storeWrapper.getQueues({page: 1, pageSize: 25});

      expect(storeWrapper['store'].cc.getQueues).toHaveBeenCalledWith({
        page: 1,
        pageSize: 25,
      });
    });

    it('should use the existing queue filter parameter for a non-telephony task', async () => {
      storeWrapper['store'].currentTask = {data: {interaction: {mediaType: 'social'}}} as ITask;
      storeWrapper['store'].cc.getQueues = jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}});

      await storeWrapper.getQueues({page: 0, pageSize: 25});

      expect(storeWrapper['store'].cc.getQueues).toHaveBeenCalledWith({
        filter: 'queueType==INBOUND;channelType==SOCIAL_CHANNEL;active==true',
        page: 0,
        pageSize: 25,
      });
    });

    it('should combine a caller filter with the active task channel filter', async () => {
      storeWrapper['store'].currentTask = {data: {interaction: {mediaType: 'chat'}}} as ITask;
      storeWrapper['store'].cc.getQueues = jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}});

      await storeWrapper.getQueues({filter: 'name==Support', page: 0});

      expect(storeWrapper['store'].cc.getQueues).toHaveBeenCalledWith({
        filter: 'queueType==INBOUND;channelType==CHAT;active==true;name==Support',
        page: 0,
      });
    });

    it('should preserve the legacy media-type and params queue call', async () => {
      storeWrapper['store'].currentTask = null;
      storeWrapper['store'].cc.getQueues = jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}});

      await storeWrapper.getQueues('social', {page: 2, search: 'support'});

      expect(storeWrapper['store'].cc.getQueues).toHaveBeenCalledWith({
        filter: 'queueType==INBOUND;channelType==SOCIAL_CHANNEL;active==true',
        page: 2,
        search: 'support',
      });
    });

    it('should preserve telephony scoping for the legacy queue call when a caller filter is supplied', async () => {
      storeWrapper['store'].cc.getQueues = jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}});

      await storeWrapper.getQueues('telephony', {filter: 'name==Support'});

      expect(storeWrapper['store'].cc.getQueues).toHaveBeenCalledWith({
        filter: 'queueType==INBOUND;channelType==TELEPHONY;active==true;name==Support',
      });
    });

    it('should preserve an explicit empty filter in the params-only queue call', async () => {
      storeWrapper['store'].currentTask = {data: {interaction: {mediaType: 'telephony'}}} as ITask;
      storeWrapper['store'].cc.getQueues = jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}});

      await storeWrapper.getQueues({filter: ''});

      expect(storeWrapper['store'].cc.getQueues).toHaveBeenCalledWith({filter: ''});
    });

    it('should handle error in getQueues and throw error', async () => {
      storeWrapper['store'].currentTask = null;
      storeWrapper['store'].cc.getQueues = jest.fn().mockRejectedValue(new Error('queue error'));

      await expect(storeWrapper.getQueues()).rejects.toThrow('queue error');
    });

    it('should return contact service queues list when SDK returns paginated response', async () => {
      const queueList = [
        {id: mockQueueDetails[0].id, name: mockQueueDetails[0].name},
        {id: mockQueueDetails[1].id, name: mockQueueDetails[1].name},
      ];
      const response = {data: queueList, meta: {page: 1, pageSize: 50, totalRecords: 2, totalPages: 1}};
      storeWrapper['store'].currentTask = null;
      storeWrapper['store'].cc.getQueues = jest.fn().mockResolvedValue(response);

      const result = await storeWrapper.getQueues();

      expect(result).toEqual(response);
      expect(storeWrapper['store'].cc.getQueues).toHaveBeenCalledWith({});
    });

    it('should handle consultQueueCancelled event', () => {
      const isQueueConsultInProgressSpy = jest.spyOn(storeWrapper, 'setIsQueueConsultInProgress');
      const currentConsultQueueIdSpy = jest.spyOn(storeWrapper, 'setCurrentConsultQueueId');
      const consultStartTimeStampSpy = jest.spyOn(storeWrapper, 'setConsultStartTimeStamp');

      storeWrapper.handleConsultQueueCancelled();
      expect(isQueueConsultInProgressSpy).toHaveBeenCalledWith(false);
      expect(currentConsultQueueIdSpy).toHaveBeenCalledWith(null);
      expect(consultStartTimeStampSpy).toHaveBeenCalledWith(null);
    });

    it('should fetch entry points successfully', async () => {
      storeWrapper['store'].cc.getEntryPoints = jest.fn().mockResolvedValue(mockEntryPointsResponse);

      const result = await storeWrapper.getEntryPoints({page: 0, pageSize: 25});
      expect(storeWrapper['store'].cc.getEntryPoints).toHaveBeenCalledWith({page: 0, pageSize: 25});
      expect(result).toEqual(mockEntryPointsResponse);
    });

    it('should handle error while fetching entry points', async () => {
      storeWrapper['store'].currentTask = null;
      storeWrapper['store'].cc.getEntryPoints = jest.fn().mockRejectedValue(new Error('ep error'));
      await expect(storeWrapper.getEntryPoints({page: 0, pageSize: 25})).rejects.toThrow('ep error');
    });

    it('should fetch address book entries successfully', async () => {
      storeWrapper['store'].isAddressBookEnabled = true;
      jest.spyOn(storeWrapper['store'].cc.addressBook, 'getEntries').mockResolvedValue(mockAddressBookEntriesResponse);

      const result = await storeWrapper.getAddressBookEntries({page: 0, pageSize: 25});
      expect(storeWrapper['store'].cc.addressBook.getEntries).toHaveBeenCalledWith({page: 0, pageSize: 25});
      expect(result).toEqual(mockAddressBookEntriesResponse);
    });

    it('should handle error while fetching address book entries', async () => {
      storeWrapper['store'].isAddressBookEnabled = true;
      jest.spyOn(storeWrapper['store'].cc.addressBook, 'getEntries').mockRejectedValue(new Error('ab error'));
      await expect(storeWrapper.getAddressBookEntries({page: 0, pageSize: 25})).rejects.toThrow('ab error');
    });

    it('should return empty list and not call API when address book is disabled', async () => {
      storeWrapper['store'].isAddressBookEnabled = false;
      const getEntriesSpy = jest.spyOn(storeWrapper['store'].cc.addressBook, 'getEntries');
      const result = await storeWrapper.getAddressBookEntries({page: 0, pageSize: 25});
      expect(result).toEqual({data: [], meta: {page: 0, totalPages: 0}});
      expect(getEntriesSpy).not.toHaveBeenCalled();
    });

    describe('getAccessToken', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should return the access token on success', async () => {
        const mockAccessToken = 'mock-access-token-12345';
        // @ts-expect-error - webex credentials API not typed on IContactCenter
        storeWrapper['store'].cc.webex.credentials.getUserToken = jest
          .fn()
          .mockResolvedValue({access_token: mockAccessToken});

        const result = await storeWrapper.getAccessToken();

        // @ts-expect-error - webex credentials API not typed on IContactCenter
        expect(storeWrapper['store'].cc.webex.credentials.getUserToken).toHaveBeenCalled();
        expect(result).toBe(mockAccessToken);
      });

      it('should log error and rethrow when getUserToken fails', async () => {
        const mockError = new Error('Token retrieval failed');
        // @ts-expect-error - webex credentials API not typed on IContactCenter
        storeWrapper['store'].cc.webex.credentials.getUserToken = jest.fn().mockRejectedValue(mockError);
        const loggerErrorSpy = jest.spyOn(storeWrapper['store'].logger, 'error');

        await expect(storeWrapper.getAccessToken()).rejects.toThrow('Token retrieval failed');

        expect(loggerErrorSpy).toHaveBeenCalledWith('CC-Widgets: getAccessToken(): failed to get access token', {
          module: 'storeEventsWrapper.ts',
          method: 'getAccessToken',
          error: mockError,
        });
      });

      it('should handle non-Error rejection and rethrow', async () => {
        const rawError = 'String error message';
        // @ts-expect-error - webex credentials API not typed on IContactCenter
        storeWrapper['store'].cc.webex.credentials.getUserToken = jest.fn().mockRejectedValue(rawError);
        const loggerErrorSpy = jest.spyOn(storeWrapper['store'].logger, 'error');

        await expect(storeWrapper.getAccessToken()).rejects.toBe(rawError);

        expect(loggerErrorSpy).toHaveBeenCalledWith('CC-Widgets: getAccessToken(): failed to get access token', {
          module: 'storeEventsWrapper.ts',
          method: 'getAccessToken',
          error: rawError,
        });
      });
    });
  });

  describe('storeEventsWrapper events reactions', () => {
    const mockTask = makeMockTask({
      data: {
        interactionId: 'interaction1',
        interaction: {
          state: 'connected',
        },
      },
    });

    const options = {
      webex: {
        cc: mockCC,
        logger: {
          log: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          trace: jest.fn(),
          error: jest.fn(),
        },
      },
    };

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it('should initialize the store and set up event handlers for login and logout', async () => {
      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });

      await storeWrapper.init(options);

      expect(storeWrapper['store'].init).toHaveBeenCalledWith(options, expect.any(Function));

      expect(cc.on).toHaveBeenCalledWith(CC_EVENTS.AGENT_DN_REGISTERED, expect.any(Function));
      expect(cc.on).toHaveBeenCalledWith(CC_EVENTS.AGENT_RELOGIN_SUCCESS, expect.any(Function));
    });

    it('should set agentProfile on Relogin and Login', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(storeWrapper['cc'], 'on');
      const setAgentProfileSpy = jest.spyOn(storeWrapper, 'setAgentProfile');
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });

      await storeWrapper.init(options);

      const loginCb = onSpy.mock.calls.find((call) => call[0] === CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS)[1];
      act(() => {
        loginCb(mockAgentProfilePayload);
      });

      expect(setAgentProfileSpy).toHaveBeenCalledWith(mockAgentProfilePayload);

      const reloginCb = onSpy.mock.calls.find((call) => call[0] === CC_EVENTS.AGENT_RELOGIN_SUCCESS)[1];

      act(() => {
        reloginCb(mockAgentProfilePayload);
      });
      expect(setAgentProfileSpy).toHaveBeenCalledWith(mockAgentProfilePayload);
      expect(storeWrapper['store'].agentProfile).toEqual(mockAgentProfile);
    });

    it('should handle task:incoming event ', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(storeWrapper['cc'], 'on');
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });

      await storeWrapper.init(options);

      act(() => {
        onSpy.mock.calls[0][1](mockTask);
      });

      waitFor(() => {
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
        expect(storeWrapper.refreshTaskList).toHaveBeenCalledWith();
      });
    });

    it('should handle task:end event with wrapupRequired', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(storeWrapper['cc'], 'on');
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });

      await storeWrapper.init(options);

      // Login event stag: the agent is logged in
      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_HYDRATE, expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith(TASK_MULTI_LOGIN_HYDRATE, expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_MERGED, expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith(CC_EVENTS.AGENT_STATE_CHANGE, expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith(CC_EVENTS.AGENT_MULTI_LOGIN, expect.any(Function));

      const incomingTaskCb = onSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_INCOMING)[1];
      //   Incoming task stage: a task has just reached the agent

      const mockTaskOnSpy = jest.spyOn(mockTask, 'on');
      act(() => {
        incomingTaskCb(mockTask);
      });

      waitFor(() => {
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
        expect(storeWrapper.refreshTaskList).toHaveBeenCalledWith();
      });

      //  The call is answered and the task is assigned to the agent
      act(() => {
        mockTaskOnSpy.mock.calls[1][1](mockTask);
      });

      waitFor(() => {
        // The task is assigned to the agent
        expect(storeWrapper.setCurrentTask).toHaveBeenCalledWith(mockTask);
      });

      //  Task end stage: the task is completed
      act(() => {
        mockTaskOnSpy.mock.calls[0][1](mockTask);
      });

      waitFor(() => {
        expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
        expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      });
    });

    it('should handle AgentWrappedUp event ', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(storeWrapper['cc'], 'on');
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });

      await storeWrapper.init(options);

      // Login event stag: the agent is logged in
      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      const incomingTaskCb = onSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_INCOMING)[1];
      //   Incoming task stage: a task has just reached the agent
      const mockTaskOnSpy = jest.spyOn(mockTask, 'on');

      act(() => {
        incomingTaskCb(mockTask);
      });

      // AgentWrappedUp event stage: the agent has wrapped up the task
      act(() => {
        const mockTaskWrappedUpCb = mockTaskOnSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_WRAPPEDUP)[1];
        mockTaskWrappedUpCb(mockTask.data);
      });

      waitFor(() => {
        // The task is assigned to the agent
        expect(storeWrapper.handleTaskRemove).toHaveBeenCalledWith(mockTask.data.interactionId);
      });
    });

    it('should handle task assignment', () => {
      jest.spyOn(storeWrapper, 'setCurrentTask');

      storeWrapper.handleTaskAssigned(mockTask);

      expect(storeWrapper.setCurrentTask).toHaveBeenCalledWith(mockTask);
    });

    it('should handle task removal', () => {
      const refreshTaskListSpy = jest.spyOn(storeWrapper, 'refreshTaskList');
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');

      storeWrapper['store'].cc.taskManager.getAllTasks = jest
        .fn()
        .mockReturnValue({[mockTask.data.interactionId]: mockTask});
      storeWrapper.refreshTaskList();
      storeWrapper['store'].currentTask = mockTask;
      storeWrapper.handleTaskRemove(mockTask);

      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_AUTO_ANSWERED, expect.any(Function));

      expect(refreshTaskListSpy).toHaveBeenCalledWith();
      expect(setCurrentTaskSpy).toHaveBeenCalledWith(null);
    });

    it('should set selected login option', () => {
      jest.spyOn(storeWrapper, 'setDeviceType');
      const option = 'newLoginOption';
      storeWrapper.setDeviceType(option);

      expect(storeWrapper.setDeviceType).toHaveBeenCalledWith(option);
    });

    it('should handle multilogin session modal with in correct data', async () => {
      const onSpy = jest.spyOn(storeWrapper['cc'], 'on');
      jest.spyOn(storeWrapper, 'setShowMultipleLoginAlert');
      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });
      await storeWrapper.init(options);

      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      expect(storeWrapper.setShowMultipleLoginAlert).not.toHaveBeenCalledWith(true);
    });

    it.skip('should handle multilogin session modal with correct data', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(cc, 'on');
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });
      jest.spyOn(storeWrapper, 'setShowMultipleLoginAlert');

      await storeWrapper.init(options);

      // Login event stag: the agent is logged in
      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      act(() => {
        const multiLoginCb = onSpy.mock.calls.find((call) => call[0] === CC_EVENTS.AGENT_MULTI_LOGIN)[1];
        multiLoginCb({type: 'AgentMultiLoginCloseSession'});
      });

      expect(storeWrapper.setShowMultipleLoginAlert).toHaveBeenCalledWith(true);
    });

    it('should set selected login option', () => {
      const option = 'newLoginOption';
      jest.spyOn(storeWrapper, 'setDeviceType');
      storeWrapper.setDeviceType(option);

      expect(storeWrapper.setDeviceType).toHaveBeenCalledWith(option);
    });

    it('should handle state change event  with incorrect data', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(cc, 'on');
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });
      jest.spyOn(storeWrapper, 'setCurrentState');

      await storeWrapper.init(options);
      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      expect(storeWrapper.setCurrentState).not.toHaveBeenCalledWith();
    });

    it('should handle state change event  with correct data and emplty auxcodeId', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(cc, 'on');
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });
      jest.spyOn(storeWrapper, 'setCurrentState');

      await storeWrapper.init(options);

      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      act(() => {
        const stateChangeCb = onSpy.mock.calls.find((call) => call[0] === CC_EVENTS.AGENT_STATE_CHANGE)[1];
        stateChangeCb({type: 'AgentStateChangeSuccess', auxCodeId: ''});
      });

      expect(storeWrapper.setCurrentState).toHaveBeenCalledWith('0');
    });

    it('should handle state change event  with correct data', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(cc, 'on');
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });
      jest.spyOn(storeWrapper, 'setCurrentState');

      await storeWrapper.init(options);

      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      act(() => {
        const stateChangeCb = onSpy.mock.calls.find((call) => call[0] === CC_EVENTS.AGENT_STATE_CHANGE)[1];
        stateChangeCb({type: 'AgentStateChangeSuccess', auxCodeId: 'available'});
      });

      expect(storeWrapper.setCurrentState).toHaveBeenCalledWith('available');
    });

    it('should handle hydrating the store with correct data', async () => {
      const onSpy = jest.spyOn(storeWrapper['cc'], 'on');
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
      const refreshTaskListSpy = jest.spyOn(storeWrapper, 'refreshTaskList');
      const handleTaskRemoveSpy = jest.spyOn(storeWrapper, 'handleTaskRemove');

      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });

      await storeWrapper.init(options);
      storeWrapper['store'].taskList = {};

      const mockTask = {
        data: {
          interactionId: 'interaction1',
          interaction: {
            isTerminated: true,
            state: 'wrapUp',
            participants: {
              agent1: {
                isWrappedUp: false,
              },
            },
          },
          agentId: 'agent1',
        },
        on: jest.fn(),
        off: jest.fn(),
      };

      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      act(() => {
        const hydrateTaskCb = onSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_HYDRATE)[1];
        hydrateTaskCb(mockTask);
      });

      expect(setCurrentTaskSpy).toHaveBeenCalledWith(mockTask);
      expect(refreshTaskListSpy).toHaveBeenCalled();

      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_WRAPPEDUP, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_REJECT, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_OUTDIAL_FAILED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_HOLD, storeWrapper.refreshTaskList);
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_RESUME, storeWrapper.refreshTaskList);

      // Simulate task removal from task manager after wrapup
      storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({});

      act(() => {
        const mockWrapupCb = mockTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_WRAPPEDUP)[1];
        mockWrapupCb(mockTask);
      });

      expect(handleTaskRemoveSpy).toHaveBeenCalledWith(mockTask);
    });

    it('should handle task merged event', async () => {
      const onSpy = jest.spyOn(storeWrapper['cc'], 'on');
      const refreshTaskListSpy = jest.spyOn(storeWrapper, 'refreshTaskList');

      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });

      await storeWrapper.init(options);

      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      const mockMergedTask = {
        data: {
          interactionId: 'mergedTask1',
          interaction: {
            state: 'connected',
          },
        },
        on: jest.fn(),
        off: jest.fn(),
      };

      expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_MERGED, expect.any(Function));

      const taskMergedCb = onSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MERGED)[1];

      act(() => {
        taskMergedCb(mockMergedTask);
      });

      expect(refreshTaskListSpy).toHaveBeenCalled();
      expect(mockMergedTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockMergedTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockMergedTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_WRAPPEDUP, expect.any(Function));
      expect(mockMergedTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_REJECT, expect.any(Function));
      expect(mockMergedTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_OUTDIAL_FAILED, expect.any(Function));
    });

    describe('customStates on hydration', () => {
      it('should handle custom state correctly when wrapup required', async () => {
        const setStateSpy = jest.spyOn(storeWrapper, 'setState');

        const cc = storeWrapper['store'].cc;
        const onSpy = jest.spyOn(cc, 'on');
        storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
          setupIncomingTaskHandler(cc);
          return Promise.resolve();
        });

        await storeWrapper.init(options);
        storeWrapper['store'].taskList = {};

        const mockTask = {
          data: {
            interaction: {
              isTerminated: true,
              state: 'wrapUp',
              participants: {
                agent1: {
                  isWrappedUp: false,
                },
              },
            },
            agentId: 'agent1',
          },
          on: jest.fn(),
          off: jest.fn(),
        };

        act(() => {
          onSpy.mock.calls[1][1]({});
        });

        act(() => {
          const hydrateTaskCb = onSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_HYDRATE)[1];
          hydrateTaskCb(mockTask);
        });

        expect(setStateSpy).toHaveBeenCalledWith({
          name: 'Engaged',
          developerName: 'ENGAGED',
        });
      });

      it('should handle custom state correctly when wrapup is not required', async () => {
        const setStateSpy = jest.spyOn(storeWrapper, 'setState');
        storeWrapper['store'].cc = mockCC;
        const cc = mockCC;
        const onSpy = jest.spyOn(cc, 'on');

        storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
          setupIncomingTaskHandler(cc);
          return Promise.resolve();
        });

        // Set the store's agentId to match the task's agentId
        storeWrapper['store'].agentId = 'agent1';
        await storeWrapper.init(options);

        storeWrapper['store'].taskList = {};

        const mockTask = {
          data: {
            interaction: {
              isTerminated: true,
              state: 'wrapUp',
              participants: {
                agent1: {
                  isWrappedUp: true,
                },
              },
            },
            agentId: 'agent1',
          },
          on: jest.fn(),
          off: jest.fn(),
        };

        act(() => {
          onSpy.mock.calls[1][1]({});
        });

        act(() => {
          const hydrateTaskCb = onSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_HYDRATE)[1];
          hydrateTaskCb(mockTask);
        });

        // Note: setState may be called an additional time due to task hydration and refresh logic
        expect(setStateSpy).toHaveBeenCalledWith({
          reset: true,
        });
      });
    });

    it('should skip multiLoginHydrate when interaction already exists in taskList with new state', () => {
      const interactionId = 'multi-hydrate-skip-1';
      const task = {
        data: {
          interactionId,
          interaction: {state: 'new'},
        },
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;

      storeWrapper['store'].taskList = {[interactionId]: task};

      const registerSpy = jest.spyOn(
        storeWrapper as unknown as {registerTaskEventListeners: (task: ITask) => void},
        'registerTaskEventListeners'
      );
      const refreshSpy = jest.spyOn(storeWrapper, 'refreshTaskList');
      const assignedSpy = jest.spyOn(storeWrapper, 'handleTaskAssigned');

      storeWrapper.handleMultiLoginHydrate(task);

      expect(registerSpy).not.toHaveBeenCalled();
      expect(refreshSpy).not.toHaveBeenCalled();
      expect(assignedSpy).not.toHaveBeenCalled();
    });

    it('should process multiLoginHydrate when interaction state is connected', () => {
      const interactionId = 'multi-hydrate-connected-1';
      const task = {
        data: {
          interactionId,
          interaction: {state: 'connected'},
        },
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;

      storeWrapper['store'].taskList = {[interactionId]: task};

      const registerSpy = jest.spyOn(
        storeWrapper as unknown as {registerTaskEventListeners: (task: ITask) => void},
        'registerTaskEventListeners'
      );
      const refreshSpy = jest.spyOn(storeWrapper, 'refreshTaskList');
      const assignedSpy = jest.spyOn(storeWrapper, 'handleTaskAssigned');

      storeWrapper.handleMultiLoginHydrate(task);

      expect(registerSpy).toHaveBeenCalledWith(task);
      expect(refreshSpy).toHaveBeenCalled();
      expect(assignedSpy).toHaveBeenCalledWith(task);
    });

    it('should handle hydrating the store with correct data', async () => {
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
      const refreshTaskListSpy = jest.spyOn(storeWrapper, 'refreshTaskList');

      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(cc, 'on');
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });

      await storeWrapper.init(options);
      storeWrapper['store'].taskList = {};

      const mockTask = {
        data: {
          interaction: {
            isTerminated: false,
            state: 'wrapUp',
            participants: {
              agent1: {
                isWrappedUp: false,
              },
            },
          },
          agentId: 'agent1',
        },
        on: jest.fn(),
      };

      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      act(() => {
        const hydrateTaskCb = onSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_HYDRATE)[1];
        hydrateTaskCb(mockTask);
      });

      expect(setCurrentTaskSpy).toHaveBeenCalledWith(mockTask);
      expect(refreshTaskListSpy).toHaveBeenCalled();
    });

    it('should remove event listeners on successful logout and clear agentProfile', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(cc, 'on');
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });
      const setAgentProfileSpy = jest.spyOn(storeWrapper, 'setAgentProfile');

      await storeWrapper.init(options);

      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      act(() => {
        const logOutCb = onSpy.mock.calls.find((call) => call[0] === CC_EVENTS.AGENT_LOGOUT_SUCCESS)[1];
        logOutCb({});
      });

      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(TASK_EVENTS.TASK_HYDRATE, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(TASK_MULTI_LOGIN_HYDRATE, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(TASK_EVENTS.TASK_MERGED, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(CC_EVENTS.AGENT_STATE_CHANGE, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(CC_EVENTS.AGENT_MULTI_LOGIN, expect.any(Function));
      expect(setAgentProfileSpy).toHaveBeenCalledWith({});
      expect(storeWrapper['store'].agentProfile).toEqual({});
    });

    it('should reset showE911Modal and isEmergencyModalAlreadyDisplayed on logout', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(cc, 'on');
      storeWrapper['store'].init = jest.fn().mockImplementation((_options, setupIncomingTaskHandler) => {
        setupIncomingTaskHandler(cc);
        return Promise.resolve();
      });

      await storeWrapper.init(options);

      storeWrapper['store'].showE911Modal = true;
      storeWrapper['store'].isEmergencyModalAlreadyDisplayed = true;

      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      act(() => {
        const logOutCb = onSpy.mock.calls.find((call) => call[0] === CC_EVENTS.AGENT_LOGOUT_SUCCESS)[1];
        logOutCb({});
      });

      expect(storeWrapper['store'].showE911Modal).toBe(false);
      expect(storeWrapper['store'].isEmergencyModalAlreadyDisplayed).toBe(false);
    });

    it('should handle task rejection event and call onTaskRejected with the provided reason', () => {
      const rejectTask = makeMockTask({
        data: {interactionId: 'rejectTest', interaction: {state: 'connected'}},
      });

      const rejectTaskOnSpy = jest.spyOn(rejectTask, 'on');
      const onTaskRejectedMock = jest.fn();

      storeWrapper.setTaskRejected(onTaskRejectedMock);
      storeWrapper['store'].cc.taskManager.getAllTasks = jest
        .fn()
        .mockReturnValue({[rejectTask.data.interactionId]: rejectTask});
      storeWrapper.refreshTaskList();
      storeWrapper.handleIncomingTask(rejectTask);

      // Set up spy after handleIncomingTask to avoid capturing unrelated calls
      const removeSpy = jest.spyOn(storeWrapper, 'handleTaskRemove');

      const taskRejectCall = rejectTaskOnSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_REJECT);

      expect(taskRejectCall).toBeDefined();

      const rejectCallback = taskRejectCall[1];
      const reason = 'Task Rejected Reason';

      // Ensure currentTask is set to rejectTask before rejection
      storeWrapper['store'].currentTask = rejectTask;

      // Simulate task removal from task manager after rejection
      storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({});

      rejectCallback(reason);

      // Ensure the correct arguments are passed to onTaskRejectedMock
      expect(onTaskRejectedMock).toHaveBeenCalledWith(rejectTask, reason);

      // Ensure handleTaskRemove is called with the correct task object
      expect(removeSpy).toHaveBeenCalledWith(rejectTask);
    });

    it('should handle task rejection event and call onTaskRejected with no reason', () => {
      const rejectTask = makeMockTask({
        data: {interactionId: 'rejectTest', interaction: {state: 'connected'}},
      });
      const rejectTaskOnSpy = jest.spyOn(rejectTask, 'on');

      const onTaskRejectedMock = jest.fn();
      storeWrapper.setTaskRejected(onTaskRejectedMock);
      storeWrapper['store'].cc.taskManager.getAllTasks = jest
        .fn()
        .mockReturnValue({[rejectTask.data.interactionId]: rejectTask});
      storeWrapper.refreshTaskList();
      storeWrapper.handleIncomingTask(rejectTask);

      // Set up spy after handleIncomingTask to avoid capturing unrelated calls
      const removeSpy = jest.spyOn(storeWrapper, 'handleTaskRemove');

      const taskRejectCall = rejectTaskOnSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_REJECT);
      expect(taskRejectCall).toBeDefined();
      const rejectCallback = taskRejectCall[1];

      // Ensure currentTask is set to rejectTask before rejection
      storeWrapper['store'].currentTask = rejectTask;

      // Simulate task removal from task manager after rejection
      storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({});

      rejectCallback();

      // Ensure the correct arguments are passed to onTaskRejectedMock
      expect(onTaskRejectedMock).toHaveBeenCalledWith(rejectTask, 'No reason provided');
      onTaskRejectedMock.mockClear();

      expect(removeSpy).toHaveBeenCalledWith(rejectTask);

      storeWrapper.setTaskRejected(undefined);
      storeWrapper['store'].cc.taskManager.getAllTasks = jest
        .fn()
        .mockReturnValue({[rejectTask.data.interactionId]: rejectTask});
      storeWrapper.refreshTaskList();
      storeWrapper.handleIncomingTask(rejectTask);

      expect(taskRejectCall).toBeDefined();

      rejectCallback();

      // Ensure the correct arguments are passed to onTaskRejectedMock
      expect(onTaskRejectedMock).not.toHaveBeenCalledWith(rejectTask, 'No reason provided');

      // Ensure handleTaskRemove is called with the correct task object
      expect(removeSpy).toHaveBeenCalledWith(rejectTask);
    });

    it('should handle outdial failed event and call onOutdialFailed with the provided reason', () => {
      const outdialTask = makeMockTask({
        data: {interactionId: 'outdialTest', interaction: {state: 'connected'}},
      });

      const outdialTaskOnSpy = jest.spyOn(outdialTask, 'on');
      const onOutdialFailedMock = jest.fn();

      storeWrapper.setOutdialFailed(onOutdialFailedMock);
      storeWrapper['store'].cc.taskManager.getAllTasks = jest
        .fn()
        .mockReturnValue({[outdialTask.data.interactionId]: outdialTask});
      storeWrapper.refreshTaskList();
      storeWrapper.handleIncomingTask(outdialTask);

      const outdialFailedCall = outdialTaskOnSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_OUTDIAL_FAILED);

      expect(outdialFailedCall).toBeDefined();

      const outdialFailedCallback = outdialFailedCall[1];
      const reason = 'Outdial Failed Reason';

      outdialFailedCallback(reason);

      expect(onOutdialFailedMock).toHaveBeenCalledWith(reason);
    });

    it('should handle consultEnd event and reset queue consult state', () => {
      const isQueueConsultInProgressSpy = jest.spyOn(storeWrapper, 'setIsQueueConsultInProgress');
      const currentConsultQueueIdSpy = jest.spyOn(storeWrapper, 'setCurrentConsultQueueId');

      storeWrapper.handleConsultEnd();

      expect(isQueueConsultInProgressSpy).toHaveBeenCalledWith(false);
      expect(currentConsultQueueIdSpy).toHaveBeenCalledWith(null);
    });

    it('should register TASK_CONSULT_QUEUE_CANCELLED handler on incoming task', () => {
      const mockTask = makeMockTask({
        data: {
          interactionId: 'interaction1',
          interaction: {
            state: 'connected',
          },
        },
      });

      storeWrapper['store'].taskList = {};
      storeWrapper.handleIncomingTask(mockTask);

      // Verify the TASK_CONSULT_QUEUE_CANCELLED handler was registered
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, expect.any(Function));
    });

    it('should register TASK_AUTO_ANSWERED handler on incoming task', () => {
      const mockTask = makeMockTask({
        data: {
          interactionId: 'interaction1',
          interaction: {
            state: 'connected',
          },
        },
      });

      storeWrapper['store'].taskList = {};
      storeWrapper.handleIncomingTask(mockTask);

      // Verify the TASK_AUTO_ANSWERED handler was registered
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_AUTO_ANSWERED, expect.any(Function));
    });

    it('should handle auto answer event and enable decline button', () => {
      const autoAnswerTask = makeMockTask({
        data: {interactionId: 'autoAnswerTest', interaction: {state: 'connected'}},
      });

      const autoAnswerTaskOnSpy = jest.spyOn(autoAnswerTask, 'on');
      const setIsDeclineButtonEnabledSpy = jest.spyOn(storeWrapper, 'setIsDeclineButtonEnabled');
      const refreshTaskListSpy = jest.spyOn(storeWrapper, 'refreshTaskList');

      storeWrapper['store'].cc.taskManager.getAllTasks = jest
        .fn()
        .mockReturnValue({[autoAnswerTask.data.interactionId]: autoAnswerTask});
      storeWrapper.refreshTaskList();
      storeWrapper.handleIncomingTask(autoAnswerTask);

      const autoAnswerCall = autoAnswerTaskOnSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_AUTO_ANSWERED);

      expect(autoAnswerCall).toBeDefined();

      const autoAnswerCallback = autoAnswerCall[1];

      autoAnswerCallback();

      expect(setIsDeclineButtonEnabledSpy).toHaveBeenCalledWith(true);
      expect(refreshTaskListSpy).toHaveBeenCalled();
    });
  });

  describe('task:media conditionally attached based on deviceType', () => {
    const mockTask = makeMockTask({
      data: {
        interactionId: 'interaction1',
        interaction: {
          state: 'connected',
        },
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
      storeWrapper['store'].cc.taskManager.getAllTasks = jest
        .fn()
        .mockReturnValue({[mockTask.data.interactionId]: mockTask});
      storeWrapper.refreshTaskList();
    });

    it('should attach TASK_MEDIA handler when deviceType is BROWSER', () => {
      // Set deviceType to BROWSER
      storeWrapper['store'].deviceType = 'BROWSER';

      // Call handleIncomingTask
      storeWrapper.handleIncomingTask(mockTask);

      // Verify TASK_MEDIA handler was attached
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_MEDIA, expect.any(Function));
    });

    describe('should set consult states when we recieve TASK_HYDRATE event', () => {
      it('should set states when state is consulting and isConsulting is true', () => {
        const consultingMockTask = {
          ...mockTask,
          data: {
            ...mockTask.data,
            interaction: {
              ...mockTask.data.interaction,
              state: 'consulting',
            },
            isConsulted: true,
          },
        };
        const refreshTaskListSpy = jest.spyOn(storeWrapper, 'refreshTaskList');
        const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');

        storeWrapper['store'].deviceType = 'EXTENSION';

        // Call handleTaskHydrate
        storeWrapper.handleTaskHydrate(consultingMockTask);

        expect(refreshTaskListSpy).toHaveBeenCalled();
        expect(setCurrentTaskSpy).toHaveBeenCalledWith(consultingMockTask);
      });

      it('should set states when state is consulting and isConsulting is false', () => {
        const consultingMockTask = {
          ...mockTask,
          data: {
            ...mockTask.data,
            interaction: {
              ...mockTask.data.interaction,
              state: 'consulting',
              isTerminated: true,
            },
            isConsulted: false,
            wrapUpRequired: true,
          },
        };
        const refreshTaskListSpy = jest.spyOn(storeWrapper, 'refreshTaskList');
        const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
        const setStateSpy = jest.spyOn(storeWrapper, 'setState');

        storeWrapper['store'].deviceType = 'EXTENSION';

        // Call handleTaskHydrate
        storeWrapper.handleTaskHydrate(consultingMockTask);

        expect(refreshTaskListSpy).toHaveBeenCalled();
        expect(setCurrentTaskSpy).toHaveBeenCalledWith(consultingMockTask);
        expect(setStateSpy).not.toHaveBeenCalledWith({reset: true});
      });
    });

    it('should attach TASK_MEDIA handler in handleTaskHydrate when deviceType is BROWSER', () => {
      // Set deviceType to BROWSER
      storeWrapper['store'].deviceType = 'BROWSER';

      // Call handleTaskHydrate
      storeWrapper.handleTaskHydrate(mockTask);

      // Verify TASK_MEDIA handler was attached
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_MEDIA, expect.any(Function));
    });

    it('should not attach TASK_MEDIA handler when deviceType is not BROWSER', () => {
      const mockTaskOnSpy = jest.spyOn(mockTask, 'on');
      // Set deviceType to something other than BROWSER
      storeWrapper['store'].deviceType = 'DESKTOP';

      // Call handleIncomingTask
      storeWrapper.handleIncomingTask(mockTask);

      // Verify TASK_MEDIA handler was not attached
      const taskMediaCall = mockTaskOnSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MEDIA);
      expect(taskMediaCall).toBeUndefined();
    });

    it('should not attach TASK_MEDIA handler in handleTaskHydrate when deviceType is not BROWSER', () => {
      const mockTaskOnSpy = jest.spyOn(mockTask, 'on');
      // Set deviceType to something other than BROWSER
      storeWrapper['store'].deviceType = 'DESKTOP';

      // Call handleTaskHydrate
      storeWrapper.handleTaskHydrate(mockTask);

      // Verify TASK_MEDIA handler was not attached
      const taskMediaCall = mockTaskOnSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MEDIA);
      expect(taskMediaCall).toBeUndefined();
    });

    it('should remove TASK_MEDIA handler on task removal when deviceType is BROWSER', () => {
      // Set deviceType to BROWSER
      storeWrapper['store'].deviceType = 'BROWSER';

      // Call handleTaskRemove
      storeWrapper.handleTaskRemove(mockTask);

      // Verify TASK_MEDIA handler was removed
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_MEDIA, expect.any(Function));
      expect(storeWrapper.setCallControlAudio).toHaveBeenCalledWith(null);
    });

    it('should not try to remove TASK_MEDIA handler on task removal when deviceType is not BROWSER', () => {
      const mockTaskOffSpy = jest.spyOn(mockTask, 'off');
      // Set deviceType to something other than BROWSER
      storeWrapper['store'].deviceType = 'DESKTOP';

      // Add the task to taskList
      storeWrapper['store'].taskList = {mockTask: mockTask};

      // Call handleTaskRemove
      storeWrapper.handleTaskRemove(mockTask);

      // Verify TASK_MEDIA handler was not removed
      const taskMediaOffCall = mockTaskOffSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MEDIA);
      expect(taskMediaOffCall).toBeUndefined();
      expect(storeWrapper.setCallControlAudio).not.toHaveBeenCalled();
    });

    it('should attach TASK_MEDIA handler in handleConsultAccepted when deviceType is BROWSER', () => {
      // Set deviceType to BROWSER
      storeWrapper['store'].deviceType = 'BROWSER';

      // Call handleConsultAccepted
      storeWrapper.handleConsultAccepted(mockTask);

      // Verify TASK_MEDIA handler was attached
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_MEDIA, expect.any(Function));
    });

    it('should not attach TASK_MEDIA handler in handleConsultAccepted when deviceType is not BROWSER', () => {
      const mockTaskOnSpy = jest.spyOn(mockTask, 'on');
      // Set deviceType to something other than BROWSER
      storeWrapper['store'].deviceType = 'DESKTOP';

      // Call handleConsultAccepted
      storeWrapper.handleConsultAccepted(mockTask);

      // Verify TASK_MEDIA handler was not attached
      const taskMediaCall = mockTaskOnSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MEDIA);
      expect(taskMediaCall).toBeUndefined();
    });
  });

  describe('refreshTaskList', () => {
    it('should call getAllTasks and setTaskList', () => {
      jest.clearAllMocks();
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
      storeWrapper['store'].currentTask = null;
      const mockTask = {data: {interactionId: 'interaction2', interaction: {state: 'connected'}}};
      storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue([mockTask]);

      storeWrapper.refreshTaskList();

      expect(storeWrapper['store'].cc.taskManager.getAllTasks).toHaveBeenCalled();
      expect(setCurrentTaskSpy).toHaveBeenCalledTimes(1);
      expect(setCurrentTaskSpy).toHaveBeenCalledWith(mockTask);
    });
  });

  describe('owner-change hydration', () => {
    const interactionId = 'owner-change-main';
    const oldOwnerId = 'agent1';
    const promotedOwnerId = 'agent2';
    const survivingSecondaryId = 'agent3';
    let originalAgentId: (typeof storeWrapper)['store']['agentId'];
    let originalCurrentTask: (typeof storeWrapper)['store']['currentTask'];
    let originalDeviceType: (typeof storeWrapper)['store']['deviceType'];
    let originalGetAllTasks: (typeof storeWrapper)['store']['cc']['taskManager']['getAllTasks'];
    let originalTaskList: (typeof storeWrapper)['store']['taskList'];

    const participant = (id: string, name: string, hasLeft = false) => ({
      id,
      name,
      pType: 'Agent',
      type: 'Agent',
      hasJoined: true,
      hasLeft,
      isInPredial: false,
    });

    const createOwnerTask = (owner: string, oldOwnerHasLeft = false): ITask =>
      makeMockTask({
        data: {
          interactionId,
          agentId: survivingSecondaryId,
          isConferenceInProgress: true,
          interaction: {
            interactionId,
            mediaType: 'telephony',
            state: 'conference',
            owner,
            contactDirection: {type: 'inbound'},
            callAssociatedDetails: {ani: '+15550000001'},
            participants: {
              [oldOwnerId]: participant(oldOwnerId, 'Original Owner', oldOwnerHasLeft),
              [promotedOwnerId]: participant(promotedOwnerId, 'Promoted Owner'),
              [survivingSecondaryId]: participant(survivingSecondaryId, 'Surviving Secondary'),
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
                type: 'Customer',
                hasJoined: true,
                hasLeft: false,
                isInPredial: false,
              },
            },
            media: {
              [interactionId]: {
                mediaResourceId: interactionId,
                mediaType: 'telephony',
                mediaMgr: 'aqm',
                mType: 'mainCall',
                isHold: false,
                holdTimestamp: null,
                participants: oldOwnerHasLeft
                  ? [promotedOwnerId, survivingSecondaryId, 'customer1']
                  : [oldOwnerId, promotedOwnerId, survivingSecondaryId, 'customer1'],
              },
            },
          },
        },
      });

    beforeEach(() => {
      jest.clearAllMocks();
      originalAgentId = storeWrapper['store'].agentId;
      originalCurrentTask = storeWrapper['store'].currentTask;
      originalDeviceType = storeWrapper['store'].deviceType;
      originalGetAllTasks = storeWrapper['store'].cc.taskManager.getAllTasks;
      originalTaskList = storeWrapper['store'].taskList;

      storeWrapper['store'].agentId = survivingSecondaryId;
      storeWrapper['store'].currentTask = null;
      storeWrapper['store'].taskList = {};
      storeWrapper['store'].deviceType = 'EXTENSION';
    });

    afterEach(() => {
      storeWrapper['store'].agentId = originalAgentId;
      storeWrapper['store'].currentTask = originalCurrentTask;
      storeWrapper['store'].deviceType = originalDeviceType;
      storeWrapper['store'].cc.taskManager.getAllTasks = originalGetAllTasks;
      storeWrapper['store'].taskList = originalTaskList;
    });

    it('immediately replaces the cloned task and derives the authoritative promoted owner', () => {
      const staleTask = createOwnerTask(oldOwnerId);
      const hydratedTask = createOwnerTask(promotedOwnerId, true);
      storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({[interactionId]: staleTask});

      storeWrapper.setCurrentTask(staleTask);
      const staleCurrentTask = storeWrapper.currentTask as ITask;
      const staleSecondaryRoster = getConferenceParticipantDropRoster(staleCurrentTask, survivingSecondaryId);

      expect(staleCurrentTask).not.toBe(staleTask);
      expect(staleSecondaryRoster?.participants.find(({dropTargetId}) => dropTargetId === oldOwnerId)?.isPrimary).toBe(
        true
      );

      // An owner-change task:hydrate is sufficient; no participant-join event or page refresh is needed.
      storeWrapper.handleTaskHydrate(hydratedTask);

      const currentTask = storeWrapper.currentTask as ITask;
      const secondaryRoster = getConferenceParticipantDropRoster(currentTask, survivingSecondaryId);
      const promotedOwnerRoster = getConferenceParticipantDropRoster(currentTask, promotedOwnerId);

      expect(currentTask).not.toBe(staleCurrentTask);
      expect(currentTask).not.toBe(hydratedTask);
      expect(currentTask.data.interaction.owner).toBe(promotedOwnerId);
      expect(secondaryRoster?.participants).not.toEqual(
        expect.arrayContaining([expect.objectContaining({dropTargetId: oldOwnerId})])
      );
      expect(secondaryRoster?.participants.find(({dropTargetId}) => dropTargetId === promotedOwnerId)).toMatchObject({
        isPrimary: true,
        isReadOnly: true,
      });
      expect(secondaryRoster?.customer?.isReadOnly).toBe(true);
      expect(
        promotedOwnerRoster?.participants.find(({dropTargetId}) => dropTargetId === survivingSecondaryId)
      ).toMatchObject({isPrimary: false, isReadOnly: false});
      expect(promotedOwnerRoster?.customer?.isReadOnly).toBe(false);
    });
  });

  it('set TaskAssigned', () => {
    const setTaskAssignedSpy = jest.spyOn(storeWrapper, 'setTaskAssigned');
    const mockTaskAssignedCallback = jest.fn();
    storeWrapper.setTaskAssigned(mockTaskAssignedCallback);

    expect(setTaskAssignedSpy).toHaveBeenCalledWith(mockTaskAssignedCallback);
    expect(storeWrapper.onTaskAssigned).toBe(mockTaskAssignedCallback);
  });

  it('call handleConsultCreated and set states in store', () => {
    Date.now = jest.fn(() => 1234567890);

    const setConsultStartTimeStampSpy = jest.spyOn(storeWrapper, 'setConsultStartTimeStamp');

    storeWrapper.handleConsultCreated();

    expect(setConsultStartTimeStampSpy).toHaveBeenCalledWith(1234567890);
    jest.clearAllMocks();
  });

  describe('setCurrentTask', () => {
    let mockTaskA: ITask;
    let mockTaskB: ITask;

    beforeEach(() => {
      // Set the store's agentId to match the tasks' agentId
      storeWrapper['store'].agentId = 'agent1';
      mockTaskA = makeMockTask({
        data: {
          interactionId: 'taskA',
          interaction: {
            state: 'connected',
            participants: {
              agent1: {
                hasJoined: true,
              },
            },
          },
          agentId: 'agent1',
        },
      });
      mockTaskB = makeMockTask({
        data: {
          interactionId: 'taskB',
          interaction: {
            state: 'connected',
            participants: {
              agent1: {
                hasJoined: true,
              },
            },
          },
          agentId: 'agent1',
        },
      });
      storeWrapper['store'].isQueueConsultInProgress = true;
      storeWrapper['store'].currentConsultQueueId = 'queue1';
      storeWrapper['store'].consultStartTimeStamp = 123;
      storeWrapper['store'].currentTask = null;
      storeWrapper.onTaskSelected = undefined;
    });

    it('should set currentTask', () => {
      // Set an initial task
      storeWrapper.setCurrentTask(mockTaskA);
      expect(storeWrapper.currentTask).toEqual(mockTaskA);

      // Change to a new task, should save metadata for previous
      storeWrapper.setCurrentTask(mockTaskB);
      expect(storeWrapper.currentTask).toEqual(mockTaskB);
    });

    it('should call onTaskSelected if task changes', () => {
      const onTaskSelected = jest.fn();
      storeWrapper.onTaskSelected = onTaskSelected;
      storeWrapper.setCurrentTask(mockTaskA, false);
      expect(onTaskSelected).toHaveBeenCalledWith(mockTaskA, false);

      // Should not call again if same task is set
      onTaskSelected.mockClear();
      storeWrapper.setCurrentTask(mockTaskA);
      expect(onTaskSelected).not.toHaveBeenCalled();

      // Should call if task changes
      storeWrapper.setCurrentTask(mockTaskB, true);
      expect(onTaskSelected).toHaveBeenCalledWith(mockTaskB, true);
    });

    it('should set currentTask to null if passed null', () => {
      storeWrapper.setCurrentTask(mockTaskA);
      expect(storeWrapper.currentTask).toEqual(mockTaskA);
      storeWrapper.setCurrentTask(null);
      expect(storeWrapper.currentTask).toBeNull();
    });

    it('should not change currentTask when task is incoming (hasJoined is false)', () => {
      // Set an initial task that can be set as current task
      storeWrapper.setCurrentTask(mockTaskA);
      expect(storeWrapper.currentTask).toEqual(mockTaskA);

      // Create an incoming task (without hasJoined: true)
      const incomingTask = makeMockTask({
        data: {
          interactionId: 'incomingTask',
          interaction: {
            state: 'new',
            participants: {},
          },
          agentId: 'agent1',
        },
      });

      // Try to set the incoming task as current task
      storeWrapper.setCurrentTask(incomingTask);

      // Current task should remain unchanged (still mockTaskA)
      expect(storeWrapper.currentTask).toEqual(mockTaskA);
      expect(storeWrapper.currentTask).not.toEqual(incomingTask);
    });

    it('should not change currentTask when task has hasJoined false', () => {
      // This is the case where we transfer the call but agent has not accepted it yet.
      storeWrapper.setCurrentTask(mockTaskA);
      expect(storeWrapper.currentTask).toEqual(mockTaskA);

      // Create a task with explicitly hasJoined: false
      const taskWithoutJoined = makeMockTask({
        data: {
          interactionId: 'taskWithoutJoined',
          interaction: {
            state: 'connected',
            participants: {
              agent1: {
                hasJoined: false,
              },
            },
          },
          agentId: 'agent1',
        },
      });

      // Try to set the task without joined as current task
      storeWrapper.setCurrentTask(taskWithoutJoined);

      // Current task should remain unchanged (still mockTaskA)
      expect(storeWrapper.currentTask).toEqual(mockTaskA);
      expect(storeWrapper.currentTask).not.toEqual(taskWithoutJoined);
    });
  });

  describe('campaign preview task lifecycle', () => {
    const createCampaignPreviewTask = (interactionId: string): ITask =>
      makeMockTask({
        data: {
          interactionId,
          interaction: {
            state: 'new',
            outboundType: 'STANDARD_PREVIEW_CAMPAIGN',
            callProcessingDetails: {
              campaignType: 'preview_standard',
            },
          },
        },
      });

    beforeEach(() => {
      jest.clearAllMocks();
      storeWrapper['store'].acceptedCampaignIds = new Set<string>();
      storeWrapper['store'].taskList = {};
      storeWrapper['store'].currentTask = null;
    });

    describe('handleTaskEnd — campaign preview (unaccepted)', () => {
      it('should defer refreshTaskList so SDK cleanup completes first', async () => {
        const task = createCampaignPreviewTask('campaign-1');
        storeWrapper['store'].taskList = {'campaign-1': task};
        storeWrapper['store'].currentTask = task;
        // SDK still returns the task — refreshTaskList will keep it in taskList
        storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({'campaign-1': task});

        const refreshSpy = jest.spyOn(storeWrapper, 'refreshTaskList');

        storeWrapper.handleTaskEnd();

        expect(refreshSpy).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(refreshSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('handleTaskEnd — accepted campaign preview', () => {
      it('should defer refreshTaskList for accepted campaign', async () => {
        const task = createCampaignPreviewTask('campaign-accepted');
        storeWrapper['store'].acceptedCampaignIds = new Set(['campaign-accepted']);
        storeWrapper['store'].taskList = {'campaign-accepted': task};
        storeWrapper['store'].currentTask = task;
        storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({'campaign-accepted': task});

        const refreshSpy = jest.spyOn(storeWrapper, 'refreshTaskList');

        storeWrapper.handleTaskEnd();

        // acceptedCampaignIds should NOT be cleaned up here (deferred to handleTaskRemove)
        expect(storeWrapper['store'].acceptedCampaignIds.has('campaign-accepted')).toBe(true);
        expect(refreshSpy).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(refreshSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('handleTaskRemove — campaign ID cleanup', () => {
      it('should remove interactionId from acceptedCampaignIds on task removal', () => {
        const task = createCampaignPreviewTask('campaign-remove');
        storeWrapper['store'].acceptedCampaignIds = new Set(['campaign-remove']);
        storeWrapper['store'].taskList = {'campaign-remove': task};
        storeWrapper['store'].currentTask = task;
        storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({});

        storeWrapper.handleTaskRemove(task);

        expect(storeWrapper['store'].acceptedCampaignIds.has('campaign-remove')).toBe(false);
      });

      it('should not affect acceptedCampaignIds when task is not an accepted campaign', () => {
        const task = createCampaignPreviewTask('campaign-notaccepted');
        storeWrapper['store'].acceptedCampaignIds = new Set(['some-other-id']);
        storeWrapper['store'].taskList = {'campaign-notaccepted': task};
        storeWrapper['store'].currentTask = task;
        storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({});

        storeWrapper.handleTaskRemove(task);

        // The other accepted campaign should remain
        expect(storeWrapper['store'].acceptedCampaignIds.has('some-other-id')).toBe(true);
      });
    });

    describe('handleTaskEnd — non-campaign tasks', () => {
      it('should refresh a regular task after SDK terminal cleanup', async () => {
        const regularTask = makeMockTask({
          data: {
            interactionId: 'regular-1',
            interaction: {
              state: 'connected',
              outboundType: 'OUTDIAL',
            },
          },
        });

        storeWrapper['store'].taskList = {'regular-1': regularTask};
        storeWrapper['store'].currentTask = regularTask;
        storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({'regular-1': regularTask});

        const refreshSpy = jest.spyOn(storeWrapper, 'refreshTaskList');

        storeWrapper.handleTaskEnd();

        expect(refreshSpy).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(refreshSpy).toHaveBeenCalledTimes(1);
        // taskList should still contain the task (SDK still returns it)
        expect(storeWrapper['store'].taskList['regular-1']).toBeDefined();
      });

      it('coalesces consult-end and task-end into one deferred refresh', async () => {
        const refreshSpy = jest.spyOn(storeWrapper, 'refreshTaskList');
        const setQueueProgressSpy = jest.spyOn(storeWrapper, 'setIsQueueConsultInProgress');

        storeWrapper.handleConsultEnd();
        storeWrapper.handleTaskEnd();

        expect(setQueueProgressSpy).toHaveBeenCalledWith(false);
        expect(storeWrapper.consultStartTimeStamp).toBeNull();
        expect(refreshSpy).not.toHaveBeenCalled();

        await Promise.resolve();

        expect(refreshSpy).toHaveBeenCalledTimes(1);
      });

      it('clears the ended current task after SDK cleanup removes it', async () => {
        const regularTask = makeMockTask({
          data: {interactionId: 'ended-task', interaction: {state: 'connected'}},
        });
        storeWrapper['store'].taskList = {'ended-task': regularTask};
        storeWrapper['store'].currentTask = regularTask;
        storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({});

        storeWrapper.handleTaskEnd();

        expect(storeWrapper.currentTask).toBe(regularTask);
        await Promise.resolve();
        expect(storeWrapper.currentTask).toBeNull();
      });
    });

    describe('handleIncomingCampaignPreview — campaign type branching', () => {
      it('should set RESERVED state for standard preview campaign', () => {
        const task = createCampaignPreviewTask('preview-standard-1');
        const setStateSpy = jest.spyOn(storeWrapper, 'setState');

        storeWrapper.handleIncomingCampaignPreview(task);

        expect(setStateSpy).toHaveBeenCalledWith({
          developerName: 'RESERVED',
          name: 'Reserved',
        });
      });

      it('should set RESERVED state for direct preview campaign', () => {
        const task = makeMockTask({
          data: {
            interactionId: 'preview-direct-1',
            interaction: {
              state: 'new',
              outboundType: 'DIRECT_PREVIEW_CAMPAIGN',
              callProcessingDetails: {
                campaignType: 'preview_direct',
              },
            },
          },
        });
        const setStateSpy = jest.spyOn(storeWrapper, 'setState');

        storeWrapper.handleIncomingCampaignPreview(task);

        expect(setStateSpy).toHaveBeenCalledWith({
          developerName: 'RESERVED',
          name: 'Reserved',
        });
      });

      it('should NOT set RESERVED state for predictive campaign', () => {
        const task = makeMockTask({
          data: {
            interactionId: 'predictive-1',
            interaction: {
              state: 'new',
              outboundType: 'PREDICTIVE_CAMPAIGN',
              callProcessingDetails: {
                campaignType: 'predictive',
              },
            },
          },
        });
        const setStateSpy = jest.spyOn(storeWrapper, 'setState');

        storeWrapper.handleIncomingCampaignPreview(task);

        expect(setStateSpy).not.toHaveBeenCalledWith({
          developerName: 'RESERVED',
          name: 'Reserved',
        });
      });

      it('should NOT set RESERVED state for progressive campaign', () => {
        const task = makeMockTask({
          data: {
            interactionId: 'progressive-1',
            interaction: {
              state: 'new',
              outboundType: 'PROGRESSIVE_CAMPAIGN',
              callProcessingDetails: {
                campaignType: 'progressive',
              },
            },
          },
        });
        const setStateSpy = jest.spyOn(storeWrapper, 'setState');

        storeWrapper.handleIncomingCampaignPreview(task);

        expect(setStateSpy).not.toHaveBeenCalledWith({
          developerName: 'RESERVED',
          name: 'Reserved',
        });
      });

      it('should still call refreshTaskList for non-preview campaigns', () => {
        const task = makeMockTask({
          data: {
            interactionId: 'progressive-2',
            interaction: {
              state: 'new',
              outboundType: 'PROGRESSIVE_CAMPAIGN',
            },
          },
        });
        const refreshSpy = jest.spyOn(storeWrapper, 'refreshTaskList');

        storeWrapper.handleIncomingCampaignPreview(task);

        expect(refreshSpy).toHaveBeenCalled();
      });
    });

    describe('handleCampaignPreviewReservation — campaign type branching', () => {
      it.skip('should add to acceptedCampaignIds for standard preview campaign', () => {
        const task = createCampaignPreviewTask('preview-accept-1');

        storeWrapper.handleCampaignPreviewReservation(task);

        expect(storeWrapper['store'].acceptedCampaignIds.has('preview-accept-1')).toBe(true);
      });

      it.skip('should NOT add to acceptedCampaignIds for predictive campaign', () => {
        const task = makeMockTask({
          data: {
            interactionId: 'predictive-accept-1',
            interaction: {
              state: 'new',
              outboundType: 'PREDICTIVE_CAMPAIGN',
              callProcessingDetails: {
                campaignType: 'predictive',
              },
            },
          },
        });

        storeWrapper.handleCampaignPreviewReservation(task);

        expect(storeWrapper['store'].acceptedCampaignIds.has('predictive-accept-1')).toBe(false);
      });

      it('should NOT add to acceptedCampaignIds for progressive campaign', () => {
        const task = makeMockTask({
          data: {
            interactionId: 'progressive-accept-1',
            interaction: {
              state: 'new',
              outboundType: 'PROGRESSIVE_CAMPAIGN',
              callProcessingDetails: {
                campaignType: 'progressive',
              },
            },
          },
        });

        storeWrapper.handleCampaignPreviewReservation(task);

        expect(storeWrapper['store'].acceptedCampaignIds.has('progressive-accept-1')).toBe(false);
      });

      it('should still set ENGAGED state for all campaign types', () => {
        const predictiveTask = makeMockTask({
          data: {
            interactionId: 'predictive-engaged-1',
            interaction: {
              state: 'new',
              outboundType: 'PREDICTIVE_CAMPAIGN',
            },
          },
        });
        const setStateSpy = jest.spyOn(storeWrapper, 'setState');

        storeWrapper.handleCampaignPreviewReservation(predictiveTask);

        expect(setStateSpy).toHaveBeenCalledWith({
          developerName: 'ENGAGED',
          name: 'Engaged',
        });
      });
    });
  });

  describe('E911 Modal Methods', () => {
    describe('setShowE911Modal', () => {
      it('should set showE911Modal to true', () => {
        storeWrapper.setShowE911Modal(true);
        expect(storeWrapper['store'].showE911Modal).toBe(true);
      });

      it('should set showE911Modal to false', () => {
        storeWrapper.setShowE911Modal(false);
        expect(storeWrapper['store'].showE911Modal).toBe(false);
      });
    });

    describe('setIsEmergencyModalAlreadyDisplayed', () => {
      it('should set isEmergencyModalAlreadyDisplayed to true', () => {
        storeWrapper.setIsEmergencyModalAlreadyDisplayed(true);
        expect(storeWrapper['store'].isEmergencyModalAlreadyDisplayed).toBe(true);
      });

      it('should set isEmergencyModalAlreadyDisplayed to false', () => {
        storeWrapper.setIsEmergencyModalAlreadyDisplayed(false);
        expect(storeWrapper['store'].isEmergencyModalAlreadyDisplayed).toBe(false);
      });
    });

    describe('fetchUserPreferences', () => {
      it('should throw and warn if userPreference service is not available', async () => {
        storeWrapper['store'].cc.userPreference = undefined;

        await expect(storeWrapper.fetchUserPreferences()).rejects.toThrow('userPreference service not available');

        expect(storeWrapper['store'].logger.warn).toHaveBeenCalledWith(
          'CC-Widgets: fetchUserPreferences(): userPreference service not available',
          expect.any(Object)
        );
      });

      it('should fetch and parse user preferences successfully', async () => {
        const mockUserPreference = {
          getUserPreference: jest.fn().mockResolvedValue({
            preferences: {desktopPreference: JSON.stringify({isEmergencyModalAlreadyDisplayed: true})},
          }),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn(),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;

        await storeWrapper.fetchUserPreferences();

        expect(mockUserPreference.getUserPreference).toHaveBeenCalled();
        expect(storeWrapper['store'].isEmergencyModalAlreadyDisplayed).toBe(true);
      });

      it('should handle empty desktopPreference', async () => {
        const mockUserPreference = {
          getUserPreference: jest.fn().mockResolvedValue({
            preferences: {desktopPreference: null},
          }),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn(),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;

        await storeWrapper.fetchUserPreferences();

        expect(mockUserPreference.getUserPreference).toHaveBeenCalled();
        expect(storeWrapper['store'].isEmergencyModalAlreadyDisplayed).toBe(false);
      });

      it('should reset isEmergencyModalAlreadyDisplayed to false when desktopPreference is missing, even if previously true', async () => {
        storeWrapper['store'].isEmergencyModalAlreadyDisplayed = true;
        const mockUserPreference = {
          getUserPreference: jest.fn().mockResolvedValue({
            preferences: {desktopPreference: null},
          }),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn(),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;

        await storeWrapper.fetchUserPreferences();

        expect(storeWrapper['store'].isEmergencyModalAlreadyDisplayed).toBe(false);
      });

      it('should handle parse error gracefully', async () => {
        const mockUserPreference = {
          getUserPreference: jest.fn().mockResolvedValue({
            preferences: {desktopPreference: 'invalid-json'},
          }),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn(),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;

        await storeWrapper.fetchUserPreferences();

        expect(storeWrapper['store'].logger.error).toHaveBeenCalledWith(
          'CC-Widgets: fetchUserPreferences(): failed to parse desktopPreference',
          expect.any(Object)
        );
        expect(storeWrapper['store'].isEmergencyModalAlreadyDisplayed).toBe(false);
      });

      it('should throw error on API failure', async () => {
        const mockError = new Error('API Error');
        const mockUserPreference = {
          getUserPreference: jest.fn().mockRejectedValue(mockError),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn(),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;

        await expect(storeWrapper.fetchUserPreferences()).rejects.toThrow('API Error');
      });

      it('should treat a missing (404) preference record as not-yet-acknowledged instead of throwing', async () => {
        const notFoundError = Object.assign(new Error('Not Found'), {statusCode: 404});
        const mockUserPreference = {
          getUserPreference: jest.fn().mockRejectedValue(notFoundError),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn(),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;
        storeWrapper['store'].isEmergencyModalAlreadyDisplayed = true;
        const errorCallCountBefore = (storeWrapper['store'].logger.error as jest.Mock).mock.calls.length;

        await expect(storeWrapper.fetchUserPreferences()).resolves.toBeUndefined();

        expect(storeWrapper['store'].isEmergencyModalAlreadyDisplayed).toBe(false);
        expect((storeWrapper['store'].logger.error as jest.Mock).mock.calls.length).toBe(errorCallCountBefore);
      });
    });

    describe('updateEmergencyModalAcknowledgment', () => {
      it('should throw and warn if userPreference service is not available', async () => {
        storeWrapper['store'].cc.userPreference = undefined;

        await expect(storeWrapper.updateEmergencyModalAcknowledgment()).rejects.toThrow(
          'userPreference service not available'
        );

        expect(storeWrapper['store'].logger.warn).toHaveBeenCalledWith(
          'CC-Widgets: updateEmergencyModalAcknowledgment(): userPreference service not available',
          expect.any(Object)
        );
      });

      it('should update user preferences and store state successfully', async () => {
        const mockUserPreference = {
          getUserPreference: jest.fn().mockResolvedValue({userId: 'test-preference-user-id'}),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn().mockResolvedValue({}),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;
        // agentId (CC identifier) intentionally differs from the preference service's userId
        storeWrapper['store'].agentId = 'test-agent-id';

        await storeWrapper.updateEmergencyModalAcknowledgment();

        expect(mockUserPreference.updateUserPreference).toHaveBeenCalledWith('test-preference-user-id', {
          desktopPreference: JSON.stringify({isEmergencyModalAlreadyDisplayed: true}),
        });
        expect(storeWrapper['store'].isEmergencyModalAlreadyDisplayed).toBe(true);
        expect(storeWrapper['store'].showE911Modal).toBe(false);
      });

      it('should merge the E911 flag into existing desktopPreference instead of overwriting it', async () => {
        const mockUserPreference = {
          getUserPreference: jest.fn().mockResolvedValue({
            userId: 'test-preference-user-id',
            preferences: {desktopPreference: JSON.stringify({someOtherSetting: 'value'})},
          }),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn().mockResolvedValue({}),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;
        storeWrapper['store'].agentId = 'test-agent-id';

        await storeWrapper.updateEmergencyModalAcknowledgment();

        expect(mockUserPreference.updateUserPreference).toHaveBeenCalledWith('test-preference-user-id', {
          desktopPreference: JSON.stringify({someOtherSetting: 'value', isEmergencyModalAlreadyDisplayed: true}),
        });
      });

      it('should handle unparsable existing desktopPreference gracefully when merging', async () => {
        const mockUserPreference = {
          getUserPreference: jest.fn().mockResolvedValue({
            userId: 'test-preference-user-id',
            preferences: {desktopPreference: 'invalid-json'},
          }),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn().mockResolvedValue({}),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;
        storeWrapper['store'].agentId = 'test-agent-id';

        await storeWrapper.updateEmergencyModalAcknowledgment();

        expect(storeWrapper['store'].logger.error).toHaveBeenCalledWith(
          'CC-Widgets: updateEmergencyModalAcknowledgment(): failed to parse existing desktopPreference',
          expect.any(Object)
        );
        expect(mockUserPreference.updateUserPreference).toHaveBeenCalledWith('test-preference-user-id', {
          desktopPreference: JSON.stringify({isEmergencyModalAlreadyDisplayed: true}),
        });
      });

      it('should throw error on API failure', async () => {
        const mockError = new Error('Update Error');
        const mockUserPreference = {
          getUserPreference: jest.fn().mockResolvedValue({userId: 'test-preference-user-id'}),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn().mockRejectedValue(mockError),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;

        await expect(storeWrapper.updateEmergencyModalAcknowledgment()).rejects.toThrow('Update Error');
      });

      it('should use the preference service userId, not the CC agentId, when updating', async () => {
        const mockUserPreference = {
          getUserPreference: jest.fn().mockResolvedValue({userId: 'preference-user-id'}),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn().mockResolvedValue({}),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;
        storeWrapper['store'].agentId = 'cc-agent-id';

        await storeWrapper.updateEmergencyModalAcknowledgment();

        expect(mockUserPreference.updateUserPreference).toHaveBeenCalledWith('preference-user-id', expect.any(Object));
        expect(mockUserPreference.updateUserPreference).not.toHaveBeenCalledWith('cc-agent-id', expect.any(Object));
      });

      it('should create a new preference record using the CI user id (not the CC agentId) when the user has none yet (404 on getUserPreference)', async () => {
        const notFoundError = Object.assign(new Error('Not Found'), {statusCode: 404});
        const mockUserPreference = {
          getUserPreference: jest.fn().mockRejectedValue(notFoundError),
          createUserPreference: jest.fn().mockResolvedValue({}),
          updateUserPreference: jest.fn().mockResolvedValue({}),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;
        // agentId (CC identifier) intentionally differs from the CI user id used by the
        // preference service - createUserPreference must use the latter.
        storeWrapper['store'].agentId = 'first-time-agent-id';
        // @ts-expect-error - webex internal device API not typed on IContactCenter
        storeWrapper['store'].cc.webex = {internal: {device: {userId: 'first-time-ci-user-id'}}};

        await storeWrapper.updateEmergencyModalAcknowledgment();

        expect(mockUserPreference.createUserPreference).toHaveBeenCalledWith({
          userId: 'first-time-ci-user-id',
          desktopPreference: JSON.stringify({isEmergencyModalAlreadyDisplayed: true}),
        });
        expect(mockUserPreference.createUserPreference).not.toHaveBeenCalledWith(
          expect.objectContaining({userId: 'first-time-agent-id'})
        );
        expect(mockUserPreference.updateUserPreference).not.toHaveBeenCalled();
        expect(storeWrapper['store'].isEmergencyModalAlreadyDisplayed).toBe(true);
        expect(storeWrapper['store'].showE911Modal).toBe(false);
      });

      it('should rethrow non-404 errors from getUserPreference without creating a record', async () => {
        const mockError = new Error('Server Error');
        const mockUserPreference = {
          getUserPreference: jest.fn().mockRejectedValue(mockError),
          createUserPreference: jest.fn(),
          updateUserPreference: jest.fn(),
        };
        storeWrapper['store'].cc.userPreference = mockUserPreference;

        await expect(storeWrapper.updateEmergencyModalAcknowledgment()).rejects.toThrow('Server Error');

        expect(mockUserPreference.createUserPreference).not.toHaveBeenCalled();
        expect(mockUserPreference.updateUserPreference).not.toHaveBeenCalled();
      });
    });
  });
});
