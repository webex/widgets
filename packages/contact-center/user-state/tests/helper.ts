import {renderHook, act, waitFor} from '@testing-library/react';
import {useUserState} from '../src/helper';
import store from '@webex/cc-store';

describe('useUserState Hook', () => {
  const mockCC = {
    setAgentState: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };

  const idleCodes = [
    {id: '1', name: 'Idle Code 1', isSystem: false},
    {id: '2', name: 'Available', isSystem: false},
  ];

  const agentId = 'agent123';
  let workerMock;
  const onStateChange = jest.fn();
  const logger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockCC.setAgentState.mockReset();
    mockCC.on.mockReset();
    mockCC.off.mockReset();

    workerMock = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null,
    };

    global.Worker = jest.fn(() => workerMock);
    global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost:3000/12345');
    jest.spyOn(store, 'setCurrentState');
    jest.spyOn(store, 'setLastStateChangeTimestamp');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState: null,
        lastStateChangeTimestamp: new Date(),
        logger,
        onStateChange,
      })
    );

    expect(result.current).toMatchObject({
      isSettingAgentStatus: false,
      errorMessage: '',
      elapsedTime: 0,
      currentState: '0',
    });
  });

  it('should increment elapsedTime every second', async () => {
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState: null,
        lastStateChangeTimestamp: undefined,
        logger,
        onStateChange,
      })
    );

    act(() => {
      workerMock.onmessage({data: 1});
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({data: 2});
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({data: 3});
    });

    await waitFor(() => {
      expect(result.current.elapsedTime).toBe(3);
    });
  });

  it('should call store.setCurrentState when setAgentStatus is called', async () => {
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState: null,
        lastStateChangeTimestamp: new Date(),
        logger,
        onStateChange,
      })
    );

    act(() => {
      result.current.setAgentStatus(idleCodes[1].id);
    });

    await waitFor(() => {
      expect(store.setCurrentState).toHaveBeenCalledWith(idleCodes[1].id);
    });
  });

  it('should update last state change timestamp from setAgentState', async () => {
    const resolvingValue = {data: {auxCodeId: '2', lastStateChangeTimestamp: 1740748111287}};
    mockCC.setAgentState.mockResolvedValueOnce(resolvingValue);
    const {rerender} = renderHook(
      ({currentState}) =>
        useUserState({
          idleCodes,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          lastStateChangeTimestamp: new Date(1740744111287),
          logger,
          onStateChange,
        }),
      {initialProps: {currentState: '0'}}
    );

    act(() => {
      store.setCurrentState('2'); // Simulate the store state change
      rerender({currentState: '2'});
    });

    await waitFor(() => {
      expect(mockCC.setAgentState).toHaveBeenCalledWith({
        state: 'Available',
        auxCodeId: '2',
        agentId,
        lastStateChangeReason: 'Available',
      });
      expect(store.lastStateChangeTimestamp).toEqual(new Date(resolvingValue.data.lastStateChangeTimestamp));
    });
  });

  it('should set idle status if name does not match: Available', async () => {
    const resolvingValue = {data: {auxCodeId: '1', lastStateChangeTimestamp: 1740748111287}};
    mockCC.setAgentState.mockResolvedValueOnce(resolvingValue);
    const {rerender} = renderHook(
      ({currentState}) =>
        useUserState({
          idleCodes,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          lastStateChangeTimestamp: new Date(1740744111287),
          logger,
          onStateChange,
        }),
      {initialProps: {currentState: '0'}}
    );

    act(() => {
      store.setCurrentState('1'); // Simulate the store state change
      rerender({currentState: '1'});
    });

    await waitFor(() => {
      expect(mockCC.setAgentState).toHaveBeenCalledWith({
        state: 'Idle',
        auxCodeId: '1',
        agentId,
        lastStateChangeReason: 'Idle Code 1',
      });
      expect(store.lastStateChangeTimestamp).toEqual(new Date(resolvingValue.data.lastStateChangeTimestamp));
    });
  });

  it('should handle errors from setAgentState and revert state', async () => {
    mockCC.setAgentState.mockRejectedValueOnce(new Error('Error setting agent status'));
    const {result, rerender} = renderHook(
      ({currentState}) =>
        useUserState({
          idleCodes,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          lastStateChangeTimestamp: new Date(),
          logger,
          onStateChange,
        }),
      {initialProps: {currentState: '0'}}
    );

    act(() => {
      store.setCurrentState('2'); // Simulate the store state change
      rerender({currentState: '2'});
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Error: Error setting agent status');
    });
  });

  it('should not call onStateChange if not available', () => {
    const customState = {developerName: 'Custom State'};
    renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState,
        lastStateChangeTimestamp: new Date(),
        logger,
        onStateChange: undefined,
      })
    );

    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('should call onStateChange with customState if provided', () => {
    const customState = {developerName: 'Custom State'};
    renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState,
        lastStateChangeTimestamp: new Date(),
        logger,
        onStateChange,
      })
    );

    expect(onStateChange).toHaveBeenCalledWith(customState);
  });

  it('should call onStateChange with matching idleCode when currentState changes', () => {
    renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '1',
        customState: null,
        lastStateChangeTimestamp: new Date(),
        logger,
        onStateChange,
      })
    );

    expect(onStateChange).toHaveBeenCalledWith(idleCodes[0]);
  });

  it('should update elapsedTime based on lastStateChangeTimestamp', () => {
    const pastTimestamp = new Date(Date.now() - 5000);
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState: null,
        lastStateChangeTimestamp: pastTimestamp,
        logger,
        onStateChange,
      })
    );

    expect(result.current.elapsedTime).toBe(5);
  });
});
