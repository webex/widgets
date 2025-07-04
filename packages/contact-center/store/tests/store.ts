import {makeAutoObservable} from 'mobx';
import Webex from '@webex/plugin-cc';
import store from '../src/store'; // Adjust the import path as necessary
import {IStore} from '../src/store.types';
import {mockProfile} from '../src/store.fixtures';

let mockShouldCallback = true;
let webexInitSpy;
console.log = jest.fn(); // Mock console.log

jest.mock('mobx', () => ({
  makeAutoObservable: jest.fn(),
  observable: {ref: jest.fn()},
}));

jest.mock('@webex/plugin-cc', () => ({
  init: jest.fn(() => ({
    once: jest.fn((event, callback) => {
      if (event === 'ready' && mockShouldCallback) {
        callback();
      }
    }),
    cc: {
      register: jest.fn().mockResolvedValue(mockProfile),
      LoggerProxy: {
        error: jest.fn(),
        log: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
      },
    },
  })),
}));

describe('Store', () => {
  let mockWebex;
  let storeInstance: IStore;

  beforeEach(() => {
    // Reset store values before each test since store is a singleton
    storeInstance = store.getInstance();
    //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
    mockWebex = Webex.init({
      config: {anyConfig: true},
      credentials: {
        access_token: 'fake_token',
      },
    });

    //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
    webexInitSpy = jest.spyOn(Webex, 'init');
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
      const date = new Date().getTime();
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
          'CC-Widgets: Contact-center registerCC(): failed - Error: Register failed',
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
      webexInitSpy.mockClear();

      await storeInstance.init(initParams, eventListenerCallback);

      expect(eventListenerCallback).toHaveBeenCalled();
      expect(storeInstance.registerCC).toHaveBeenCalledWith(mockWebex);
      expect(webexInitSpy).not.toHaveBeenCalled();
    });

    it('should call registerCC if webex is in options', async () => {
      const initParams = {webex: mockWebex};
      jest.spyOn(storeInstance, 'registerCC').mockResolvedValue();
      webexInitSpy.mockClear();

      await storeInstance.init(initParams, jest.fn());

      expect(storeInstance.registerCC).toHaveBeenCalledWith(mockWebex);
      expect(webexInitSpy).not.toHaveBeenCalled();
    });

    it('should initialize webex and call registerCC on ready event', async () => {
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      webexInitSpy = jest.spyOn(Webex, 'init').mockReturnValue(mockWebex);
      jest.spyOn(storeInstance, 'registerCC').mockClear();

      const initParams = {
        webexConfig: {anyConfig: true},
        access_token: 'fake_token',
      };

      await storeInstance.init(initParams, jest.fn());

      expect(webexInitSpy).toHaveBeenCalledWith({
        config: initParams.webexConfig,
        credentials: {access_token: initParams.access_token},
      });

      expect(storeInstance.registerCC).toHaveBeenCalledWith(mockWebex);
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

      const initPromise = storeInstance.init(initParams, jest.fn());

      jest.runAllTimers(); // Fast-forward the timers to simulate timeout

      await expect(initPromise).rejects.toThrow('Webex SDK failed to initialize');
    });
  });
});
