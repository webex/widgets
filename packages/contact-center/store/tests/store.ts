import store from '../src/store';
import Webex from 'webex';
import { IAgentProfile } from '@webex/plugin-cc';

// Mock Webex and its methods
jest.mock('webex', () => ({
  init: jest.fn(() => ({
    once: jest.fn((event, callback) => {
      if (event === 'ready') callback();
    }),
    cc: {
      register: jest.fn(),
    },
  })),
}));

describe('Store', () => {
  let mockWebexInstance;
  let mockAgentProfile: IAgentProfile;

  beforeEach(() => {
    mockAgentProfile = {
      teams: [{ id: 'team1', name: 'Team 1' }],
      loginVoiceOptions: ['option1', 'option2'],
    };

    mockWebexInstance = Webex.init();
    mockWebexInstance.cc.register.mockClear();
  });

  test('should initialize and set teams and login options on successful registration', async () => {
    mockWebexInstance.cc.register.mockResolvedValue(mockAgentProfile);

    await store.init({}, 'dummy_access_token');

    expect(Webex.init).toHaveBeenCalledWith({
      config: {},
      credentials: { access_token: 'dummy_access_token' },
    });
    expect(store.teams).toEqual(mockAgentProfile.teams);
    expect(store.loginOptions).toEqual(mockAgentProfile.loginVoiceOptions);
  });

  test('should reject the promise on registration error', async () => {
    const error = new Error('Registration failed');
    mockWebexInstance.cc.register.mockRejectedValue(error);

    await expect(store.init({}, 'dummy_access_token')).rejects.toThrow('Registration failed');
  });
});