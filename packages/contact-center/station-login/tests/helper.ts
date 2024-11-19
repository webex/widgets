import {useStationLogin} from '../src/helper';
import {renderHook} from '@testing-library/react-hooks';

// Mock store object
const mockStore = {
  isSdkInitialised: false,
  setSdkConfig: jest.fn(),
};

describe('useStationLogin', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Clear mock calls after each test
  });

  it('should set SDK config on initial render', () => {
    const props = {sdkConfig: {key: 'value'}}; // example sdkConfig

    renderHook(() => useStationLogin(props, mockStore));

    expect(mockStore.setSdkConfig).toHaveBeenCalledWith({
      config: props.sdkConfig,
      from: 'cc-station-login',
    });
  });

  it('should return correct values', () => {
    const props = {sdkConfig: {key: 'value'}, anotherProp: 'test'};

    const {result} = renderHook(() => useStationLogin(props, mockStore));

    expect(result.current).toEqual({
      name: 'StationLogin',
      ...props,
    });
  });

  it('should handle isSdkInitialised changes', () => {
    const props = {sdkConfig: {key: 'value'}};

    const {rerender} = renderHook(() => useStationLogin(props, mockStore));

    // Simulate a change in isSdkInitialised
    mockStore.isSdkInitialised = true;
    rerender();

    // You can add additional checks here based on the effects of isSdkInitialised changing
  });
});
