import {makeAutoObservable} from 'mobx';
import Webex from 'webex';
import store from '../src/store'; // Adjust the import path as necessary

let mockShouldCallback = true;

jest.mock('mobx', () => ({
  makeAutoObservable: jest.fn(),
  observable: {ref: jest.fn()},
}));

jest.mock('webex', () => ({
  init: jest.fn(() => ({
    once: jest.fn((event, callback) => {
      if (event === 'ready' && mockShouldCallback) {
        callback();
      }
    }),
    cc: {
      register: jest.fn(),
      LoggerProxy: {
        error: jest.fn(),
      },
    },
  })),
}));

describe('Store', () => {
  let mockWebex;
  let storeInstance;

  beforeEach(() => {
    // Reset store values before each test since store is a singleton
    storeInstance = store.getInstance();
    mockWebex = Webex.init();
    jest.useFakeTimers(); // Use fake timers for testing setTimeout
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers after each test
  });

  it('should initialize with default values', () => {
    expect(storeInstance.teams).toEqual([]);
    expect(storeInstance.loginOptions).toEqual([]);
    expect(storeInstance.idleCodes).toEqual([]);
    expect(storeInstance.agentId).toBe('');
    expect(storeInstance.selectedLoginOption).toBe('');
    expect(storeInstance.wrapupCodes).toEqual([]);
    expect(storeInstance.incomingTask).toBeNull();
    expect(storeInstance.currentTask).toBeNull();
    expect(storeInstance.isAgentLoggedIn).toBe(false);
    expect(storeInstance.deviceType).toBe('');
    expect(storeInstance.taskList).toEqual([]);
    expect(storeInstance.wrapupRequired).toBe(false);

    expect(makeAutoObservable).toHaveBeenCalledWith(storeInstance, {
      cc: expect.any(Function),
      currentTask: expect.any(Object),
      incomingTask: expect.any(Object),
      taskList: expect.any(Object),
      wrapupRequired: expect.any(Object),
    });
  });

  describe('registerCC', () => {
    it('should initialise store values on successful register', async () => {
      const mockResponse = {
        teams: [{id: 'team1', name: 'Team 1'}],
        loginVoiceOptions: ['option1', 'option2'],
        idleCodes: [{id: 'code1', name: 'Code 1', isSystem: false, isDefault: false}],
        agentId: 'agent1',
        isAgentLoggedIn: true,
        deviceType: 'BROWSER',
      };
      mockWebex.cc.register.mockResolvedValue(mockResponse);

      await storeInstance.registerCC(mockWebex);

      expect(storeInstance.teams).toEqual(mockResponse.teams);
      expect(storeInstance.loginOptions).toEqual(mockResponse.loginVoiceOptions);
      expect(storeInstance.idleCodes).toEqual(mockResponse.idleCodes);
      expect(storeInstance.agentId).toEqual(mockResponse.agentId);
      expect(storeInstance.isAgentLoggedIn).toEqual(mockResponse.isAgentLoggedIn);
      expect(storeInstance.deviceType).toEqual(mockResponse.deviceType);
    });

    it('should log an error on failed register', async () => {
      const mockError = new Error('Register failed');
      mockWebex.cc.register.mockRejectedValue(mockError);

      try {
        await storeInstance.registerCC(mockWebex);
      } catch (error) {
        expect(error).toEqual(mockError);
        expect(storeInstance.logger.error).toHaveBeenCalledWith(
          'Error registering contact center: Error: Register failed',
          {
            method: 'registerCC',
            module: 'cc-store#store.ts',
          }
        );
      }
    });
  });

  describe('init', () => {
    it('should call registerCC if webex is in options', async () => {
      const initParams = {webex: mockWebex};
      jest.spyOn(storeInstance, 'registerCC').mockResolvedValue();
      Webex.init.mockClear();

      await storeInstance.init(initParams);

      expect(storeInstance.registerCC).toHaveBeenCalledWith(mockWebex);
      expect(Webex.init).not.toHaveBeenCalled();
    });

    it('should initialize webex and call registerCC on ready event', async () => {
      const initParams = {
        webexConfig: {anyConfig: true},
        access_token: 'fake_token',
      };
      jest.spyOn(storeInstance, 'registerCC').mockResolvedValue();

      await storeInstance.init(initParams);

      expect(Webex.init).toHaveBeenCalledWith({
        config: initParams.webexConfig,
        credentials: {access_token: initParams.access_token},
      });
      expect(storeInstance.registerCC).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should reject the promise if registerCC fails in init method', async () => {
      const initParams = {
        webexConfig: {anyConfig: true},
        access_token: 'fake_token',
      };

      jest.spyOn(storeInstance, 'registerCC').mockRejectedValue(new Error('registerCC failed'));

      await expect(storeInstance.init(initParams)).rejects.toThrow('registerCC failed');
    });

    it('should reject the promise if Webex SDK fails to initialize', async () => {
      const initParams = {
        webexConfig: {anyConfig: true},
        access_token: 'fake_token',
      };

      mockShouldCallback = false;

      jest.spyOn(storeInstance, 'registerCC').mockResolvedValue();

      const initPromise = storeInstance.init(initParams);

      jest.runAllTimers(); // Fast-forward the timers to simulate timeout

      await expect(initPromise).rejects.toThrow('Webex SDK failed to initialize');
    });

    it('should set states when called through setters', () => {
      storeInstance.setIncomingTask('task1');
      expect(storeInstance.incomingTask).toBe('task1');

      storeInstance.setCurrentTask('task2');
      expect(storeInstance.currentTask).toBe('task2');

      storeInstance.setWrapupRequired(true);
      expect(storeInstance.wrapupRequired).toBe(true);

      storeInstance.setTaskList(['task3']);
      expect(storeInstance.taskList).toEqual(['task3']);

      storeInstance.setSelectedLoginOption('option1');
      expect(storeInstance.selectedLoginOption).toBe('option1');
    });
  });
});
