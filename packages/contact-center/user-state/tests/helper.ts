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
      useUserState({idleCodes, agentId, cc: mockCC, currentState: '0', lastStateChangeTimestamp: new Date()})
    );

    expect(result.current).toMatchObject({
      isSettingAgentStatus: false,
      errorMessage: '',
      elapsedTime: 0,
      currentState: '0',
    });

    expect(mockCC.on).toHaveBeenCalledTimes(1);
  });

  it('should increment elapsedTime every second', () => {
    const {result} = renderHook(() =>
      useUserState({idleCodes, agentId, cc: mockCC, currentState: '0', lastStateChangeTimestamp: undefined})
    );

    act(() => {
      workerMock.onmessage({data: 1});
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({data: 2});
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({data: 3});
    });

    expect(result.current.elapsedTime).toBe(3);
  });

  it('should reset elapsedTime when lastStateChangeTimestamp changes', async () => {
    const newTimestamp = new Date();
    const {result, rerender} = renderHook(
      ({timestamp}) =>
        useUserState({idleCodes, agentId, cc: mockCC, currentState: '0', lastStateChangeTimestamp: timestamp}),
      {initialProps: {timestamp: new Date(Date.now() - 5000)}}
    );

    expect(result.current.elapsedTime).toBe(5);

    rerender({timestamp: newTimestamp});

    await waitFor(() => {
      expect(result.current.elapsedTime).toBe(0);
    });
  });

  it('should handle setAgentStatus correctly and update state', async () => {
    mockCC.setAgentState.mockResolvedValueOnce({data: {auxCodeId: '2', lastStateChangeTimestamp: new Date()}});
    const {result} = renderHook(() =>
      useUserState({idleCodes, agentId, cc: mockCC, currentState: '0', lastStateChangeTimestamp: new Date()})
    );

    act(() => {
      result.current.setAgentStatus(idleCodes[1]);
    });

    await waitFor(() => {
      expect(store.setCurrentState).toHaveBeenCalledWith('2');
    });
  });

  it('should handle errors from setAgentStatus and revert state', async () => {
    mockCC.setAgentState.mockRejectedValueOnce(new Error('Error setting agent status'));
    const {result} = renderHook(() =>
      useUserState({idleCodes, agentId, cc: mockCC, currentState: '0', lastStateChangeTimestamp: new Date()})
    );

    await act(async () => {
      await result.current.setAgentStatus(idleCodes[1]);
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Error: Error setting agent status');
    });
  });

  it('should handle agent state change events correctly', async () => {
    const {result} = renderHook(() =>
      useUserState({idleCodes, agentId, cc: mockCC, currentState: 'auxCodeId', lastStateChangeTimestamp: new Date()})
    );

    const handler = mockCC.on.mock.calls[0][1];

    act(() => {
      handler({type: 'AgentStateChangeSuccess', auxCodeId: '123'});
    });

    await waitFor(() => {
      expect(store.setCurrentState).toHaveBeenCalledWith('123');
    });
  });

  it('should cleanup event listener on unmount', () => {
    const {unmount} = renderHook(() =>
      useUserState({idleCodes, agentId, cc: mockCC, currentState: '0', lastStateChangeTimestamp: new Date()})
    );

    unmount();
    expect(mockCC.off).toHaveBeenCalledTimes(1);
  });

  it('should update store with new current state when agent status changes', async () => {
    mockCC.setAgentState.mockResolvedValueOnce({
      data: {auxCodeId: '2', lastStateChangeTimestamp: new Date().toISOString()},
    });
    const {result} = renderHook(() =>
      useUserState({idleCodes, agentId, cc: mockCC, currentState: '0', lastStateChangeTimestamp: new Date()})
    );

    await act(async () => {
      await result.current.setAgentStatus(idleCodes[1]);
    });

    await waitFor(() => {
      expect(store.setCurrentState).toHaveBeenCalledWith('2');
      expect(store.setLastStateChangeTimestamp).toHaveBeenCalled();
    });
  });

  it('should update store when agent state change event occurs', async () => {
    const {result} = renderHook(() =>
      useUserState({idleCodes, agentId, cc: mockCC, currentState: '0', lastStateChangeTimestamp: new Date()})
    );

    const handler = mockCC.on.mock.calls[0][1];

    act(() => {
      handler({type: 'AgentStateChangeSuccess', auxCodeId: '3', lastStateChangeTimestamp: new Date().toISOString()});
    });

    await waitFor(() => {
      expect(store.setCurrentState).toHaveBeenCalledWith('3');
      expect(store.setLastStateChangeTimestamp).toHaveBeenCalled();
    });
  });
});
