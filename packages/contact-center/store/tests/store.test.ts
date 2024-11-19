import store from '../src/index'; // Adjust the path as necessary
import sdk from '../src/sdk'; // Mock this SDK

jest.mock('../src/sdk', () => ({
  on: jest.fn(),
  init: jest.fn(),
}));

describe('Store', () => {
  beforeEach(() => {
    // Reset the store's state before each test
    store.loginState = '';
    store.isAvailable = false;
    store.isSdkInitialised = false;
    store.sdkConfig = undefined;
    jest.clearAllMocks(); // Clear mocks before each test
  });

  it('constructor should initialize with default values and register presence:state event', () => {
    expect(store.loginState).toBe('');
    expect(store.isAvailable).toBe(false);
    expect(store.isSdkInitialised).toBe(false);
    expect(store.sdkConfig).toBeUndefined();
  });

  describe('setSdkConfig', () => {
    it('should set SDK config if not already set', () => {
      const config = {accessToken: 'value'};
      store.setSdkConfig({config, from: 'testWidget'});

      expect(store.sdkConfig).toEqual({
        config,
        from: 'testWidget',
      });
      expect(sdk.init).toHaveBeenCalledWith(config);
      expect(sdk.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should not set SDK config if it is already set', () => {
      const config = {accessToken: 'value'};
      store.setSdkConfig({config, from: 'firstWidget'});
      store.setSdkConfig({config, from: 'secondWidget'});

      expect(store.sdkConfig).toEqual({
        config,
        from: 'firstWidget',
      });
      expect(sdk.init).toHaveBeenCalledTimes(1);
    });

    it('should log a message if sdkConfig is not provided', () => {
      console.log = jest.fn();

      store.setSdkConfig({config: undefined, from: 'testWidget'});
      expect(console.log).toHaveBeenCalledWith('sdkConfig is not provided via testWidget widget');
    });

    it('should log a message if sdkConfig is already provided', () => {
      console.log = jest.fn();
      const config = {key: 'value'};

      store.setSdkConfig({config, from: 'firstWidget'});
      store.setSdkConfig({config, from: 'secondWidget'});

      expect(console.log).toHaveBeenCalledWith('sdkConfig already provided via firstWidget widget');
    });
  });
});
