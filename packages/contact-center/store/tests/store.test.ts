import { makeAutoObservable } from 'mobx';
import Webex from 'webex';
import store from '../src/store'; // Adjust the import path as necessary

jest.mock('mobx', () => ({
  makeAutoObservable: jest.fn(),
  observable: { ref: jest.fn() }
}));

jest.mock('webex', () => ({
  init: jest.fn(() => ({
    once: jest.fn((event, callback) => {
      if (event === 'ready') callback();
    }),
    cc: {
      register: jest.fn()
    }
  }))
}));

describe('Store', () => {
  let mockWebex;

  beforeEach(() => {
    // Reset teams and loginOptions before each test since store is a singleton
    store.teams = [];
    store.loginOptions = [];
    mockWebex = {
      cc: {
        register: jest.fn()
      }
    };
  });

  it('should initialize with default values', () => {
    expect(store.teams).toEqual([]);
    expect(store.loginOptions).toEqual([]);
    expect(makeAutoObservable).toHaveBeenCalledWith(store, { cc: expect.any(Function) });
  });

  describe('registerCC', () => {
    it('should set teams and loginOptions on successful register', async () => {
      const mockResponse = {
        teams: [{ id: 'team1', name: 'Team 1' }],
        loginVoiceOptions: ['option1', 'option2']
      };
      mockWebex.cc.register.mockResolvedValue(mockResponse);

      await store.registerCC(mockWebex);

      expect(store.teams).toEqual(mockResponse.teams);
      expect(store.loginOptions).toEqual(mockResponse.loginVoiceOptions);
    });

    it('should log an error on failed register', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockError = new Error('Register failed');
      mockWebex.cc.register.mockRejectedValue(mockError);

      try {
        await store.registerCC(mockWebex);
      }
      catch (error) {
        expect(error).toEqual(mockError);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error registering contact center', mockError);
        consoleErrorSpy.mockRestore();
      }
    });

    it('should log an error on failed register', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockError = new Error('Register failed');
      mockWebex.cc.register.mockRejectedValue(mockError);
      // Store initial state
      const initialTeams = [...store.teams];
      const initialLoginOptions = [...store.loginOptions];
      try {
        await store.registerCC(mockWebex);
      }
      catch (error) {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error registering contact center', mockError);
        expect(store.teams).toEqual(initialTeams);
        expect(store.loginOptions).toEqual(initialLoginOptions);
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('init', () => {
    it('should call registerCC if webex is in options', async () => {
      const initParams = { webex: mockWebex };
      jest.spyOn(store, 'registerCC').mockResolvedValue();

      await store.init(initParams);

      expect(store.registerCC).toHaveBeenCalledWith(mockWebex);
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
  });
});
