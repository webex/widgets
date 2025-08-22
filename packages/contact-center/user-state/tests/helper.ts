import React from 'react';
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).Worker = jest.fn(() => workerMock);
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

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle errors in callOnStateChange', () => {
      const errorOnStateChange = jest.fn().mockImplementation(() => {
        throw new Error('Test error in onStateChange callback');
      });

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
          onStateChange: errorOnStateChange,
        })
      );

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: UserState: Error in callOnStateChange - Test error in onStateChange callback',
        {
          module: 'useUserState',
          method: 'callOnStateChange',
        }
      );
    });

    it('should handle errors in worker initialization', () => {
      const originalWorker = global.Worker;

      global.Worker = jest.fn().mockImplementation(() => {
        throw new Error('Worker initialization failed');
      });

      renderHook(() =>
        useUserState({
          idleCodes,
          agentId,
          cc: mockCC,
          currentState: '0',
          customState: null,
          lastStateChangeTimestamp: new Date().getTime(),
          lastIdleCodeChangeTimestamp: undefined,
          logger,
          onStateChange,
        })
      );

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: UserState: Error initializing worker - Worker initialization failed',
        {
          module: 'useUserState',
          method: 'useEffect - initial',
        }
      );

      global.Worker = originalWorker;
    });

    it('should handle errors in worker onmessage handler', () => {
      const mockSetElapsedTime = jest.fn().mockImplementation(() => {
        throw new Error('Error in setElapsedTime');
      });

      const originalUseState = React.useState;
      // @ts-expect-error: only for testing
      jest.spyOn(React, 'useState').mockImplementation((initial: unknown) => {
        if (initial === 0) {
          // Mock setElapsedTime to throw error
          return [0, mockSetElapsedTime];
        }
        // Return normal mock for other useState calls
        return originalUseState(initial);
      });

      renderHook(() =>
        useUserState({
          idleCodes,
          agentId,
          cc: mockCC,
          currentState: '0',
          customState: null,
          lastStateChangeTimestamp: new Date().getTime(),
          lastIdleCodeChangeTimestamp: undefined,
          logger,
          onStateChange,
        })
      );

      act(() => {
        workerMock.onmessage({data: {type: 'elapsedTime', elapsedTime: 1}});
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: UserState: Error in worker onmessage - Error in setElapsedTime',
        {
          module: 'useUserState',
          method: 'useEffect - initial - onmessage',
        }
      );
    });

    it('should handle errors in currentState useEffect', () => {
      // Mock updateAgentState to be called directly, which might throw
      const errorCC = {
        ...mockCC,
        setAgentState: jest.fn().mockImplementation(() => {
          throw new Error('setAgentState synchronous error');
        }),
      };

      const {rerender} = renderHook(
        ({currentState}) =>
          useUserState({
            idleCodes,
            agentId,
            cc: errorCC,
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
        rerender({currentState: '1'});
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: UserState: Error in currentState useEffect - setAgentState synchronous error',
        {
          module: 'useUserState',
          method: 'useEffect - currentState',
        }
      );
    });

    it('should handle errors in customState useEffect', () => {
      // Mock onStateChange to throw error
      const errorOnStateChange = jest.fn().mockImplementation(() => {
        throw new Error('customState callback error');
      });

      const {rerender} = renderHook(
        ({customState}) =>
          useUserState({
            idleCodes,
            agentId,
            cc: mockCC,
            currentState: '0',
            customState,
            lastStateChangeTimestamp: new Date().getTime(),
            lastIdleCodeChangeTimestamp: undefined,
            logger,
            onStateChange: errorOnStateChange,
          }),
        {initialProps: {customState: null}}
      );

      act(() => {
        rerender({customState: {developerName: 'Custom State', name: 'Custom State'}});
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: UserState: Error in callOnStateChange - customState callback error',
        {
          module: 'useUserState',
          method: 'callOnStateChange',
        }
      );
    });

    it('should handle errors in timestamp useEffect', () => {
      // Mock the worker to throw error when postMessage is called
      const mockWorkerWithError = {
        postMessage: jest.fn().mockImplementation(() => {
          throw new Error('Worker postMessage error');
        }),
        terminate: jest.fn(),
        onmessage: null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).Worker = jest.fn(() => mockWorkerWithError);

      const {rerender} = renderHook(
        ({lastStateChangeTimestamp}) =>
          useUserState({
            idleCodes,
            agentId,
            cc: mockCC,
            currentState: '0',
            customState: null,
            lastStateChangeTimestamp,
            lastIdleCodeChangeTimestamp: undefined,
            logger,
            onStateChange,
          }),
        {initialProps: {lastStateChangeTimestamp: new Date().getTime()}}
      );

      act(() => {
        rerender({lastStateChangeTimestamp: new Date().getTime() + 1000});
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: UserState: Error in timestamp useEffect - Worker postMessage error',
        {
          module: 'useUserState',
          method: 'useEffect - reset timers',
        }
      );
    });

    it('should handle errors in setAgentStatus', () => {
      // Mock store.setCurrentState to throw error
      const originalSetCurrentState = store.setCurrentState;
      store.setCurrentState = jest.fn().mockImplementation(() => {
        throw new Error('setCurrentState error');
      });

      const {result} = renderHook(() =>
        useUserState({
          idleCodes,
          agentId,
          cc: mockCC,
          currentState: '0',
          customState: null,
          lastStateChangeTimestamp: new Date().getTime(),
          lastIdleCodeChangeTimestamp: undefined,
          logger,
          onStateChange,
        })
      );

      act(() => {
        result.current.setAgentStatus('1');
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: UserState: Error in setAgentStatus - setCurrentState error',
        {
          module: 'useUserState',
          method: 'setAgentStatus',
        }
      );

      store.setCurrentState = originalSetCurrentState;
    });

    it('should handle errors in updateAgentState', () => {
      // Mock idleCodes.filter to throw error
      const errorIdleCodes = new Proxy([], {
        get: (target, prop) => {
          if (prop === 'filter') {
            throw new Error('idleCodes filter error');
          }
          return target[prop];
        },
      });

      const {rerender} = renderHook(
        ({currentState}) =>
          useUserState({
            idleCodes: errorIdleCodes,
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
        rerender({currentState: '1'});
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: UserState: Error in updateAgentState - idleCodes filter error',
        {
          module: 'useUserState',
          method: 'updateAgentState',
        }
      );
    });

    it('should handle errors in cleanup function', () => {
      const mockWorkerWithCleanupError = {
        postMessage: jest.fn(),
        terminate: jest.fn().mockImplementation(() => {
          throw new Error('Worker terminate error');
        }),
        onmessage: null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).Worker = jest.fn(() => mockWorkerWithCleanupError);

      const {unmount} = renderHook(() =>
        useUserState({
          idleCodes,
          agentId,
          cc: mockCC,
          currentState: '0',
          customState: null,
          lastStateChangeTimestamp: new Date().getTime(),
          lastIdleCodeChangeTimestamp: undefined,
          logger,
          onStateChange,
        })
      );

      unmount();

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: UserState: Error in cleanup - Worker terminate error', {
        module: 'useUserState',
        method: 'useEffect - initial cleanup',
      });
    });
  });
});
