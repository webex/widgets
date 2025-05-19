import {makeAutoObservable} from 'mobx';
import Webex from 'webex/contact-center';
import store from '../src/store'; // Adjust the import path as necessary

let mockShouldCallback = true;
console.log = jest.fn(); // Mock console.log

jest.mock('mobx', () => ({
  makeAutoObservable: jest.fn(),
  observable: {ref: jest.fn()},
}));

jest.mock('webex/contact-center', () => ({
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
    expect(storeInstance.wrapupCodes).toEqual([]);
    expect(storeInstance.currentTask).toBeNull();
    expect(storeInstance.isAgentLoggedIn).toBe(false);
    expect(storeInstance.deviceType).toBe('');
    expect(storeInstance.taskList).toEqual({});
    expect(storeInstance.agentProfile).toEqual({});

    expect(makeAutoObservable).toHaveBeenCalledWith(storeInstance, {
      cc: expect.any(Function),
    });
  });

  describe('registerCC', () => {
    it('should initialise store values on successful register', async () => {
      const mockAgentName = 'John Doe';
      const date = new Date();
      const mockResponse = {
        teams: [{id: 'team1', name: 'Team 1'}],
        loginVoiceOptions: ['option1', 'option2'],
        idleCodes: [{id: 'code1', name: 'Code 1', isSystem: false, isDefault: false}],
        agentId: 'agent1',
        isAgentLoggedIn: true,
        deviceType: 'BROWSER',
        dialNumber: '12345',
        lastStateAuxCodeId: 'auxCodeId',
        lastStateChangeTimestamp: date,
        agentName: mockAgentName,
      };
      mockWebex.cc.register.mockResolvedValue(mockResponse);

      await storeInstance.registerCC(mockWebex);

      expect(storeInstance.teams).toEqual(mockResponse.teams);
      expect(storeInstance.loginOptions).toEqual(mockResponse.loginVoiceOptions);
      expect(storeInstance.idleCodes).toEqual(mockResponse.idleCodes);
      expect(storeInstance.agentId).toEqual(mockResponse.agentId);
      expect(storeInstance.isAgentLoggedIn).toEqual(mockResponse.isAgentLoggedIn);
      expect(storeInstance.deviceType).toEqual(mockResponse.deviceType);
      expect(storeInstance.currentState).toEqual(mockResponse.lastStateAuxCodeId);
      expect(storeInstance.lastStateChangeTimestamp).toEqual(date);
      expect(storeInstance.agentProfile).toEqual({agentName: mockAgentName});
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

    it('should throw error if webex and cc object are not present', async () => {
      try {
        storeInstance.cc = undefined;
        await storeInstance.registerCC(undefined);
      } catch (error) {
        expect(error.message).toEqual('Webex SDK not initialized');
      }
    });
  });

  describe('init', () => {
    it('should call eventListenerCallback ', async () => {
      const eventListenerCallback = jest.fn();
      const initParams = {webex: mockWebex};

      jest.spyOn(storeInstance, 'registerCC').mockResolvedValue();
      Webex.init.mockClear();

      await storeInstance.init(initParams, eventListenerCallback);

      expect(eventListenerCallback).toHaveBeenCalled();
      expect(storeInstance.registerCC).toHaveBeenCalledWith(mockWebex);
      expect(Webex.init).not.toHaveBeenCalled();
    });

    it('should call registerCC if webex is in options', async () => {
      const initParams = {webex: mockWebex};
      jest.spyOn(storeInstance, 'registerCC').mockResolvedValue();
      Webex.init.mockClear();

      await storeInstance.init(initParams, jest.fn());

      expect(storeInstance.registerCC).toHaveBeenCalledWith(mockWebex);
      expect(Webex.init).not.toHaveBeenCalled();
    });

    it('should initialize webex and call registerCC on ready event', async () => {
      const initParams = {
        webexConfig: {anyConfig: true},
        access_token: 'fake_token',
      };
      jest.spyOn(storeInstance, 'registerCC').mockResolvedValue();

      await storeInstance.init(initParams, jest.fn());

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

      await expect(storeInstance.init(initParams, jest.fn())).rejects.toThrow('registerCC failed');
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
  });
});
