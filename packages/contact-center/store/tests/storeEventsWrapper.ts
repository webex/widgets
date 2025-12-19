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
import storeWrapper from '../src/storeEventsWrapper';
import {ITask} from '@webex/contact-center';
import {
  mockCC,
  mockTask as mockTaskFixture,
  mockEntryPointsResponse,
  mockAddressBookEntriesResponse,
  mockQueueDetails,
} from '@webex/test-fixtures';

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
    customState: 'mockCustomState',
    consultStartTimeStamp: null,
    callControlAudio: null,
    isQueueConsultInProgress: false,
    currentConsultQueueId: null,
    isEndConsultEnabled: true,
    allowConsultToQueue: false,
    isDeclineButtonEnabled: false,
    setShowMultipleLoginAlert: jest.fn(),
    setCurrentState: jest.fn(),
    setLastStateChangeTimestamp: jest.fn(),
    setLastIdleCodeChangeTimestamp: jest.fn(),
    setDeviceType: jest.fn(),
    setDialNumber: jest.fn(),
    setTeamId: jest.fn(),
    init: jest.fn().mockResolvedValue({}),
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
      const mockCurrentTask = {
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
      } as ITask;
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

        storeWrapper.removeTaskCallback(TASK_EVENTS.AGENT_WRAPPEDUP, mockCb, 'mockTaskId');
        expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.AGENT_WRAPPEDUP, mockCb);
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
    const mockTask: ITask = {
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
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as ITask;

    beforeEach(() => {
      jest.clearAllMocks();
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
      const mockTask2: ITask = {
        data: {
          interactionId: 'interaction1',
          interaction: {
            state: 'new',
          },
          agentId: 'agent1',
          // Note: mockTask2 doesn't have hasJoined: true to simulate an incoming task
        },
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;

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
      };

      storeWrapper['store'].taskList = {interaction2: mockTaskWithJoined};
      storeWrapper.setCurrentTask(mockTaskWithJoined);

      // Call the method under test
      storeWrapper.handleIncomingTask(mockTask2);
      expect(mockIncomingTaskCallback).toHaveBeenCalledWith({task: mockTask2});

      // Verify that the correct event handlers were registered
      // Note: currentTask should remain as mockTaskWithJoined because incoming tasks are not set as current
      expect(storeWrapper.currentTask).toBeTruthy();
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.AGENT_CONSULT_CREATED, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_MEDIA, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULTING, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_ACCEPTED, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_END, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.AGENT_WRAPPEDUP, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_AUTO_ANSWERED, expect.any(Function));
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_HOLD, storeWrapper.refreshTaskList);
      expect(mockTask2.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_RESUME, storeWrapper.refreshTaskList);
    });

    it('should handle consulting i.e handleIncomingTask with the task already present in the taskList', () => {
      const mockIncomingTaskCallback = jest.fn();
      storeWrapper.setIncomingTaskCb(mockIncomingTaskCallback);
      // Ensure mockTask is properly set up
      const mockTask: ITask = {
        data: {
          interactionId: 'interaction1',
          interaction: {
            state: 'connected',
          },
        },
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;

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
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.AGENT_CONSULT_CREATED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_MEDIA, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULTING, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_ACCEPTED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_END, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.AGENT_WRAPPEDUP, expect.any(Function));
    });

    it('should handle incoming call without onIncomingTask callback', () => {
      const mockIncomingTaskCallback = jest.fn();
      storeWrapper.setIncomingTaskCb(undefined);
      // Ensure mockTask is properly set up
      const mockTask: ITask = {
        data: {
          interactionId: 'interaction1',
          interaction: {
            state: 'connected',
          },
        },
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;

      // Add the mock task to the task list
      storeWrapper['store'].taskList = {interaction1: mockTask};

      // Call the method under test
      storeWrapper.handleIncomingTask(mockTask);
      expect(mockIncomingTaskCallback).not.toHaveBeenCalledWith(mockTask);

      // Verify that the correct event handlers were registered
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.AGENT_CONSULT_CREATED, expect.any(Function));
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
      const buddyAgents = [{name: 'agent1'}, {name: 'agent2'}];
      storeWrapper['store'].cc.getBuddyAgents = jest.fn().mockResolvedValue({data: {agentList: buddyAgents}});
      const result = await storeWrapper.getBuddyAgents('telephony');
      expect(result).toEqual(buddyAgents);
    });

    it('should handle error in getBuddyAgents and throw error', async () => {
      storeWrapper['store'].cc.getBuddyAgents = jest.fn().mockRejectedValue(new Error('error'));
      await expect(storeWrapper.getBuddyAgents('telephony')).rejects.toThrow('error');
    });

    it('should return contact service queues list', async () => {
      const queueList = [
        {id: 'queue1', name: 'Queue 1', channelType: 'TELEPHONY'},
        {id: 'queue2', name: 'Queue 2', channelType: 'TELEPHONY'},
        {id: 'queue3', name: 'Queue 3', channelType: 'CHAT'}, // This one should be filtered out
      ];
      storeWrapper['store'].cc.getQueues = jest.fn().mockResolvedValue(queueList);

      const result = await storeWrapper.getQueues('telephony');

      expect(result.data).toEqual([
        {id: 'queue1', name: 'Queue 1', channelType: 'TELEPHONY'},
        {id: 'queue2', name: 'Queue 2', channelType: 'TELEPHONY'},
      ]);
      expect(storeWrapper['store'].cc.getQueues).toHaveBeenCalled();
    });

    it('should handle error in getQueues and throw error', async () => {
      storeWrapper['store'].cc.getQueues = jest.fn().mockRejectedValue(new Error('queue error'));

      await expect(storeWrapper.getQueues('telephony')).rejects.toThrow('queue error');
    });

    it('should return contact service queues list when SDK returns paginated response', async () => {
      const queueList = [
        {...mockQueueDetails[0], channelType: 'TELEPHONY'},
        {...mockQueueDetails[1], channelType: 'CHAT'},
      ];
      storeWrapper['store'].cc.getQueues = jest
        .fn()
        .mockResolvedValue({data: queueList, meta: {page: 1, pageSize: 50, total: 2, totalPages: 1}});

      const result = await storeWrapper.getQueues('telephony');

      expect(result.data).toEqual([{...mockQueueDetails[0], channelType: 'TELEPHONY'}]);
      expect(storeWrapper['store'].cc.getQueues).toHaveBeenCalled();
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
  });

  describe('storeEventsWrapper events reactions', () => {
    const mockTask: ITask = {
      data: {
        interactionId: 'interaction1',
        interaction: {
          state: 'connected',
        },
      },
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as ITask;

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
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

      await storeWrapper.init(options);

      expect(storeWrapper['store'].init).toHaveBeenCalledWith(options, expect.any(Function));

      expect(cc.on).toHaveBeenCalledWith(CC_EVENTS.AGENT_DN_REGISTERED, expect.any(Function));
      expect(cc.on).toHaveBeenCalledWith(CC_EVENTS.AGENT_RELOGIN_SUCCESS, expect.any(Function));
    });

    it('should set agentProfile on Relogin and Login', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(storeWrapper['cc'], 'on');
      const setAgentProfileSpy = jest.spyOn(storeWrapper, 'setAgentProfile');
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

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
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

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
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

      await storeWrapper.init(options);

      // Login event stag: the agent is logged in
      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_HYDRATE, expect.any(Function));
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
        mockTaskOnSpy.mock.calls[1][1]();
      });

      waitFor(() => {
        // The task is assigned to the agent
        expect(storeWrapper.setCurrentTask).toHaveBeenCalledWith(mockTask);
      });

      //  Task end stage: the task is completed
      act(() => {
        mockTaskOnSpy.mock.calls[0][1]({wrapupRequired: true});
      });

      waitFor(() => {
        expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
        expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      });
    });

    it('should handle AgentWrappedUp event ', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(storeWrapper['cc'], 'on');
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

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
        const mockTaskWrappedUpCb = mockTaskOnSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.AGENT_WRAPPEDUP)[1];
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
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));
      await storeWrapper.init(options);

      act(() => {
        onSpy.mock.calls[1][1]({});
      });

      expect(storeWrapper.setShowMultipleLoginAlert).not.toHaveBeenCalledWith(true);
    });

    it('should handle multilogin session modal with correct data', async () => {
      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(cc, 'on');
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));
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
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));
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
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));
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
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));
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
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

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
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.AGENT_WRAPPEDUP, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_REJECT, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_OUTDIAL_FAILED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_HOLD, storeWrapper.refreshTaskList);
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_RESUME, storeWrapper.refreshTaskList);

      // Simulate task removal from task manager after wrapup
      storeWrapper['store'].cc.taskManager.getAllTasks = jest.fn().mockReturnValue({});

      act(() => {
        const mockWrapupCb = mockTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.AGENT_WRAPPEDUP)[1];
        mockWrapupCb(mockTask);
      });

      expect(handleTaskRemoveSpy).toHaveBeenCalledWith(mockTask);
    });

    it('should handle task merged event', async () => {
      const onSpy = jest.spyOn(storeWrapper['cc'], 'on');
      const refreshTaskListSpy = jest.spyOn(storeWrapper, 'refreshTaskList');

      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

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
      expect(mockMergedTask.on).toHaveBeenCalledWith(TASK_EVENTS.AGENT_WRAPPEDUP, expect.any(Function));
      expect(mockMergedTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_REJECT, expect.any(Function));
      expect(mockMergedTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_OUTDIAL_FAILED, expect.any(Function));
    });

    describe('customStates on hydration', () => {
      it('should handle custom state correctly when wrapup required', async () => {
        const setStateSpy = jest.spyOn(storeWrapper, 'setState');

        const cc = storeWrapper['store'].cc;
        const onSpy = jest.spyOn(cc, 'on');
        storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

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
        const cc = storeWrapper['store'].cc;
        const onSpy = jest.spyOn(cc, 'on');

        // Set the store's agentId to match the task's agentId
        storeWrapper['store'].agentId = 'agent1';
        storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));
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

    it('should handle hydrating the store with correct data', async () => {
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
      const refreshTaskListSpy = jest.spyOn(storeWrapper, 'refreshTaskList');

      const cc = storeWrapper['store'].cc;
      const onSpy = jest.spyOn(cc, 'on');
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

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
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));
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
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(TASK_EVENTS.TASK_MERGED, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(CC_EVENTS.AGENT_STATE_CHANGE, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(CC_EVENTS.AGENT_MULTI_LOGIN, expect.any(Function));
      expect(setAgentProfileSpy).toHaveBeenCalledWith({});
      expect(storeWrapper['store'].agentProfile).toEqual({});
    });

    it('should handle task rejection event and call onTaskRejected with the provided reason', () => {
      const rejectTask: ITask = {
        data: {interactionId: 'rejectTest', interaction: {state: 'connected'}},
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;

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
      const rejectTask: ITask = {
        data: {interactionId: 'rejectTest', interaction: {state: 'connected'}},
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;
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
      const outdialTask: ITask = {
        data: {interactionId: 'outdialTest', interaction: {state: 'connected'}},
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;

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
      const mockTask: ITask = {
        data: {
          interactionId: 'interaction1',
          interaction: {
            state: 'connected',
          },
        },
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;

      storeWrapper['store'].taskList = {};
      storeWrapper.handleIncomingTask(mockTask);

      // Verify the TASK_CONSULT_QUEUE_CANCELLED handler was registered
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, expect.any(Function));
    });

    it('should register TASK_AUTO_ANSWERED handler on incoming task', () => {
      const mockTask: ITask = {
        data: {
          interactionId: 'interaction1',
          interaction: {
            state: 'connected',
          },
        },
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;

      storeWrapper['store'].taskList = {};
      storeWrapper.handleIncomingTask(mockTask);

      // Verify the TASK_AUTO_ANSWERED handler was registered
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_AUTO_ANSWERED, expect.any(Function));
    });

    it('should handle auto answer event and enable decline button', () => {
      const autoAnswerTask: ITask = {
        data: {interactionId: 'autoAnswerTest', interaction: {state: 'connected'}},
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;

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
    const mockTask: ITask = {
      data: {
        interactionId: 'interaction1',
        interaction: {
          state: 'connected',
        },
      },
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as ITask;

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
      mockTaskA = {
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
      } as ITask;
      mockTaskB = {
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
      } as ITask;
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
      const incomingTask: ITask = {
        data: {
          interactionId: 'incomingTask',
          interaction: {
            state: 'new',
            // Note: no participants or hasJoined property to simulate incoming task
          },
          agentId: 'agent1',
        },
      } as ITask;

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
      const taskWithoutJoined: ITask = {
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
      } as ITask;

      // Try to set the task without joined as current task
      storeWrapper.setCurrentTask(taskWithoutJoined);

      // Current task should remain unchanged (still mockTaskA)
      expect(storeWrapper.currentTask).toEqual(mockTaskA);
      expect(storeWrapper.currentTask).not.toEqual(taskWithoutJoined);
    });
  });
});
