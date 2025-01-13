import { makeAutoObservable } from 'mobx';
import Webex from 'webex';
import store from '../src/store'; // Adjust the import path as necessary

let mockShouldCallback = true;

jest.mock('mobx', () => ({
  makeAutoObservable: jest.fn(),
  observable: { ref: jest.fn() }
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
        error: jest.fn()
      }
    }
  }))
}));

describe('Store', () => {
  let mockWebex;

  beforeEach(() => {
    // Reset teams and loginOptions before each test since store is a singleton
    store.teams = [];
    store.loginOptions = [];
    mockWebex = Webex.init();
    jest.useFakeTimers(); // Use fake timers for testing setTimeout
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers after each test
  });

  it('should initialize with default values', () => {
    expect(store.teams).toEqual([]);
    expect(store.loginOptions).toEqual([]);
    expect(makeAutoObservable).toHaveBeenCalledWith(store, { cc: expect.any(Function) });
  });

  describe('registerCC', () => {
    it('should initialise store values on successful register', async () => {
      const mockResponse = {
        teams: [{ id: 'team1', name: 'Team 1' }],
        loginVoiceOptions: ['option1', 'option2'],
        idleCodes: [{ id: 'code1', name: 'Code 1', isSystem: false, isDefault: false }],
        agentId: 'agent1'
      };
      mockWebex.cc.register.mockResolvedValue(mockResponse);

      await store.registerCC(mockWebex);

      expect(store.teams).toEqual(mockResponse.teams);
      expect(store.loginOptions).toEqual(mockResponse.loginVoiceOptions);
      expect(store.idleCodes).toEqual(mockResponse.idleCodes);
      expect(store.agentId).toEqual(mockResponse.agentId);
    });

    it('should log an error on failed register', async () => {
      const mockError = new Error('Register failed');
      mockWebex.cc.register.mockRejectedValue(mockError);

      try {
        await store.registerCC(mockWebex);
      }
      catch (error) {
        expect(error).toEqual(mockError);
        expect(store.logger.error).toHaveBeenCalledWith("Error registering contact center: Error: Register failed", {
          "method": "registerCC",
          "module": "cc-store#store.ts",
        });
      }
    });
  });

  describe('init', () => {
    it('should call registerCC if webex is in options', async () => {
      const initParams = { webex: mockWebex };
      jest.spyOn(store, 'registerCC').mockResolvedValue();
      Webex.init.mockClear();

      await store.init(initParams);

      expect(store.registerCC).toHaveBeenCalledWith(mockWebex);
      expect(Webex.init).not.toHaveBeenCalled();
    });

    it('should initialize webex and call registerCC on ready event', async () => {
      const initParams = {
        webexConfig: { anyConfig: true },
        access_token: 'fake_token'
      };
      jest.spyOn(store, 'registerCC').mockResolvedValue();

      await store.init(initParams);

      expect(Webex.init).toHaveBeenCalledWith({
        config: initParams.webexConfig,
        credentials: { access_token: initParams.access_token }
      });
      expect(store.registerCC).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should reject the promise if registerCC fails in init method', async () => {
      const initParams = {
        webexConfig: { anyConfig: true },
        access_token: 'fake_token'
      };

      jest.spyOn(store, 'registerCC').mockRejectedValue(new Error('registerCC failed'));

      await expect(store.init(initParams)).rejects.toThrow('registerCC failed');
    });

    it('should reject the promise if Webex SDK fails to initialize', async () => {
      const initParams = {
        webexConfig: { anyConfig: true },
        access_token: 'fake_token'
      };

      mockShouldCallback = false;

      jest.spyOn(store, 'registerCC').mockResolvedValue();

      const initPromise = store.init(initParams);

      jest.runAllTimers(); // Fast-forward the timers to simulate timeout

      await expect(initPromise).rejects.toThrow('Webex SDK failed to initialize');
    });
  });
});