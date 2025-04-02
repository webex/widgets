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
    wrapupCodes: 'mockWrapupCodes',
    currentTask: 'mockCurrentTask',
    isAgentLoggedIn: false,
    deviceType: 'mockDeviceType',
    taskList: 'mockTaskList',
    incomingTask: 'mockIncomingTask',
    wrapupRequired: 'mockWrapupRequired',
    currentState: 'mockCurrentState',
    lastStateChangeTimestamp: 'mockLastStateChangeTimestamp',
    lastIdleCodeChangeTimestamp: 'mockLastIdleCodeChangeTimestamp',
    showMultipleLoginAlert: 'mockShowMultipleLoginAlert',
    currentTheme: 'mockCurrentTheme',
    customState: 'mockCustomState',
    setShowMultipleLoginAlert: jest.fn(),
    setCurrentState: jest.fn(),
    setLastStateChangeTimestamp: jest.fn(),
    setLastIdleCodeChangeTimestamp: jest.fn(),
    setDeviceType: jest.fn(),
    init: jest.fn().mockResolvedValue({}),
    setIncomingTask: jest.fn(),
    setCurrentTask: jest.fn(),
    setTaskList: jest.fn(),
    setWrapupRequired: jest.fn(),
    setCurrentTheme: jest.fn(),
    setIsAgentLoggedIn: jest.fn(),
    registerCC: jest.fn(),
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

    it('should proxy idleCodes and include RONA', () => {
      expect(storeWrapper.idleCodes.length).toBe(2);
      expect(storeWrapper.idleCodes[1].name).toBe('RONA');
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
        cc: {},
        logger: mockLogger,
      });
      expect(mockRegisterCC).toHaveBeenCalledWith({cc: {}, logger: mockLogger});
    });

    it('should setLastStateChangeTimestamp', () => {
      expect(storeWrapper.setLastStateChangeTimestamp).toBeInstanceOf(Function);

      const timestamp = new Date();
      storeWrapper.setLastStateChangeTimestamp(timestamp);
      expect(storeWrapper['store'].lastStateChangeTimestamp).toBe(timestamp);
    });

    it('should setLastIdleCodeChangeTimestamp', () => {
      expect(storeWrapper.setLastIdleCodeChangeTimestamp).toBeInstanceOf(Function);

      const timestamp = new Date();
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
        mockTask = {
          data: {
            interactionId: 'mockTaskId',
          },
          on: jest.fn(),
          off: jest.fn(),
        };
        storeWrapper['store'].taskList = [mockTask];
      });

      it('should set task callback', () => {
        const mockCb = jest.fn();
        expect(storeWrapper.setTaskCallback).toBeInstanceOf(Function);

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
        expect(storeWrapper.removeTaskCallback).toBeInstanceOf(Function);

        storeWrapper.removeTaskCallback('event', mockCb, 'mockTaskId');
        expect(mockTask.off).toHaveBeenCalledWith('event', mockCb);
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
        },
      },
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as ITask;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should initialize the store and set up incoming task handler', async () => {
      const options = {someOption: 'value'};
      await storeWrapper.init(options);

      expect(storeWrapper['store'].init).toHaveBeenCalledWith(options, expect.any(Function));
    });

    it('should handle incoming task', () => {
      const setIncomingTaskSpy = jest.spyOn(storeWrapper, 'setIncomingTask');

      storeWrapper['store'].taskList = [];
      storeWrapper.handleIncomingTask(mockTask);

      expect(setIncomingTaskSpy).toHaveBeenCalledWith(mockTask);
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.AGENT_WRAPPEDUP, expect.any(Function));
    });

    it('should handle task assignment', () => {
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
      const setIncomingTaskSpy = jest.spyOn(storeWrapper, 'setIncomingTask');

      // Why is this, this way?
      storeWrapper.handleTaskAssigned(mockTask);

      expect(setCurrentTaskSpy).toHaveBeenCalledWith(mockTask);
      expect(setIncomingTaskSpy).toHaveBeenCalledWith(null);
    });

    it('should handle task removal', () => {
      const setTaskListSpy = jest.spyOn(storeWrapper, 'setTaskList');
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
      const setIncomingTaskSpy = jest.spyOn(storeWrapper, 'setIncomingTask');
      const setWrapupRequiredSpy = jest.spyOn(storeWrapper, 'setWrapupRequired');

      storeWrapper['store'].taskList = [mockTask];
      storeWrapper['store'].currentTask = mockTask;
      storeWrapper['store'].incomingTask = mockTask;

      storeWrapper.handleTaskRemove(mockTask.data.interactionId);

      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));

      expect(setTaskListSpy).toHaveBeenCalledWith([]);
      expect(setCurrentTaskSpy).toHaveBeenCalledWith(null);
      expect(setIncomingTaskSpy).toHaveBeenCalledWith(null);
      expect(setWrapupRequiredSpy).toHaveBeenCalledWith(false);
    });

    it('should handle task removal when no task is present', () => {
      storeWrapper['store'].taskList = [];
      storeWrapper['store'].currentTask = null;
      storeWrapper['store'].incomingTask = null;
      storeWrapper.handleTaskRemove(mockTask.data.interactionId);

      expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      const setTaskListSpy = jest.spyOn(storeWrapper, 'setTaskList');
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
      const setIncomingTaskSpy = jest.spyOn(storeWrapper, 'setIncomingTask');
      const setWrapupRequiredSpy = jest.spyOn(storeWrapper, 'setWrapupRequired');

      storeWrapper.handleTaskRemove(mockTask.data.interactionId);

      expect(setTaskListSpy).toHaveBeenCalledWith([]);
      expect(setCurrentTaskSpy).not.toHaveBeenCalledWith(null);
      expect(setIncomingTaskSpy).not.toHaveBeenCalledWith(null);
      expect(setWrapupRequiredSpy).toHaveBeenCalledWith(false);
    });

    it('should handle task end', () => {
      const setWrapupRequiredSpy = jest.spyOn(storeWrapper, 'setWrapupRequired');

      storeWrapper.handleTaskEnd(mockTask, true);
      expect(setWrapupRequiredSpy).toHaveBeenCalledWith(true);

      storeWrapper.handleTaskEnd(mockTask, false);
      expect(setWrapupRequiredSpy).toHaveBeenCalledWith(true);
    });

    it('should set selected login option', () => {
      const setDeviceTypeSpy = jest.spyOn(storeWrapper, 'setDeviceType');
      const option = 'newLoginOption';

      storeWrapper.setDeviceType(option);

      expect(setDeviceTypeSpy).toHaveBeenCalledWith(option);
    });

    it('should return buddy agents list', async () => {
      const buddyAgents = [{name: 'agent1'}, {name: 'agent2'}];
      storeWrapper['store'].cc.getBuddyAgents = jest.fn().mockResolvedValue({data: {agentList: buddyAgents}});
      const result = await storeWrapper.getBuddyAgents();
      expect(result).toEqual(buddyAgents);
    });

    it('should handle error in getBuddyAgents and throw error', async () => {
      storeWrapper['store'].cc.getBuddyAgents = jest.fn().mockRejectedValue(new Error('error'));
      await expect(storeWrapper.getBuddyAgents()).rejects.toThrow('error');
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

    const options = {someOption: 'value'};

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

    it('should handle task:incoming event ', async () => {
      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

      await storeWrapper.init(options);
      storeWrapper['store'].taskList = [];

      act(() => {
        storeWrapper['store'].cc.on.mock.calls[0][1](mockTask);
      });

      waitFor(() => {
        expect(storeWrapper.setIncomingTask).toHaveBeenCalledWith(mockTask);
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
        expect(storeWrapper.setTaskList).toHaveBeenCalledWith([mockTask]);
      });
    });

    it('should handle task:end event with wrapupRequired', async () => {
      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

      await storeWrapper.init(options);
      storeWrapper['store'].taskList = [];

      // Login event stag: the agent is logged in
      act(() => {
        storeWrapper['cc'].on.mock.calls[1][1]();
      });

      expect(storeWrapper['cc'].on).toHaveBeenCalledWith(TASK_EVENTS.TASK_HYDRATE, expect.any(Function));
      expect(storeWrapper['cc'].on).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
      expect(storeWrapper['cc'].on).toHaveBeenCalledWith(CC_EVENTS.AGENT_STATE_CHANGE, expect.any(Function));
      expect(storeWrapper['cc'].on).toHaveBeenCalledWith(CC_EVENTS.AGENT_MULTI_LOGIN, expect.any(Function));

      const incomingTaskCb = storeWrapper['cc'].on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_INCOMING)[1];
      //   Incoming task stage: a task has just reached the agent
      act(() => {
        incomingTaskCb(mockTask);
      });

      waitFor(() => {
        expect(storeWrapper.setIncomingTask).toHaveBeenCalledWith(mockTask);
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
        expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
        expect(storeWrapper.setTaskList).toHaveBeenCalledWith([mockTask]);
      });

      //  The call is answered and the task is assigned to the agent
      act(() => {
        mockTask.on.mock.calls[1][1]();
      });

      waitFor(() => {
        // The task is assigned to the agent
        expect(storeWrapper.setCurrentTask).toHaveBeenCalledWith(mockTask);
        expect(storeWrapper.setIncomingTask).toHaveBeenCalledWith(null);
      });

      //  Task end stage: the task is completed
      act(() => {
        storeWrapper['store'].taskList = [mockTask];
        mockTask.on.mock.calls[0][1]({wrapupRequired: true});
      });

      waitFor(() => {
        expect(storeWrapper.setWrapupRequired).toHaveBeenCalledWith(true);
        expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
        expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      });
    });

    it('should handle AgentWrappedUp event ', async () => {
      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

      await storeWrapper.init(options);
      storeWrapper['store'].taskList = [];

      // Login event stag: the agent is logged in
      act(() => {
        storeWrapper['cc'].on.mock.calls[1][1]();
      });

      const incomingTaskCb = storeWrapper['cc'].on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_INCOMING)[1];
      //   Incoming task stage: a task has just reached the agent
      act(() => {
        incomingTaskCb(mockTask);
      });

      // AgentWrappedUp event stage: the agent has wrapped up the task
      act(() => {
        const mockTaskWrappedUpCb = mockTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.AGENT_WRAPPEDUP)[1];
        mockTaskWrappedUpCb(mockTask.data);
      });

      waitFor(() => {
        // The task is assigned to the agent
        expect(storeWrapper.setWrapupRequired).toHaveBeenCalledWith(null);
        expect(storeWrapper.handleTaskRemove).toHaveBeenCalledWith(mockTask.data.interactionId);
      });
    });

    it('should not add a duplicate task if the same task is present in store', () => {
      const setIncomingTaskSpy = jest.spyOn(storeWrapper, 'setIncomingTask');
      storeWrapper['store'].taskList = [mockTask];
      storeWrapper.handleIncomingTask(mockTask);

      expect(setIncomingTaskSpy).not.toHaveBeenCalledWith(mockTask);
      expect(mockTask.on).not.toHaveBeenCalledWith();
    });

    it('should handle task assignment', () => {
      jest.spyOn(storeWrapper, 'setCurrentTask');
      jest.spyOn(storeWrapper, 'setIncomingTask');

      storeWrapper.handleTaskAssigned(mockTask);

      expect(storeWrapper.setCurrentTask).toHaveBeenCalledWith(mockTask);
      expect(storeWrapper.setIncomingTask).toHaveBeenCalledWith(null);
    });

    it('should handle task removal', () => {
      const setTaskListSpy = jest.spyOn(storeWrapper, 'setTaskList');
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
      const setIncomingTaskSpy = jest.spyOn(storeWrapper, 'setIncomingTask');
      const setWrapupRequiredSpy = jest.spyOn(storeWrapper, 'setWrapupRequired');

      storeWrapper['store'].taskList = [mockTask];
      storeWrapper['store'].currentTask = mockTask;
      storeWrapper['store'].incomingTask = mockTask;
      storeWrapper.handleTaskRemove(mockTask.data.interactionId);

      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));

      expect(setTaskListSpy).toHaveBeenCalledWith([]);
      expect(setCurrentTaskSpy).toHaveBeenCalledWith(null);
      expect(setIncomingTaskSpy).toHaveBeenCalledWith(null);
      expect(setWrapupRequiredSpy).toHaveBeenCalledWith(false);
    });

    it('should handle task end', () => {
      jest.spyOn(storeWrapper, 'setWrapupRequired');
      storeWrapper.handleTaskEnd(mockTask, true);

      expect(storeWrapper.setWrapupRequired).toHaveBeenCalledWith(true);

      storeWrapper.handleTaskEnd(mockTask, false);

      expect(storeWrapper.setWrapupRequired).toHaveBeenCalledWith(false);
    });

    it('should handle task end when call is not connected', () => {
      jest.spyOn(storeWrapper, 'setWrapupRequired');
      mockTask.data.interaction.state = 'new';
      storeWrapper['store'].wrapupRequired = false;
      storeWrapper.handleTaskEnd(mockTask, true);

      expect(storeWrapper.setWrapupRequired).toHaveBeenCalledWith(true);

      storeWrapper.handleTaskEnd(mockTask, false);

      expect(storeWrapper.setWrapupRequired).toHaveBeenCalledWith(false);

      storeWrapper['store'].wrapupRequired = true;
      storeWrapper.handleTaskEnd(mockTask, true);

      expect(storeWrapper.setWrapupRequired).toHaveBeenCalledWith(true);
    });

    it('should set selected login option', () => {
      jest.spyOn(storeWrapper, 'setDeviceType');
      const option = 'newLoginOption';
      storeWrapper.setDeviceType(option);

      expect(storeWrapper.setDeviceType).toHaveBeenCalledWith(option);
    });

    it('should handle multilogin session modal with in correct data', async () => {
      jest.spyOn(storeWrapper, 'setShowMultipleLoginAlert');
      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

      const options = {someOption: 'value'};
      await storeWrapper.init(options);

      act(() => {
        cc.on.mock.calls[1][1]({});
      });

      expect(storeWrapper.setShowMultipleLoginAlert).not.toHaveBeenCalledWith(true);
    });

    it('should handle multilogin session modal with correct data', async () => {
      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));
      jest.spyOn(storeWrapper, 'setShowMultipleLoginAlert');

      const options = {someOption: 'value'};
      await storeWrapper.init(options);

      // Login event stag: the agent is logged in
      act(() => {
        storeWrapper['cc'].on.mock.calls[1][1]();
      });

      act(() => {
        const multiLoginCb = storeWrapper['cc'].on.mock.calls.find(
          (call) => call[0] === CC_EVENTS.AGENT_MULTI_LOGIN
        )[1];
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
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));
      jest.spyOn(storeWrapper, 'setCurrentState');

      const options = {someOption: 'value'};
      await storeWrapper.init(options);
      act(() => {
        cc.on.mock.calls[1][1]({});
      });

      expect(storeWrapper.setCurrentState).not.toHaveBeenCalledWith();
    });

    it('should handle state change event  with correct data and emplty auxcodeId', async () => {
      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));
      jest.spyOn(storeWrapper, 'setCurrentState');

      const options = {someOption: 'value'};
      await storeWrapper.init(options);

      act(() => {
        storeWrapper['cc'].on.mock.calls[1][1]();
      });

      act(() => {
        const stateChangeCb = storeWrapper['cc'].on.mock.calls.find(
          (call) => call[0] === CC_EVENTS.AGENT_STATE_CHANGE
        )[1];
        stateChangeCb({type: 'AgentStateChangeSuccess', auxCodeId: ''});
      });

      expect(storeWrapper.setCurrentState).toHaveBeenCalledWith('0');
    });

    it('should handle state change event  with correct data', async () => {
      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));
      jest.spyOn(storeWrapper, 'setCurrentState');

      const options = {someOption: 'value'};
      await storeWrapper.init(options);

      act(() => {
        storeWrapper['cc'].on.mock.calls[1][1]();
      });

      act(() => {
        const stateChangeCb = storeWrapper['cc'].on.mock.calls.find(
          (call) => call[0] === CC_EVENTS.AGENT_STATE_CHANGE
        )[1];
        stateChangeCb({type: 'AgentStateChangeSuccess', auxCodeId: 'available'});
      });

      expect(storeWrapper.setCurrentState).toHaveBeenCalledWith('available');
    });

    it('should handle hydrating the store with correct data', async () => {
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
      const setTaskListSpy = jest.spyOn(storeWrapper, 'setTaskList');
      const setWrapupRequiredSpy = jest.spyOn(storeWrapper, 'setWrapupRequired');
      const handleTaskRemoveSpy = jest.spyOn(storeWrapper, 'handleTaskRemove');

      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

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
        on: jest.fn(),
        off: jest.fn(),
      };

      act(() => {
        storeWrapper['cc'].on.mock.calls[1][1]();
      });

      act(() => {
        const hydrateTaskCb = storeWrapper['cc'].on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_HYDRATE)[1];
        hydrateTaskCb(mockTask);
      });

      expect(setCurrentTaskSpy).toHaveBeenCalledWith(mockTask);
      expect(setTaskListSpy).toHaveBeenCalledWith([mockTask]);
      expect(setWrapupRequiredSpy).toHaveBeenCalledWith(true);

      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.AGENT_WRAPPEDUP, expect.any(Function));
      expect(mockTask.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_REJECT, expect.any(Function));

      act(() => {
        const mockWrapupCb = mockTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.AGENT_WRAPPEDUP)[1];
        mockWrapupCb(mockTask);
      });

      expect(storeWrapper.setWrapupRequired).toHaveBeenCalledWith(false);
      expect(handleTaskRemoveSpy).toHaveBeenCalledWith(mockTask.data.interactionId);
    });

    describe('customStates on hydration', () => {
      it('should handle custom state correctly when wrapup required', async () => {
        const setStateSpy = jest.spyOn(storeWrapper, 'setState');

        const cc = storeWrapper['store'].cc;
        storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

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
          on: jest.fn(),
          off: jest.fn(),
        };

        act(() => {
          storeWrapper['cc'].on.mock.calls[1][1]();
        });

        act(() => {
          const hydrateTaskCb = storeWrapper['cc'].on.mock.calls.find(
            (call) => call[0] === TASK_EVENTS.TASK_HYDRATE
          )[1];
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
        storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

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
          storeWrapper['cc'].on.mock.calls[1][1]();
        });

        act(() => {
          const hydrateTaskCb = storeWrapper['cc'].on.mock.calls.find(
            (call) => call[0] === TASK_EVENTS.TASK_HYDRATE
          )[1];
          hydrateTaskCb(mockTask);
        });

        expect(setStateSpy).toHaveBeenCalledTimes(2);

        expect(setStateSpy).toHaveBeenCalledWith({
          reset: true,
        });
      });
    });

    it('should handle hydrating the store with correct data', async () => {
      const setCurrentTaskSpy = jest.spyOn(storeWrapper, 'setCurrentTask');
      const setTaskListSpy = jest.spyOn(storeWrapper, 'setTaskList');
      const setWrapupRequiredSpy = jest.spyOn(storeWrapper, 'setWrapupRequired');

      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

      const options = {someOption: 'value'};
      await storeWrapper.init(options);
      storeWrapper['store'].taskList = [];

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
        storeWrapper['cc'].on.mock.calls[1][1]();
      });

      act(() => {
        const hydrateTaskCb = storeWrapper['cc'].on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_HYDRATE)[1];
        hydrateTaskCb(mockTask);
      });

      expect(setCurrentTaskSpy).toHaveBeenCalledWith(mockTask);
      expect(setTaskListSpy).toHaveBeenCalledWith([mockTask]);
      expect(setWrapupRequiredSpy).not.toHaveBeenCalledWith();
    });

    it('should remove event listeners on successful logout', async () => {
      const cc = storeWrapper['store'].cc;
      storeWrapper['store'].init = jest.fn().mockReturnValue(storeWrapper.setupIncomingTaskHandler(cc));

      const options = {someOption: 'value'};
      await storeWrapper.init(options);

      act(() => {
        storeWrapper['cc'].on.mock.calls[1][1]();
      });

      act(() => {
        const logOutCb = storeWrapper['cc'].on.mock.calls.find((call) => call[0] === CC_EVENTS.AGENT_LOGOUT_SUCCESS)[1];
        logOutCb();
      });

      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(TASK_EVENTS.TASK_HYDRATE, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(CC_EVENTS.AGENT_STATE_CHANGE, expect.any(Function));
      expect(storeWrapper['cc'].off).toHaveBeenCalledWith(CC_EVENTS.AGENT_MULTI_LOGIN, expect.any(Function));
    });

    it('should handle task rejection event and call onTaskRejected with the provided reason', () => {
      const rejectTask: ITask = {
        data: {interactionId: 'rejectTest', interaction: {state: 'connected'}},
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as ITask;

      const onTaskRejectedMock = jest.fn();
      storeWrapper.setTaskRejected(onTaskRejectedMock);
      const removeSpy = jest.spyOn(storeWrapper, 'handleTaskRemove');
      storeWrapper['store'].taskList = [];

      storeWrapper.handleIncomingTask(rejectTask);
      const taskRejectCall = rejectTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_REJECT);
      expect(taskRejectCall).toBeDefined();
      const rejectCallback = taskRejectCall[1];

      // Simulate rejection event with a specified reason
      const reason = 'Task Rejected Reason';
      rejectCallback({reason});

      expect(onTaskRejectedMock).toHaveBeenCalledWith({reason: reason});
      expect(removeSpy).toHaveBeenCalledWith('rejectTest');
    });
  });
});
