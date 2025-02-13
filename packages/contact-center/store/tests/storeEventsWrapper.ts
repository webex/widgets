import {act, waitFor} from '@testing-library/react';
import {CC_EVENTS, TASK_EVENTS} from '../src/store.types';
import storeWrapper from '../src/storeEventsWrapper';
import {ITask} from '@webex/plugin-cc';

jest.mock('../src/store', () => ({
  getInstance: jest.fn().mockReturnValue({
    teams: 'mockTeams',
    loginOptions: 'mockLoginOptions',
    cc: {
      on: jest.fn(),
      off: jest.fn(),
    },
    logger: 'mockLogger',
    idleCodes: 'mockIdleCodes',
    agentId: 'mockAgentId',
    wrapupCodes: 'mockWrapupCodes',
    currentTask: 'mockCurrentTask',
    isAgentLoggedIn: false,
    deviceType: 'mockDeviceType',
    taskList: 'mockTaskList',
    incomingTask: 'mockIncomingTask',
    wrapupRequired: 'mockWrapupRequired',
    currentState: 'mockCurrentState',
    lastStateChangeTimestamp: 'mockLastStateChangeTimestamp',
    showMultipleLoginAlert: 'mockShowMultipleLoginAlert',
    currentTheme: 'mockCurrentTheme',
    setShowMultipleLoginAlert: jest.fn(),
    setCurrentState: jest.fn(),
    setLastStateChangeTimestamp: jest.fn(),
    setDeviceType: jest.fn(),
    init: jest.fn().mockResolvedValue({}),
    setIncomingTask: jest.fn(),
    setCurrentTask: jest.fn(),
    setTaskList: jest.fn(),
    setWrapupRequired: jest.fn(),
    setCurrentTheme: jest.fn(),
    setIsAgentLoggedIn: jest.fn(),
  }),
}));

describe('storeEventsWrapper', () => {
  describe('storeEventsWrapper Proxies', () => {
    it('should proxy teams', () => {
      expect(storeWrapper.teams).toBe('mockTeams');
    });

    it('should proxy loginOptions', () => {
      expect(storeWrapper.loginOptions).toBe('mockLoginOptions');
    });

    it('should proxy logger', () => {
      expect(storeWrapper.logger).toBe('mockLogger');
    });

    it('should proxy idleCodes', () => {
      expect(storeWrapper.idleCodes).toBe('mockIdleCodes');
    });

    it('should proxy agentId', () => {
      expect(storeWrapper.agentId).toBe('mockAgentId');
    });

    it('should proxy deviceType', () => {
      expect(storeWrapper.deviceType).toBe('mockDeviceType');
    });

    it('should proxy wrapupCodes', () => {
      expect(storeWrapper.wrapupCodes).toBe('mockWrapupCodes');
    });

    it('should proxy currentTask', () => {
      expect(storeWrapper.currentTask).toBe('mockCurrentTask');
    });

    it('should proxy isAgentLoggedIn', () => {
      expect(storeWrapper.isAgentLoggedIn).toBe(false);
    });

    it('should proxy deviceType', () => {
      expect(storeWrapper.deviceType).toBe('mockDeviceType');
    });

    it('should proxy taskList', () => {
      expect(storeWrapper.taskList).toBe('mockTaskList');
    });

    it('should proxy incomingTask', () => {
      expect(storeWrapper.incomingTask).toBe('mockIncomingTask');
    });

    it('should proxy wrapupRequired', () => {
      expect(storeWrapper.wrapupRequired).toBe('mockWrapupRequired');
    });

    it('should proxy currentState', () => {
      expect(storeWrapper.currentState).toBe('mockCurrentState');
    });

    it('should proxy lastStateChangeTimestamp', () => {
      expect(storeWrapper.lastStateChangeTimestamp).toBe('mockLastStateChangeTimestamp');
    });

    it('should proxy showMultipleLoginAlert', () => {
      expect(storeWrapper.showMultipleLoginAlert).toBe('mockShowMultipleLoginAlert');

      storeWrapper.setShowMultipleLoginAlert(true);
      expect(storeWrapper['store'].setShowMultipleLoginAlert).toHaveBeenCalledWith(true);
    });

    it('should proxy setShowMultipleLoginAlert', () => {
      expect(storeWrapper.setShowMultipleLoginAlert).toBeInstanceOf(Function);

      storeWrapper.setShowMultipleLoginAlert(true);
      expect(storeWrapper['store'].setShowMultipleLoginAlert).toHaveBeenCalledWith(true);
    });

    it('should proxy setCurrentState', () => {
      expect(storeWrapper.setCurrentState).toBeInstanceOf(Function);

      storeWrapper.setCurrentState('newState');
      expect(storeWrapper['store'].setCurrentState).toHaveBeenCalledWith('newState');
    });

    it('should proxy setLastStateChangeTimestamp', () => {
      expect(storeWrapper.setLastStateChangeTimestamp).toBeInstanceOf(Function);

      const timestamp = new Date();
      storeWrapper.setLastStateChangeTimestamp(timestamp);
      expect(storeWrapper['store'].setLastStateChangeTimestamp).toHaveBeenCalledWith(timestamp);
    });

    it('should proxy currentTheme', () => {
      expect(storeWrapper.currentTheme).toBe('mockCurrentTheme');
    });

    it('should proxy setCurrentTheme', () => {
      expect(storeWrapper.setCurrentTheme).toBeInstanceOf(Function);

      storeWrapper.setCurrentTheme('newTheme');
      expect(storeWrapper['store'].setCurrentTheme).toHaveBeenCalledWith('newTheme');
    });

    it('should proxy setIsAgentLoggedIn', () => {
      expect(storeWrapper.setIsAgentLoggedIn).toBeInstanceOf(Function);

      storeWrapper.setIsAgentLoggedIn(false);
      expect(storeWrapper['store'].isAgentLoggedIn).toBe(false);
    });
  });

  describe('storeEventsWrapper', () => {
    const mockTask: ITask = ({
      data: {
        interactionId: 'interaction1',
        interaction: {
          state: 'connected',
        },
      },
      on: jest.fn(),
      off: jest.fn(),
    } as unknown) as ITask;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should initialize the store and set up incoming task handler', async () => {
      const options = {someOption: 'value'};
      await storeWrapper.init(options);

      expect(storeWrapper['store'].init).toHaveBeenCalledWith(options);
      expect(storeWrapper['store'].cc.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
    });

    it('should handle incoming task', () => {
      storeWrapper['store'].taskList = [];
      storeWrapper.handleIncomingTask(mockTask);

      expect(storeWrapper['store'].setIncomingTask).toHaveBeenCalledWith(mockTask);
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(storeWrapper['store'].setTaskList).toHaveBeenCalledWith([mockTask]);
    });

    it('should handle task assignment', () => {
      const handleTaskAssigned = storeWrapper.handleTaskAssigned(mockTask);
      handleTaskAssigned();

      expect(storeWrapper['store'].setCurrentTask).toHaveBeenCalledWith(mockTask);
      expect(storeWrapper['store'].setIncomingTask).toHaveBeenCalledWith(null);
    });

    it('should handle task removal', () => {
      storeWrapper['store'].taskList = [mockTask];
      storeWrapper['store'].currentTask = mockTask;
      storeWrapper['store'].incomingTask = mockTask;
      storeWrapper.handleTaskRemove(mockTask.data.interactionId);

      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));

      expect(storeWrapper['store'].setTaskList).toHaveBeenCalledWith([]);
      expect(storeWrapper['store'].setCurrentTask).toHaveBeenCalledWith(null);
      expect(storeWrapper['store'].setIncomingTask).toHaveBeenCalledWith(null);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(false);
    });

    it('should handle task removal when no task is present', () => {
      storeWrapper['store'].taskList = [];
      storeWrapper['store'].currentTask = null;
      storeWrapper['store'].incomingTask = null;
      storeWrapper.handleTaskRemove(mockTask.data.interactionId);

      expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(storeWrapper['store'].setTaskList).toHaveBeenCalledWith([]);
      expect(storeWrapper['store'].setCurrentTask).not.toHaveBeenCalledWith(null);
      expect(storeWrapper['store'].setIncomingTask).not.toHaveBeenCalledWith(null);
      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(false);
    });

    it('should handle task end', () => {
      storeWrapper.handleTaskEnd(mockTask, true);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(true);

      storeWrapper.handleTaskEnd(mockTask, false);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(true);
    });

    it('should set selected login option', () => {
      const option = 'newLoginOption';
      storeWrapper.setDeviceType(option);

      expect(storeWrapper['store'].setDeviceType).toHaveBeenCalledWith(option);
    });
  });

  describe('storeEventsWrapper events reactions', () => {
    const mockTask: ITask = ({
      data: {
        interactionId: 'interaction1',
        interaction: {
          state: 'connected',
        },
      },
      on: jest.fn(),
      off: jest.fn(),
    } as unknown) as ITask;

    const options = {someOption: 'value'};

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it('should initialize the store and set up event handlers', async () => {
      await storeWrapper.init(options);
      expect(storeWrapper['store'].init).toHaveBeenCalledWith(options);

      expect(storeWrapper['store'].cc.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
      expect(storeWrapper['store'].cc.on).toHaveBeenCalledWith(CC_EVENTS.AGENT_STATE_CHANGE, expect.any(Function));
      expect(storeWrapper['store'].cc.on).toHaveBeenCalledWith(CC_EVENTS.AGENT_MULTI_LOGIN, expect.any(Function));
    });

    it('should handle task:incoming event ', async () => {
      await storeWrapper.init(options);
      storeWrapper['store'].taskList = [];

      act(() => {
        storeWrapper['cc'].on.mock.calls[0][1](mockTask);
      });

      waitFor(() => {
        expect(storeWrapper['store'].setIncomingTask).toHaveBeenCalledWith(mockTask);
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
        expect(storeWrapper['store'].setTaskList).toHaveBeenCalledWith([mockTask]);
      });
    });

    it('should handle task:end event with wrapupRequired', async () => {
      await storeWrapper.init(options);
      storeWrapper['store'].taskList = [];

      //   Incoming task stage: a task has just reached the agent
      act(() => {
        storeWrapper['cc'].on.mock.calls[0][1](mockTask);
      });

      waitFor(() => {
        expect(storeWrapper['store'].setIncomingTask).toHaveBeenCalledWith(mockTask);
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
        expect(storeWrapper['store'].setTaskList).toHaveBeenCalledWith([mockTask]);
      });

      //  The call is answered and the task is assigned to the agent
      act(() => {
        mockTask.on.mock.calls[1][1]();
      });

      waitFor(() => {
        // The task is assigned to the agent
        expect(storeWrapper['store'].setCurrentTask).toHaveBeenCalledWith(mockTask);
        expect(storeWrapper['store'].setIncomingTask).toHaveBeenCalledWith(null);
      });

      //  Task end stage: the task is completed
      act(() => {
        storeWrapper['store'].taskList = [mockTask];
        mockTask.on.mock.calls[0][1]({wrapupRequired: true});
      });

      waitFor(() => {
        expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(true);
        expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
        expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      });
    });

    it('should not add a duplicate task if the same task is present in store', () => {
      storeWrapper['store'].taskList = [mockTask];
      storeWrapper.handleIncomingTask(mockTask);

      expect(storeWrapper['store'].setIncomingTask).toHaveBeenCalledWith(mockTask);
      expect(mockTask.on).not.toHaveBeenCalledWith;
    });

    it('should handle task assignment', () => {
      const handleTaskAssigned = storeWrapper.handleTaskAssigned(mockTask);
      handleTaskAssigned();

      expect(storeWrapper['store'].setCurrentTask).toHaveBeenCalledWith(mockTask);
      expect(storeWrapper['store'].setIncomingTask).toHaveBeenCalledWith(null);
    });

    it('should handle task removal', () => {
      storeWrapper['store'].taskList = [mockTask];
      storeWrapper['store'].currentTask = mockTask;
      storeWrapper['store'].incomingTask = mockTask;
      storeWrapper.handleTaskRemove(mockTask.data.interactionId);

      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(storeWrapper['store'].setTaskList).toHaveBeenCalledWith([]);
      expect(storeWrapper['store'].setCurrentTask).toHaveBeenCalledWith(null);
      expect(storeWrapper['store'].setIncomingTask).toHaveBeenCalledWith(null);
      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(false);
    });

    it('should handle task end', () => {
      storeWrapper.handleTaskEnd(mockTask, true);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(true);

      storeWrapper.handleTaskEnd(mockTask, false);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(true);
    });

    it('should handle task end when call is not connected', () => {
      mockTask.data.interaction.state = 'new';
      storeWrapper['store'].wrapupRequired = false;
      storeWrapper.handleTaskEnd(mockTask, true);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(false);

      storeWrapper.handleTaskEnd(mockTask, false);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(false);

      storeWrapper['store'].wrapupRequired = true;
      storeWrapper.handleTaskEnd(mockTask, true);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(false);
    });

    it('should set selected login option', () => {
      const option = 'newLoginOption';
      storeWrapper.setDeviceType(option);

      expect(storeWrapper['store'].setDeviceType).toHaveBeenCalledWith(option);
    });

    it('should handle multilogin session modal with in correct data', async () => {
      const options = {someOption: 'value'};
      await storeWrapper.init(options);
      act(() => {
        storeWrapper['store'].cc.on.mock.calls[2][1]({});
      });

      expect(storeWrapper['store'].setShowMultipleLoginAlert).not.toHaveBeenCalledWith(true);
    });

    it('should handle multilogin session modal with correct data', async () => {
      const options = {someOption: 'value'};
      await storeWrapper.init(options);
      act(() => {
        storeWrapper['store'].cc.on.mock.calls[2][1]({type: 'AgentMultiLoginCloseSession'});
      });

      expect(storeWrapper['store'].setShowMultipleLoginAlert).toHaveBeenCalledWith(true);
    });

    it('should set selected login option', () => {
      const option = 'newLoginOption';
      storeWrapper.setDeviceType(option);

      expect(storeWrapper['store'].setDeviceType).toHaveBeenCalledWith(option);
    });

    it('should handle state change event  with incorrect data', async () => {
      const options = {someOption: 'value'};
      await storeWrapper.init(options);
      act(() => {
        storeWrapper['store'].cc.on.mock.calls[1][1]({});
      });

      expect(storeWrapper['store'].setCurrentState).not.toHaveBeenCalledWith();
    });

    it('should handle state change event  with correct data and emplty auxcodeId', async () => {
      const options = {someOption: 'value'};
      await storeWrapper.init(options);
      act(() => {
        storeWrapper['store'].cc.on.mock.calls[1][1]({type: 'AgentStateChangeSuccess', auxCodeId: ''});
      });

      expect(storeWrapper['store'].setCurrentState).toHaveBeenCalledWith('0');
    });

    it('should handle state change event  with correct data', async () => {
      const options = {someOption: 'value'};
      await storeWrapper.init(options);
      act(() => {
        storeWrapper['store'].cc.on.mock.calls[1][1]({type: 'AgentStateChangeSuccess', auxCodeId: 'available'});
      });

      expect(storeWrapper['store'].setCurrentState).toHaveBeenCalledWith('available');
    });

    it('should handle hydrating the store with correct data', async () => {
      const options = {someOption: 'value'};
      await storeWrapper.init(options);
      storeWrapper['store'].taskList = [];

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
      };

      act(() => {
        storeWrapper['store'].cc.on.mock.calls[3][1](mockTask);
      });

      expect(storeWrapper['store'].setCurrentTask).toHaveBeenCalledWith(mockTask);
      expect(storeWrapper['store'].setTaskList).toHaveBeenCalledWith([mockTask]);
      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(true);
    });

    it('should return a function to remove event listeners on cc object', () => {
      const removeListeners = storeWrapper.setupIncomingTaskHandler();

      removeListeners();

      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(TASK_EVENTS.TASK_HYDRATE, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(CC_EVENTS.AGENT_STATE_CHANGE, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(CC_EVENTS.AGENT_MULTI_LOGIN, expect.any(Function));
    });
  });
});
