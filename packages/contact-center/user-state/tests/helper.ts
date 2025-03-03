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
    jest.spyOn(console, 'error').mockImplementation(() => {});
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
        lastStateChangeTimestamp: new Date().getTime(),
        lastIdleCodeChangeTimestamp: undefined,
      })
    );

    expect(result.current).toMatchObject({
      isSettingAgentStatus: false,
      elapsedTime: 0,
      currentState: '0',
    });
  });

  it('should increment elapsedTime every second', () => {
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        lastStateChangeTimestamp: new Date().getTime(),
        lastIdleCodeChangeTimestamp: new Date().getTime(),
      })
    );

    act(() => {
      workerMock.onmessage({data: {type: 'elapsedTime', elapsedTime: 1}});
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({data: {type: 'elapsedTime', elapsedTime: 2}});
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({data: {type: 'elapsedTime', elapsedTime: 3}});
    });

    expect(result.current.elapsedTime).toBe(3);
  });

  it('should increment lastIdleStateChangeElapsedTime every second', () => {
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        lastStateChangeTimestamp: new Date().getTime(),
        lastIdleCodeChangeTimestamp: new Date().getTime(),
      })
    );

    act(() => {
      workerMock.onmessage({data: {type: 'lastIdleStateChangeElapsedTime', elapsedTime: 1}});
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({data: {type: 'lastIdleStateChangeElapsedTime', elapsedTime: 2}});
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({data: {type: 'lastIdleStateChangeElapsedTime', elapsedTime: 3}});
    });

    expect(result.current.lastIdleStateChangeElapsedTime).toBe(3);
  });

  it('should handle setAgentStatus correctly and update state', async () => {
    mockCC.setAgentState.mockResolvedValueOnce({
      data: {auxCodeId: '2', lastStateChangeTimestamp: new Date().getTime()},
    });
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        lastStateChangeTimestamp: new Date().getTime(),
        lastIdleCodeChangeTimestamp: undefined,
      })
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
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        lastStateChangeTimestamp: new Date().getTime(),
        lastIdleCodeChangeTimestamp: undefined,
      })
    );

    await act(async () => {
      await result.current.setAgentStatus(idleCodes[1]);
    });

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Error: Error setting agent status');
    });
  });

  it('should handle stopIdleCodeTimer event and set lastIdleStateChangeElapsedTime to -1', () => {
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        lastStateChangeTimestamp: new Date().getTime(),
        lastIdleCodeChangeTimestamp: new Date().getTime(),
      })
    );

    act(() => {
      workerMock.onmessage({data: {type: 'stopIdleCodeTimer'}});
    });

    expect(result.current.lastIdleStateChangeElapsedTime).toBe(-1);
  });

  it('should post resetIdleCode message if lastIdleCodeChangeTimestamp is different from lastStateChangeTimestamp', () => {
    const lastStateChangeTimestamp = new Date().getTime();
    const lastIdleCodeChangeTimestamp = lastStateChangeTimestamp - 1000; // 1 second earlier

    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        lastStateChangeTimestamp,
        lastIdleCodeChangeTimestamp,
      })
    );

    expect(workerMock.postMessage).toHaveBeenCalledWith({
      type: 'resetIdleCode',
      startTime: lastIdleCodeChangeTimestamp,
    });
  });
});
