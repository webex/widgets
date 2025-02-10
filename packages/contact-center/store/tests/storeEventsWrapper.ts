import {act, waitFor} from '@testing-library/react';
import {TASK_EVENTS} from '../src/store.types';
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
    selectedLoginOption: 'mockSelectedLoginOption',
    wrapupCodes: 'mockWrapupCodes',
    currentTask: 'mockCurrentTask',
    isAgentLoggedIn: 'mockIsAgentLoggedIn',
    deviceType: 'mockDeviceType',
    taskList: 'mockTaskList',
    incomingTask: 'mockIncomingTask',
    wrapupRequired: 'mockWrapupRequired',
    setSelectedLoginOption: jest.fn(),
    init: jest.fn().mockResolvedValue({}),
    setIncomingTask: jest.fn(),
    setCurrentTask: jest.fn(),
    setTaskList: jest.fn(),
    setWrapupRequired: jest.fn(),
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

    it.skip('should proxy cc', () => {
      expect(storeWrapper.cc).toBe({
        on: jest.fn(),
        off: jest.fn(),
      });
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

    it('should proxy selectedLoginOption', () => {
      expect(storeWrapper.selectedLoginOption).toBe('mockSelectedLoginOption');
    });

    it('should proxy wrapupCodes', () => {
      expect(storeWrapper.wrapupCodes).toBe('mockWrapupCodes');
    });

    it('should proxy currentTask', () => {
      expect(storeWrapper.currentTask).toBe('mockCurrentTask');
    });

    it('should proxy isAgentLoggedIn', () => {
      expect(storeWrapper.isAgentLoggedIn).toBe('mockIsAgentLoggedIn');
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
  });

  describe('storeEventsWrapper', () => {
    const mockTask: ITask = ({
      data: {
        interactionId: 'interaction1',
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
      storeWrapper.handleTaskRemove(mockTask.data.interactionId);

      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(storeWrapper['store'].setTaskList).toHaveBeenCalledWith([]);
      expect(storeWrapper['store'].setCurrentTask).toHaveBeenCalledWith(null);
      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(false);
    });

    it('should handle task removal when no task is present', () => {
      storeWrapper['store'].taskList = [];
      storeWrapper.handleTaskRemove(mockTask.data.interactionId);

      expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).not.toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(storeWrapper['store'].setTaskList).toHaveBeenCalledWith([]);
      expect(storeWrapper['store'].setCurrentTask).toHaveBeenCalledWith(null);
      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(false);
    });

    it('should handle task end', () => {
      storeWrapper.handleTaskEnd(mockTask.data.interactionId, true);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(true);

      storeWrapper.handleTaskEnd(mockTask.data.interactionId, false);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(false);
    });

    it('should set selected login option', () => {
      const option = 'newLoginOption';
      storeWrapper.setSelectedLoginOption(option);

      expect(storeWrapper['store'].setSelectedLoginOption).toHaveBeenCalledWith(option);
    });
  });

  describe('storeEventsWrapper events reactions', () => {
    const mockTask: ITask = ({
      data: {
        interactionId: 'interaction1',
      },
      on: jest.fn(),
      off: jest.fn(),
    } as unknown) as ITask;

    const options = {someOption: 'value'};

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it('should initialize the store and set up incoming task handler', async () => {
      await storeWrapper.init(options);
      expect(storeWrapper['store'].init).toHaveBeenCalledWith(options);
      expect(storeWrapper['store'].cc.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
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
      storeWrapper.handleTaskRemove(mockTask.data.interactionId);

      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(mockTask.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
      expect(storeWrapper['store'].setTaskList).toHaveBeenCalledWith([]);
      expect(storeWrapper['store'].setCurrentTask).toHaveBeenCalledWith(null);
      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(false);
    });

    it('should handle task end', () => {
      storeWrapper.handleTaskEnd(mockTask.data.interactionId, true);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(true);

      storeWrapper.handleTaskEnd(mockTask.data.interactionId, false);

      expect(storeWrapper['store'].setWrapupRequired).toHaveBeenCalledWith(false);
    });

    it('should set selected login option', () => {
      const option = 'newLoginOption';
      storeWrapper.setSelectedLoginOption(option);

      expect(storeWrapper['store'].setSelectedLoginOption).toHaveBeenCalledWith(option);
    });
  });
});
