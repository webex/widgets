import {renderHook, act, waitFor} from '@testing-library/react';
import {useUserState} from '../src/helper';
import store from '@webex/cc-store';
import {mockCC} from '@webex/test-fixtures';

describe('useUserState Hook', () => {
  const idleCodes = [
    {id: '1', name: 'Idle Code 1', isSystem: false, isDefault: false},
    {id: '2', name: 'Available', isSystem: false, isDefault: false},
  ];

  const agentId = 'agent123';
  let workerMock, blobMock;
  const onStateChange = jest.fn();
  const logger = {
    log: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
  };

  // Reusable mock response objects
  const mockAvailableStateResponse = {
    type: 'AgentStateChangeSuccess' as const,
    orgId: 'org123',
    trackingId: 'track456',
    data: {
      eventType: 'AgentDesktopMessage' as const,
      agentId: 'agent123',
      trackingId: 'track456',
      auxCodeId: '2',
      agentSessionId: 'session123',
      orgId: 'org123',
      status: 'Available',
      subStatus: 'Available' as const,
      lastIdleCodeChangeTimestamp: new Date().getTime(),
      lastStateChangeTimestamp: new Date().getTime(),
      lastStateChangeReason: 'Available',
      type: 'AgentStateChangeSuccess' as const,
      changedBy: 'AGENT',
      changedById: 'agent123',
      changedByName: 'Test Agent',
    },
  };

  const mockAvailableStateResponseWithTimestamp = {
    type: 'AgentStateChangeSuccess' as const,
    orgId: 'org123',
    trackingId: 'track456',
    data: {
      eventType: 'AgentDesktopMessage' as const,
      agentId: 'agent123',
      trackingId: 'track456',
      auxCodeId: '2',
      agentSessionId: 'session123',
      orgId: 'org123',
      status: 'Available',
      subStatus: 'Available' as const,
      lastIdleCodeChangeTimestamp: 1740748111287,
      lastStateChangeTimestamp: 1740748111287,
      lastStateChangeReason: 'Available',
      type: 'AgentStateChangeSuccess' as const,
      changedBy: 'AGENT',
      changedById: 'agent123',
      changedByName: 'Test Agent',
    },
  };

  const mockIdleStateResponse = {
    type: 'AgentStateChangeSuccess' as const,
    orgId: 'org123',
    trackingId: 'track456',
    data: {
      eventType: 'AgentDesktopMessage' as const,
      agentId: 'agent123',
      trackingId: 'track456',
      auxCodeId: '1',
      agentSessionId: 'session123',
      orgId: 'org123',
      status: 'Idle',
      subStatus: 'Idle' as const,
      lastIdleCodeChangeTimestamp: 1740748111287,
      lastStateChangeTimestamp: 1740748111287,
      lastStateChangeReason: 'Idle Code 1',
      type: 'AgentStateChangeSuccess' as const,
      changedBy: 'AGENT',
      changedById: 'agent123',
      changedByName: 'Test Agent',
    },
  };

  const ccOnSpy = jest.spyOn(mockCC, 'on');
  const ccOffSpy = jest.spyOn(mockCC, 'off');
  const ccSetAgentStateSpy = jest.spyOn(mockCC, 'setAgentState');

  beforeEach(() => {
    jest.useFakeTimers();
    ccSetAgentStateSpy.mockReset();
    ccOnSpy.mockReset();
    ccOffSpy.mockReset();

    workerMock = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null,
    };

    global.Worker = jest.fn(() => workerMock);
    blobMock = jest.fn(() => 'blob:http://localhost:3000/12345');
    global.URL.createObjectURL = blobMock;
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
        customState: null,
        logger: logger,
        onStateChange,
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

  it('should clean up on unmount', () => {
    ccSetAgentStateSpy.mockResolvedValueOnce(mockAvailableStateResponse);
    const {unmount} = renderHook(() =>
      useUserState({
        idleCodes: [],
        agentId: 'agent123',
        cc: mockCC,
        currentState: '0',
        customState: null,
        logger: logger,
        onStateChange: jest.fn(),
        lastStateChangeTimestamp: new Date().getTime(),
        lastIdleCodeChangeTimestamp: undefined,
      })
    );

    // Simulate component unmount
    unmount();

    expect(workerMock.postMessage).toHaveBeenCalledWith({type: 'stop'});
    expect(workerMock.postMessage).toHaveBeenCalledWith({type: 'stopIdleCode'});
    expect(workerMock.terminate).toHaveBeenCalled();
  });

  it('should increment elapsedTime every second', async () => {
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState: null,
        logger,
        onStateChange,
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

    await waitFor(() => {
      expect(result.current.elapsedTime).toBe(3);
    });
  });

  it('should increment lastIdleStateChangeElapsedTime every second', () => {
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState: null,
        logger,
        onStateChange,
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
    ccSetAgentStateSpy.mockResolvedValueOnce(mockAvailableStateResponse);
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState: null,
        logger,
        onStateChange,
        lastStateChangeTimestamp: new Date().getTime(),
        lastIdleCodeChangeTimestamp: undefined,
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
    ccSetAgentStateSpy.mockResolvedValueOnce(mockAvailableStateResponseWithTimestamp);
    const {rerender} = renderHook(
      ({currentState}) =>
        useUserState({
          idleCodes,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          lastStateChangeTimestamp: 1740744111287,
          lastIdleCodeChangeTimestamp: undefined,
          logger,
          onStateChange,
        }),
      {initialProps: {currentState: '0', lastStateChangeTimestamp: 1740744111287}}
    );

    act(() => {
      store.setCurrentState('2'); // Simulate the store state change
      rerender({currentState: '2', lastStateChangeTimestamp: 1740748111287});
    });

    await waitFor(() => {
      expect(mockCC.setAgentState).toHaveBeenCalledWith({
        state: 'Available',
        auxCodeId: '2',
        agentId,
        lastStateChangeReason: 'Available',
      });
      expect(store.lastStateChangeTimestamp).toEqual(
        mockAvailableStateResponseWithTimestamp.data.lastStateChangeTimestamp
      );
    });
  });

  it('should set idle status if name does not match: Available', async () => {
    ccSetAgentStateSpy.mockResolvedValueOnce(mockIdleStateResponse);
    const {rerender} = renderHook(
      ({currentState}) =>
        useUserState({
          idleCodes,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          lastStateChangeTimestamp: 1740744111287,
          lastIdleCodeChangeTimestamp: undefined,
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
      expect(store.lastStateChangeTimestamp).toEqual(mockIdleStateResponse.data.lastStateChangeTimestamp);
    });
  });

  it('should handle errors from setAgentState and revert state', async () => {
    ccSetAgentStateSpy.mockRejectedValueOnce(new Error('Error setting agent status'));
    const {rerender} = renderHook(
      ({currentState}) =>
        useUserState({
          idleCodes,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          lastStateChangeTimestamp: new Date().getTime(),
          lastIdleCodeChangeTimestamp: undefined,
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
      expect(logger.error).toHaveBeenCalledWith('Error setting agent state: Error: Error setting agent status', {
        module: 'useUserState',
        method: 'updateAgentState',
      });
    });
  });

  it('should handle stopIdleCodeTimer event and set lastIdleStateChangeElapsedTime to -1', () => {
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState: null,
        logger,
        onStateChange,
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

    renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState: null,
        logger,
        onStateChange,
        lastStateChangeTimestamp,
        lastIdleCodeChangeTimestamp,
      })
    );

    expect(workerMock.postMessage).toHaveBeenCalledWith({
      type: 'resetIdleCode',
      startTime: lastIdleCodeChangeTimestamp,
    });
  });

  it('should not call onStateChange if not available', () => {
    const customState = {developerName: 'Custom State', name: 'Custom State'};
    renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState,
        lastStateChangeTimestamp: new Date().getTime(),
        lastIdleCodeChangeTimestamp: undefined,
        logger,
        onStateChange: undefined,
      })
    );

    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('should call onStateChange with customState if provided', () => {
    const customState = {developerName: 'Custom State', name: 'Custom State'};
    renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState,
        lastStateChangeTimestamp: new Date().getTime(),
        lastIdleCodeChangeTimestamp: undefined,
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
        lastStateChangeTimestamp: new Date().getTime(),
        lastIdleCodeChangeTimestamp: undefined,
        logger,
        onStateChange,
      })
    );

    expect(onStateChange).toHaveBeenCalledWith(idleCodes[0]);
  });
});
