import React from 'react';
import {renderHook, act, waitFor} from '@testing-library/react';
import {useUserState} from '../src/helper';
import store from '@webex/cc-store';
import {mockCC} from '@webex/test-fixtures';
import {
  VOICE_CONNECTION_EVENTS,
  VOICE_CONNECTION_STATUS,
  VoiceLineStatus,
  VoiceMobiusSocketStatus,
} from '@webex/cc-store';
import type {IContactCenter} from '@webex/cc-store';

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
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue({
      status: VOICE_CONNECTION_STATUS.NOT_REQUIRED,
      lineStatus: VoiceLineStatus.UNKNOWN,
      mobiusSocketStatus: VoiceMobiusSocketStatus.NOT_IN_USE,
    });
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
    expect(ccOffSpy).toHaveBeenCalledWith(VOICE_CONNECTION_EVENTS.STATE_CHANGE, ccOnSpy.mock.calls[0][1]);
  });

  it('uses the voice snapshot on mount and follows SDK connection events', () => {
    const readyState = {
      status: VOICE_CONNECTION_STATUS.READY,
      lineStatus: VoiceLineStatus.REGISTERED,
      mobiusSocketStatus: VoiceMobiusSocketStatus.CONNECTED,
    };
    const unavailableState = {
      status: VOICE_CONNECTION_STATUS.UNAVAILABLE,
      lineStatus: VoiceLineStatus.RECONNECTING,
      mobiusSocketStatus: VoiceMobiusSocketStatus.DISCONNECTED,
    };
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(readyState);
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState: null,
        logger,
        onStateChange,
      })
    );

    expect(result.current.voiceConnectionState).toEqual(readyState);
    const listener = ccOnSpy.mock.calls.find(([eventName]) => eventName === VOICE_CONNECTION_EVENTS.STATE_CHANGE)?.[1];
    expect(listener).toBeDefined();
    act(() => listener?.(unavailableState));
    expect(result.current.voiceConnectionState).toEqual(unavailableState);
    act(() => listener?.(readyState));
    expect(result.current.voiceConnectionState).toEqual(readyState);
  });

  it('uses an unavailable snapshot when mounted after voice initialization failed', () => {
    const unavailableState = {
      status: VOICE_CONNECTION_STATUS.UNAVAILABLE,
      lineStatus: VoiceLineStatus.ERROR,
      mobiusSocketStatus: VoiceMobiusSocketStatus.DISCONNECTED,
    };
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(unavailableState);
    const {result} = renderHook(() =>
      useUserState({
        idleCodes,
        agentId,
        cc: mockCC,
        currentState: '0',
        customState: null,
        logger,
        onStateChange,
      })
    );

    expect(result.current.voiceConnectionState).toEqual(unavailableState);
  });

  it('initializes with a safe default snapshot when cc is undefined and connects when cc becomes available', () => {
    const readyState = {
      status: VOICE_CONNECTION_STATUS.READY,
      lineStatus: VoiceLineStatus.REGISTERED,
      mobiusSocketStatus: VoiceMobiusSocketStatus.CONNECTED,
    };
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(readyState);

    const {result, rerender} = renderHook(
      ({ccInstance}: {ccInstance?: IContactCenter}) =>
        useUserState({
          idleCodes,
          agentId,
          cc: ccInstance,
          currentState: '0',
          customState: null,
          logger,
          onStateChange,
        }),
      {initialProps: {ccInstance: undefined}}
    );

    expect(result.current.voiceConnectionState).toEqual({
      status: VOICE_CONNECTION_STATUS.NOT_REQUIRED,
      lineStatus: VoiceLineStatus.UNKNOWN,
      mobiusSocketStatus: VoiceMobiusSocketStatus.NOT_IN_USE,
    });
    expect(ccOnSpy).not.toHaveBeenCalled();

    rerender({ccInstance: mockCC});
    expect(ccOnSpy).toHaveBeenCalledWith(VOICE_CONNECTION_EVENTS.STATE_CHANGE, expect.any(Function));
    expect(result.current.voiceConnectionState).toEqual(readyState);
  });

  it('forces Idle and opens dialog after voice loss timeout when browser calling drops', async () => {
    const idleCodesWithDefault = [
      {id: '1', name: 'Break', isSystem: false, isDefault: true},
      {id: '2', name: 'Available', isSystem: false, isDefault: false},
    ];
    const readyState = {
      status: VOICE_CONNECTION_STATUS.READY,
      lineStatus: VoiceLineStatus.REGISTERED,
      mobiusSocketStatus: VoiceMobiusSocketStatus.CONNECTED,
    };
    const unavailableState = {
      status: VOICE_CONNECTION_STATUS.UNAVAILABLE,
      lineStatus: VoiceLineStatus.ERROR,
      mobiusSocketStatus: VoiceMobiusSocketStatus.DISCONNECTED,
    };
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(readyState);
    ccSetAgentStateSpy.mockResolvedValueOnce({data: {lastStateChangeTimestamp: 100, lastIdleCodeChangeTimestamp: 100}});

    const {result, rerender} = renderHook(
      ({currentState}: {currentState: string}) =>
        useUserState({
          idleCodes: idleCodesWithDefault,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          logger,
          onStateChange,
          isBrowserVoiceSession: true,
          isAgentLoggedIn: true,
        }),
      {initialProps: {currentState: '2'}}
    );

    const listener = ccOnSpy.mock.calls.find(([eventName]) => eventName === VOICE_CONNECTION_EVENTS.STATE_CHANGE)?.[1];
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(unavailableState);
    act(() => listener?.(unavailableState));

    expect(result.current.voiceConnectionLossDialogOpen).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(store.setCurrentState).toHaveBeenCalledWith('1');

    await act(async () => {
      rerender({currentState: '1'});
    });

    expect(ccSetAgentStateSpy).toHaveBeenCalledWith({
      state: 'Idle',
      auxCodeId: '1',
      agentId,
      lastStateChangeReason: 'Break',
    });
    expect(result.current.voiceConnectionLossDialogOpen).toBe(true);
  });

  it('preserves forced Idle during wellness-code lookup and persists once lookup finishes', async () => {
    const idleCodesWithDefault = [
      {id: '1', name: 'Break', isSystem: false, isDefault: true},
      {id: '2', name: 'Available', isSystem: false, isDefault: false},
    ];
    const readyState = {
      status: VOICE_CONNECTION_STATUS.READY,
      lineStatus: VoiceLineStatus.REGISTERED,
      mobiusSocketStatus: VoiceMobiusSocketStatus.CONNECTED,
    };
    const unavailableState = {
      status: VOICE_CONNECTION_STATUS.UNAVAILABLE,
      lineStatus: VoiceLineStatus.ERROR,
      mobiusSocketStatus: VoiceMobiusSocketStatus.DISCONNECTED,
    };
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(readyState);
    ccSetAgentStateSpy.mockResolvedValueOnce({data: {lastStateChangeTimestamp: 100, lastIdleCodeChangeTimestamp: 100}});

    const {result, rerender} = renderHook(
      ({currentState, wellnessLookupPending}: {currentState: string; wellnessLookupPending: boolean}) =>
        useUserState({
          idleCodes: idleCodesWithDefault,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          logger,
          onStateChange,
          isBrowserVoiceSession: true,
          isAgentLoggedIn: true,
          wellnessIdleCodeLookupPending: wellnessLookupPending,
        }),
      {initialProps: {currentState: '2', wellnessLookupPending: true}}
    );

    const listener = ccOnSpy.mock.calls.find(([eventName]) => eventName === VOICE_CONNECTION_EVENTS.STATE_CHANGE)?.[1];
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(unavailableState);
    act(() => listener?.(unavailableState));

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(store.setCurrentState).toHaveBeenCalledWith('1');

    await act(async () => {
      rerender({currentState: '1', wellnessLookupPending: true});
    });

    expect(ccSetAgentStateSpy).not.toHaveBeenCalled();
    expect(result.current.voiceConnectionLossDialogOpen).toBe(false);

    await act(async () => {
      rerender({currentState: '1', wellnessLookupPending: false});
    });

    expect(ccSetAgentStateSpy).toHaveBeenCalledWith({
      state: 'Idle',
      auxCodeId: '1',
      agentId,
      lastStateChangeReason: 'Break',
    });
    expect(result.current.voiceConnectionLossDialogOpen).toBe(true);
  });

  it('does not open dialog when forced Idle state update fails and displays stateChangeError', async () => {
    const idleCodesWithDefault = [
      {id: '1', name: 'Break', isSystem: false, isDefault: true},
      {id: '2', name: 'Available', isSystem: false, isDefault: false},
    ];
    const readyState = {
      status: VOICE_CONNECTION_STATUS.READY,
      lineStatus: VoiceLineStatus.REGISTERED,
      mobiusSocketStatus: VoiceMobiusSocketStatus.CONNECTED,
    };
    const unavailableState = {
      status: VOICE_CONNECTION_STATUS.UNAVAILABLE,
      lineStatus: VoiceLineStatus.ERROR,
      mobiusSocketStatus: VoiceMobiusSocketStatus.DISCONNECTED,
    };
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(readyState);
    ccSetAgentStateSpy.mockRejectedValueOnce(new Error('Backend rejected state change'));

    const {result, rerender} = renderHook(
      ({currentState}: {currentState: string}) =>
        useUserState({
          idleCodes: idleCodesWithDefault,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          logger,
          onStateChange,
          isBrowserVoiceSession: true,
          isAgentLoggedIn: true,
        }),
      {initialProps: {currentState: '2'}}
    );

    const listener = ccOnSpy.mock.calls.find(([eventName]) => eventName === VOICE_CONNECTION_EVENTS.STATE_CHANGE)?.[1];
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(unavailableState);
    act(() => listener?.(unavailableState));

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(store.setCurrentState).toHaveBeenCalledWith('1');

    await act(async () => {
      rerender({currentState: '1'});
    });

    expect(ccSetAgentStateSpy).toHaveBeenCalled();
    expect(result.current.voiceConnectionLossDialogOpen).toBe(false);
    expect(result.current.stateChangeError).toBe('Unable to update agent state.');
    expect(store.setCurrentState).toHaveBeenCalledWith('2');
  });

  it('opens dialog immediately when agent was already in default idle state on voice loss', async () => {
    const idleCodesWithDefault = [
      {id: '1', name: 'Break', isSystem: false, isDefault: true},
      {id: '2', name: 'Available', isSystem: false, isDefault: false},
    ];
    const readyState = {
      status: VOICE_CONNECTION_STATUS.READY,
      lineStatus: VoiceLineStatus.REGISTERED,
      mobiusSocketStatus: VoiceMobiusSocketStatus.CONNECTED,
    };
    const unavailableState = {
      status: VOICE_CONNECTION_STATUS.UNAVAILABLE,
      lineStatus: VoiceLineStatus.ERROR,
      mobiusSocketStatus: VoiceMobiusSocketStatus.DISCONNECTED,
    };
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(readyState);

    const {result} = renderHook(() =>
      useUserState({
        idleCodes: idleCodesWithDefault,
        agentId,
        cc: mockCC,
        currentState: '1',
        customState: null,
        logger,
        onStateChange,
        isBrowserVoiceSession: true,
        isAgentLoggedIn: true,
      })
    );

    const listener = ccOnSpy.mock.calls.find(([eventName]) => eventName === VOICE_CONNECTION_EVENTS.STATE_CHANGE)?.[1];
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(unavailableState);
    act(() => listener?.(unavailableState));

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(ccSetAgentStateSpy).not.toHaveBeenCalled();
    expect(result.current.voiceConnectionLossDialogOpen).toBe(true);
  });

  it('opens recovery dialog without state change when no default idle code exists, and transitions once default code arrives', async () => {
    const idleCodesWithoutDefault = [
      {id: '1', name: 'Break', isSystem: false, isDefault: false},
      {id: '2', name: 'Available', isSystem: false, isDefault: false},
    ];
    const idleCodesWithDefault = [
      {id: '1', name: 'Break', isSystem: false, isDefault: true},
      {id: '2', name: 'Available', isSystem: false, isDefault: false},
    ];
    const readyState = {
      status: VOICE_CONNECTION_STATUS.READY,
      lineStatus: VoiceLineStatus.REGISTERED,
      mobiusSocketStatus: VoiceMobiusSocketStatus.CONNECTED,
    };
    const unavailableState = {
      status: VOICE_CONNECTION_STATUS.UNAVAILABLE,
      lineStatus: VoiceLineStatus.ERROR,
      mobiusSocketStatus: VoiceMobiusSocketStatus.DISCONNECTED,
    };
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(readyState);
    ccSetAgentStateSpy.mockResolvedValueOnce({data: {lastStateChangeTimestamp: 100, lastIdleCodeChangeTimestamp: 100}});

    const {result, rerender} = renderHook(
      ({codes}: {codes: typeof idleCodesWithoutDefault}) =>
        useUserState({
          idleCodes: codes,
          agentId,
          cc: mockCC,
          currentState: '2',
          customState: null,
          logger,
          onStateChange,
          isBrowserVoiceSession: true,
          isAgentLoggedIn: true,
        }),
      {initialProps: {codes: idleCodesWithoutDefault}}
    );

    const listener = ccOnSpy.mock.calls.find(([eventName]) => eventName === VOICE_CONNECTION_EVENTS.STATE_CHANGE)?.[1];
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(unavailableState);
    act(() => listener?.(unavailableState));

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(store.setCurrentState).not.toHaveBeenCalled();
    expect(ccSetAgentStateSpy).not.toHaveBeenCalled();
    expect(result.current.voiceConnectionLossDialogOpen).toBe(true);

    await act(async () => {
      rerender({codes: idleCodesWithDefault});
    });

    expect(store.setCurrentState).toHaveBeenCalledWith('1');
  });

  it('does not open dialog when an older concurrent state update resolves before forced Idle settles', async () => {
    const idleCodesWithDefault = [
      {id: '1', name: 'Break', isSystem: false, isDefault: true},
      {id: '2', name: 'Available', isSystem: false, isDefault: false},
      {id: '3', name: 'Meeting', isSystem: false, isDefault: false},
    ];
    const readyState = {
      status: VOICE_CONNECTION_STATUS.READY,
      lineStatus: VoiceLineStatus.REGISTERED,
      mobiusSocketStatus: VoiceMobiusSocketStatus.CONNECTED,
    };
    const unavailableState = {
      status: VOICE_CONNECTION_STATUS.UNAVAILABLE,
      lineStatus: VoiceLineStatus.ERROR,
      mobiusSocketStatus: VoiceMobiusSocketStatus.DISCONNECTED,
    };
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(readyState);

    let resolveFirstUpdate: (value: unknown) => void;
    const firstUpdatePromise = new Promise((resolve) => {
      resolveFirstUpdate = resolve;
    });
    ccSetAgentStateSpy.mockReturnValueOnce(firstUpdatePromise);

    const {result, rerender} = renderHook(
      ({currentState}: {currentState: string}) =>
        useUserState({
          idleCodes: idleCodesWithDefault,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          logger,
          onStateChange,
          isBrowserVoiceSession: true,
          isAgentLoggedIn: true,
        }),
      {initialProps: {currentState: '2'}}
    );

    act(() => {
      result.current.setAgentStatus('3');
    });
    rerender({currentState: '3'});

    expect(ccSetAgentStateSpy).toHaveBeenCalledWith({
      state: 'Idle',
      auxCodeId: '3',
      agentId,
      lastStateChangeReason: 'Meeting',
    });

    const listener = ccOnSpy.mock.calls.find(([eventName]) => eventName === VOICE_CONNECTION_EVENTS.STATE_CHANGE)?.[1];
    jest.spyOn(mockCC, 'getVoiceConnectionState').mockReturnValue(unavailableState);
    act(() => listener?.(unavailableState));

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(store.setCurrentState).toHaveBeenCalledWith('1');

    await act(async () => {
      resolveFirstUpdate!({data: {lastStateChangeTimestamp: 100, lastIdleCodeChangeTimestamp: 100}});
    });

    expect(result.current.voiceConnectionLossDialogOpen).toBe(false);
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

  it('does not echo externally managed wellness state transitions back to the SDK', async () => {
    const wellnessIdleCodes = [
      ...idleCodes,
      {id: 'wellness', name: 'WellbeingBreak', isSystem: true, isDefault: false},
    ];
    const {rerender} = renderHook(
      ({currentState, isCurrentStateExternallyManaged, lastStateChangeTimestamp}) =>
        useUserState({
          idleCodes: wellnessIdleCodes,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          lastStateChangeTimestamp,
          lastIdleCodeChangeTimestamp: lastStateChangeTimestamp,
          isCurrentStateExternallyManaged,
          logger,
          onStateChange,
        }),
      {
        initialProps: {
          currentState: '1',
          isCurrentStateExternallyManaged: false,
          lastStateChangeTimestamp: 1_000,
        },
      }
    );

    rerender({
      currentState: 'wellness',
      isCurrentStateExternallyManaged: true,
      lastStateChangeTimestamp: 2_000,
    });
    rerender({
      currentState: '1',
      isCurrentStateExternallyManaged: false,
      lastStateChangeTimestamp: 3_000,
    });

    await waitFor(() => expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({name: 'WellbeingBreak'})));
    expect(mockCC.setAgentState).not.toHaveBeenCalled();
    expect(workerMock.postMessage).toHaveBeenCalledWith({type: 'reset', startTime: 2_000});
    expect(workerMock.postMessage).toHaveBeenCalledWith({type: 'reset', startTime: 3_000});
  });

  it('waits for wellness-code resolution before sending a state change', async () => {
    const wellnessIdleCodes = [
      ...idleCodes,
      {id: 'wellness', name: 'WellbeingBreak', isSystem: true, isDefault: false},
    ];
    const {rerender} = renderHook(
      ({currentState, wellnessIdleCodeLookupPending, isCurrentStateExternallyManaged}) =>
        useUserState({
          idleCodes: wellnessIdleCodes,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          lastStateChangeTimestamp: 1_000,
          lastIdleCodeChangeTimestamp: 1_000,
          wellnessIdleCodeLookupPending,
          isCurrentStateExternallyManaged,
          logger,
          onStateChange,
        }),
      {
        initialProps: {
          currentState: '1',
          wellnessIdleCodeLookupPending: true,
          isCurrentStateExternallyManaged: false,
        },
      }
    );

    rerender({currentState: 'wellness', wellnessIdleCodeLookupPending: true, isCurrentStateExternallyManaged: false});
    expect(mockCC.setAgentState).not.toHaveBeenCalled();

    rerender({currentState: 'wellness', wellnessIdleCodeLookupPending: false, isCurrentStateExternallyManaged: true});
    rerender({currentState: '1', wellnessIdleCodeLookupPending: false, isCurrentStateExternallyManaged: false});
    expect(mockCC.setAgentState).not.toHaveBeenCalled();

    rerender({currentState: '2', wellnessIdleCodeLookupPending: false, isCurrentStateExternallyManaged: false});
    await waitFor(() => expect(mockCC.setAgentState).toHaveBeenCalledWith(expect.objectContaining({auxCodeId: '2'})));
  });

  it('sends an explicit user selection after wellness-code lookup completes', async () => {
    const {result, rerender} = renderHook(
      ({currentState, wellnessIdleCodeLookupPending}) =>
        useUserState({
          idleCodes,
          agentId,
          cc: mockCC,
          currentState,
          customState: null,
          lastStateChangeTimestamp: 1_000,
          lastIdleCodeChangeTimestamp: 1_000,
          wellnessIdleCodeLookupPending,
          logger,
          onStateChange,
        }),
      {initialProps: {currentState: '1', wellnessIdleCodeLookupPending: true}}
    );

    act(() => result.current.setAgentStatus('2'));
    rerender({currentState: '2', wellnessIdleCodeLookupPending: true});
    expect(mockCC.setAgentState).not.toHaveBeenCalled();

    rerender({currentState: '2', wellnessIdleCodeLookupPending: false});
    await waitFor(() => expect(mockCC.setAgentState).toHaveBeenCalledWith(expect.objectContaining({auxCodeId: '2'})));
  });

  it('should handle errors from setAgentState and revert state', async () => {
    ccSetAgentStateSpy.mockRejectedValueOnce(new Error('Error setting agent status'));
    const {rerender, result} = renderHook(
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
    expect(store.setCurrentState).toHaveBeenCalledWith('0');
    expect(result.current.stateChangeError).toBe('Unable to update agent state.');
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
