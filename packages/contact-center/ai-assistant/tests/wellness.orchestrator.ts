import {act, renderHook, waitFor} from '@testing-library/react';
import type {UseWellnessBreakInput} from '../src/ai-assistant.types';
import {useWellnessBreak, WELLNESS_OFFER_TIMEOUT_MS, WELLNESS_RECOVERY_KEY} from '../src/wellness/useWellnessBreak';
import store from '@webex/cc-store';

jest.mock('@webex/cc-store', () => ({
  __esModule: true,
  WELLNESS_BREAK_NOTIFICATION_ACTIONS: {
    PROVIDE_WELLNESS_BREAK: 'PROVIDE_WELLNESS_BREAK',
    SUGGEST_WELLNESS_BREAK: 'SUGGEST_WELLNESS_BREAK',
    WELLNESS_BREAK_NOT_ALLOWED: 'WELLNESS_BREAK_NOT_ALLOWED',
  },
  WELLNESS_BREAK_USER_ACTIONS: {
    REQUESTED: 'REQUESTED',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    NO_RESPONSE: 'NO_RESPONSE',
  },
  default: {
    cc: {
      setAgentState: jest.fn(),
      apiAIAssistant: {
        requestWellnessBreak: jest.fn(),
        respondToWellnessBreak: jest.fn(),
      },
    },
    setWellnessBreakState: jest.fn(),
    submitBehavioralMetric: jest.fn(),
    logger: {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  },
}));

type StoreMock = {
  cc: {
    setAgentState: jest.Mock;
    apiAIAssistant: {
      requestWellnessBreak: jest.Mock;
      respondToWellnessBreak: jest.Mock;
    };
  };
  setWellnessBreakState: jest.Mock;
  submitBehavioralMetric: jest.Mock;
};

const storeMock = store as unknown as StoreMock;
const OriginalAudio = window.Audio;
const event = {
  agentId: 'agent-1',
  orgId: 'org-1',
  agentSessionId: 'session-1',
  actionEvent: 'SUGGEST_WELLNESS_BREAK' as const,
};

const baseInput: UseWellnessBreakInput = {
  enabled: true,
  isLoggedIn: true,
  agentId: 'agent-1',
  agentSessionId: 'session-1',
  wellbeingBreakIdleCode: {id: 'wellness', name: 'WellbeingBreak', isSystem: true, isDefault: false},
  wellnessBreakState: {phase: 'idle'},
  wellnessEventSequence: 0,
  legacyAgentState: 'Available',
  legacyAuxCodeId: '0',
  taskList: {},
  theme: 'LIGHT',
};

describe('useWellnessBreak', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    storeMock.cc.setAgentState.mockResolvedValue(undefined);
    storeMock.cc.apiAIAssistant.requestWellnessBreak.mockResolvedValue(undefined);
    storeMock.cc.apiAIAssistant.respondToWellnessBreak.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    window.Audio = OriginalAudio;
  });

  it('enables REQUESTED only after SUGGEST and leaves approval to a later notification', async () => {
    const {result} = renderHook(() =>
      useWellnessBreak({
        ...baseInput,
        wellnessBreakState: {phase: 'idle', event},
        wellnessEventSequence: 1,
      })
    );

    await waitFor(() => expect(result.current.requestAvailable).toBe(true));
    await act(async () => result.current.onRequest());

    expect(storeMock.cc.apiAIAssistant.requestWellnessBreak).toHaveBeenCalledWith();
    expect(result.current.requestAvailable).toBe(false);
    expect(storeMock.setWellnessBreakState).toHaveBeenCalledWith({phase: 'idle', event});
    expect(storeMock.setWellnessBreakState).toHaveBeenCalledWith({phase: 'request-pending'});
    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).not.toHaveBeenCalled();
    expect(storeMock.submitBehavioralMetric).toHaveBeenCalledWith({
      name: 'Wellness Break CTA User Request',
      agent: 'user',
      target: 'wellness_break_cta',
      verb: 'request',
    });
  });

  it('ignores a request failure after the agent session changes', async () => {
    let rejectRequest: ((reason?: unknown) => void) | undefined;
    storeMock.cc.apiAIAssistant.requestWellnessBreak.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectRequest = reject;
        })
    );
    const onWellnessBreakError = jest.fn();
    const {result, rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {
        ...baseInput,
        wellnessBreakState: {phase: 'idle', event},
        wellnessEventSequence: 1,
        onWellnessBreakError,
      },
    });

    await waitFor(() => expect(result.current.requestAvailable).toBe(true));
    act(() => {
      result.current.onRequest();
    });
    rerender({
      ...baseInput,
      agentSessionId: 'session-2',
      onWellnessBreakError,
    });
    await act(async () => {
      rejectRequest?.(new Error('stale request'));
      await Promise.resolve();
    });

    expect(onWellnessBreakError).not.toHaveBeenCalled();
    expect(storeMock.setWellnessBreakState).not.toHaveBeenCalledWith(
      expect.objectContaining({phase: 'error', errorCode: 'ACTION_REQUEST_FAILED'})
    );
  });

  it('keeps a consumed manual CTA unavailable until a fresh SUGGEST arrives', async () => {
    const denied = {
      ...event,
      actionEvent: 'WELLNESS_BREAK_NOT_ALLOWED' as const,
      actionText: 'Sorry, you have already reached your limit for today.',
    };
    const nextSuggestion = {...event, actionText: 'A new suggested break is available.'};
    const {result, rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {
        ...baseInput,
        wellnessBreakState: {phase: 'idle', event},
        wellnessEventSequence: 1,
      },
    });

    await waitFor(() => expect(result.current.requestAvailable).toBe(true));
    await act(async () => result.current.onRequest());
    expect(result.current.requestAvailable).toBe(false);

    rerender({
      ...baseInput,
      wellnessBreakState: {phase: 'request-pending', event: denied},
      wellnessEventSequence: 2,
    });
    await waitFor(() => expect(result.current.notice).toBe('not-allowed'));
    expect(result.current.requestAvailable).toBe(false);
    expect(storeMock.setWellnessBreakState).toHaveBeenCalledWith({phase: 'idle', event: denied});

    rerender({
      ...baseInput,
      wellnessBreakState: {phase: 'idle', event: nextSuggestion},
      wellnessEventSequence: 3,
    });
    await waitFor(() => expect(result.current.requestAvailable).toBe(true));
    expect(result.current.notice).toBeUndefined();
  });

  it('consumes a stale suggestion when a direct PROVIDE becomes an offer', async () => {
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result, rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {
        ...baseInput,
        wellnessBreakState: {phase: 'idle', event},
        wellnessEventSequence: 1,
      },
    });

    await waitFor(() => expect(result.current.requestAvailable).toBe(true));
    rerender({
      ...baseInput,
      wellnessBreakState: {phase: 'idle', event: provide},
      wellnessEventSequence: 2,
    });

    await waitFor(() => expect(result.current.requestAvailable).toBe(false));
    expect(storeMock.setWellnessBreakState).toHaveBeenCalledWith(
      expect.objectContaining({phase: 'offer-pending', event: provide})
    );
  });

  it('treats PROVIDE for a pending manual request as approval without redundant ACCEPTED', async () => {
    const onWellnessBreakAccepted = jest.fn();
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {
        ...baseInput,
        wellnessBreakState: {phase: 'request-pending'},
        onWellnessBreakAccepted,
      },
    });

    rerender({
      ...baseInput,
      wellnessBreakState: {phase: 'request-pending', event: provide},
      wellnessEventSequence: 1,
      onWellnessBreakAccepted,
    });

    await waitFor(() => expect(storeMock.cc.setAgentState).toHaveBeenCalled());
    expect(storeMock.cc.setAgentState).toHaveBeenCalledWith(
      expect.objectContaining({state: 'Idle', auxCodeId: 'wellness', agentId: 'agent-1'})
    );
    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).not.toHaveBeenCalled();
    await waitFor(() => expect(onWellnessBreakAccepted).toHaveBeenCalledWith(provide));
    expect(JSON.parse(window.sessionStorage.getItem(WELLNESS_RECOVERY_KEY) || '{}')).toEqual({
      version: 1,
      agentSessionId: 'session-1',
      preBreakLegacyState: 'Available',
      preBreakLegacyAuxCodeId: '0',
    });
  });

  it('sends ACCEPTED exactly once after a direct PROVIDE changes legacy state', async () => {
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result} = renderHook(() =>
      useWellnessBreak({
        ...baseInput,
        wellnessBreakState: {phase: 'offer-pending', event: provide},
      })
    );

    await act(async () => {
      result.current.onAccept('card');
      result.current.onAccept('card');
      await Promise.resolve();
    });

    expect(storeMock.cc.setAgentState).toHaveBeenCalledTimes(1);
    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).toHaveBeenCalledTimes(1);
    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).toHaveBeenCalledWith({
      action: 'ACCEPTED',
    });
    expect(storeMock.cc.setAgentState.mock.invocationCallOrder[0]).toBeLessThan(
      storeMock.cc.apiAIAssistant.respondToWellnessBreak.mock.invocationCallOrder[0]
    );
    expect(storeMock.submitBehavioralMetric).toHaveBeenCalledWith({
      name: 'Wellness Break Card Accepted',
      agent: 'user',
      target: 'wellness_break_card',
      verb: 'accept',
    });
  });

  it('accepts a direct offer from another notification session through the SDK-owned active context', async () => {
    const provide = {
      ...event,
      agentSessionId: 'notification-session',
      actionEvent: 'PROVIDE_WELLNESS_BREAK' as const,
    };
    const {result} = renderHook(() =>
      useWellnessBreak({
        ...baseInput,
        wellnessBreakState: {phase: 'offer-pending', event: provide},
      })
    );

    await act(async () => result.current.onAccept('card'));

    expect(storeMock.cc.setAgentState).toHaveBeenCalledWith(
      expect.objectContaining({state: 'Idle', auxCodeId: 'wellness', agentId: 'agent-1'})
    );
    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).toHaveBeenCalledWith({
      action: 'ACCEPTED',
    });
  });

  it('keeps a chronological wellness transcript until it is explicitly cleared', async () => {
    const provide = {
      ...event,
      actionEvent: 'PROVIDE_WELLNESS_BREAK' as const,
      actionText: 'This break is pre-approved.',
    };
    const {result, rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {
        ...baseInput,
        wellnessBreakState: {phase: 'idle', event: provide},
        wellnessEventSequence: 1,
      },
    });

    await waitFor(() => expect(result.current.history.map(({type}) => type)).toEqual(['offer']));
    rerender({
      ...baseInput,
      wellnessBreakState: {phase: 'offer-pending', event: provide},
      wellnessEventSequence: 1,
    });
    await act(async () => result.current.onAccept('card'));

    expect(result.current.history.map(({type}) => type)).toEqual(['offer', 'user-action', 'acknowledgement']);
    expect(result.current.history[0]).toMatchObject({type: 'offer', actionable: false, event: provide});

    act(() => result.current.onClearHistory());
    expect(result.current.history).toEqual([]);
    expect(result.current.contentCleared).toBe(true);
  });

  it('keeps a rotated-session offer in history without leaving its actions enabled', async () => {
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result, rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {
        ...baseInput,
        wellnessBreakState: {phase: 'idle', event: provide},
        wellnessEventSequence: 1,
      },
    });

    await waitFor(() => expect(result.current.history[0]).toMatchObject({type: 'offer', actionable: true}));
    rerender({...baseInput, agentSessionId: 'session-2', wellnessBreakState: {phase: 'idle'}});

    expect(result.current.history[0]).toMatchObject({type: 'offer', actionable: false});
    act(() => result.current.onAccept('card'));
    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).not.toHaveBeenCalled();
  });

  it('sends REJECTED exactly once when Later is selected for a direct PROVIDE', async () => {
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result} = renderHook(() =>
      useWellnessBreak({
        ...baseInput,
        wellnessBreakState: {phase: 'offer-pending', event: provide},
      })
    );

    await act(async () => {
      result.current.onLater('notification');
      result.current.onLater('notification');
      await Promise.resolve();
    });

    expect(storeMock.cc.setAgentState).not.toHaveBeenCalled();
    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).toHaveBeenCalledTimes(1);
    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).toHaveBeenCalledWith({
      action: 'REJECTED',
    });
    expect(result.current.notice).toBe('declined');
    expect(storeMock.submitBehavioralMetric).toHaveBeenCalledWith({
      name: 'Wellness Break Notification Rejected',
      agent: 'user',
      target: 'wellness_break_notification',
      verb: 'reject',
    });
  });

  it('sends NO_RESPONSE once for a live same-session offer', async () => {
    jest.useFakeTimers();
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {
        ...baseInput,
        wellnessBreakState: {phase: 'idle', event: provide},
        wellnessEventSequence: 1,
      },
    });
    rerender({
      ...baseInput,
      wellnessBreakState: {phase: 'offer-pending', event: provide},
      wellnessEventSequence: 1,
    });

    await act(async () => {
      jest.advanceTimersByTime(WELLNESS_OFFER_TIMEOUT_MS);
      await Promise.resolve();
    });
    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).toHaveBeenCalledTimes(1);
    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).toHaveBeenCalledWith({
      action: 'NO_RESPONSE',
    });
    expect(storeMock.submitBehavioralMetric).toHaveBeenCalledWith({
      name: 'Wellness Break Notification Timeout',
      agent: 'service',
      target: 'wellness_break_notification',
      verb: 'expire',
    });
  });

  it('records notification dismissal without inventing a backend action', () => {
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result} = renderHook(() =>
      useWellnessBreak({
        ...baseInput,
        wellnessBreakState: {phase: 'offer-pending', event: provide},
      })
    );

    act(() => result.current.onDismissNotification?.());

    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).not.toHaveBeenCalled();
    expect(storeMock.cc.setAgentState).not.toHaveBeenCalled();
    expect(storeMock.submitBehavioralMetric).toHaveBeenCalledWith({
      name: 'Wellness Break Notification Dismissed',
      agent: 'user',
      target: 'wellness_break_notification',
      verb: 'dismiss',
    });
  });

  it('does not send ACCEPTED when the state request fails', async () => {
    storeMock.cc.setAgentState.mockRejectedValueOnce(new Error('state failed'));
    const onWellnessBreakError = jest.fn();
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result} = renderHook(() =>
      useWellnessBreak({
        ...baseInput,
        wellnessBreakState: {phase: 'offer-pending', event: provide},
        onWellnessBreakError,
      })
    );

    await act(async () => result.current.onAccept());

    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).not.toHaveBeenCalled();
    expect(onWellnessBreakError).toHaveBeenCalledWith({
      code: 'STATE_CHANGE_FAILED',
      phase: 'changing-to-break',
      recoverable: true,
    });
  });

  it('sets Available when the break ends even if the agent was in Meeting before it', async () => {
    jest.useFakeTimers();
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const input = {
      ...baseInput,
      legacyAgentState: 'Idle',
      legacyAuxCodeId: 'meeting',
      wellnessBreakState: {phase: 'offer-pending' as const, event: provide},
    };
    const {result, rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: input,
    });

    await act(async () => result.current.onAccept());
    rerender({
      ...input,
      legacyAgentState: 'Idle',
      legacyAuxCodeId: 'wellness',
      wellnessBreakState: {phase: 'waiting-for-safe-state', event: provide},
    });

    await act(async () => {
      jest.advanceTimersByTime(2_000 + 5_000 + 60_000 + 5_000);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(storeMock.cc.setAgentState).toHaveBeenLastCalledWith({
        state: 'Available',
        auxCodeId: '0',
        agentId: 'agent-1',
        lastStateChangeReason: 'wellness-break-complete',
      })
    );
  });

  it('sets Available at the scheduled end even after an external state change during playback', async () => {
    jest.useFakeTimers();
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result, rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {...baseInput, wellnessBreakState: {phase: 'offer-pending', event: provide}},
    });

    await act(async () => result.current.onAccept());
    rerender({
      ...baseInput,
      legacyAgentState: 'Idle',
      legacyAuxCodeId: 'wellness',
      wellnessBreakState: {phase: 'waiting-for-safe-state', event: provide},
    });
    await act(async () => {
      jest.advanceTimersByTime(2_000 + 5_000);
      await Promise.resolve();
    });
    rerender({
      ...baseInput,
      legacyAgentState: 'Idle',
      legacyAuxCodeId: 'rona',
      wellnessBreakState: {phase: 'playing', event: provide},
    });
    await act(async () => {
      jest.advanceTimersByTime(60_000 + 5_000);
      await Promise.resolve();
    });

    expect(storeMock.cc.setAgentState).toHaveBeenLastCalledWith({
      state: 'Available',
      auxCodeId: '0',
      agentId: 'agent-1',
      lastStateChangeReason: 'wellness-break-complete',
    });
  });

  it('keeps retrying Available after a completed break even when the last observed state was external', async () => {
    jest.useFakeTimers();
    let restoreAttempts = 0;
    storeMock.cc.setAgentState.mockImplementation(({lastStateChangeReason}) => {
      if (lastStateChangeReason === 'wellness-break') return Promise.resolve();
      restoreAttempts += 1;
      return restoreAttempts <= 3 ? Promise.reject(new Error('restore failed')) : Promise.resolve();
    });
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result, rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {...baseInput, wellnessBreakState: {phase: 'offer-pending', event: provide}},
    });

    await act(async () => result.current.onAccept());
    rerender({
      ...baseInput,
      legacyAgentState: 'Idle',
      legacyAuxCodeId: 'wellness',
      wellnessBreakState: {phase: 'waiting-for-safe-state', event: provide},
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2_000 + 5_000);
    });
    rerender({
      ...baseInput,
      legacyAgentState: 'Idle',
      legacyAuxCodeId: 'rona',
      wellnessBreakState: {phase: 'playing', event: provide},
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60_000 + 5_000 + 20_000);
    });
    expect(restoreAttempts).toBe(3);

    rerender({
      ...baseInput,
      legacyAgentState: 'Idle',
      legacyAuxCodeId: 'rona',
      wellnessBreakState: {phase: 'error', errorCode: 'RESTORE_FAILED'},
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(20_000);
    });
    expect(restoreAttempts).toBe(4);
    expect(storeMock.cc.setAgentState).toHaveBeenLastCalledWith(
      expect.objectContaining({state: 'Available', auxCodeId: '0'})
    );
  });

  it('sets Available from a refresh marker after the first session hydration', async () => {
    window.sessionStorage.setItem(
      WELLNESS_RECOVERY_KEY,
      JSON.stringify({
        version: 1,
        agentSessionId: 'session-1',
        preBreakLegacyState: 'Idle',
        preBreakLegacyAuxCodeId: 'meeting',
      })
    );
    const {rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {
        ...baseInput,
        isLoggedIn: false,
        agentSessionId: '',
        legacyAgentState: '',
        legacyAuxCodeId: '',
      },
    });

    rerender({
      ...baseInput,
      legacyAgentState: 'Idle',
      legacyAuxCodeId: 'wellness',
    });

    await waitFor(() =>
      expect(storeMock.cc.setAgentState).toHaveBeenCalledWith({
        state: 'Available',
        auxCodeId: '0',
        agentId: 'agent-1',
        lastStateChangeReason: 'wellness-break-complete',
      })
    );
    expect(window.sessionStorage.getItem(WELLNESS_RECOVERY_KEY)).toBeNull();
  });

  it('surfaces a store-originated system-code error to the host', async () => {
    const onWellnessBreakError = jest.fn();
    const {result} = renderHook(() =>
      useWellnessBreak({
        ...baseInput,
        wellbeingBreakIdleCode: undefined,
        wellnessBreakState: {phase: 'error', errorCode: 'SYSTEM_CODE_UNAVAILABLE'},
        onWellnessBreakError,
      })
    );

    await waitFor(() => expect(onWellnessBreakError).toHaveBeenCalledTimes(1));
    expect(result.current.enabled).toBe(true);
    expect(result.current.error).toEqual({
      code: 'SYSTEM_CODE_UNAVAILABLE',
      phase: 'idle',
      recoverable: true,
    });
  });

  it('reports whether an active task is delaying the break', () => {
    const {result, rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: baseInput,
    });

    expect(result.current.hasBlockingTasks).toBe(false);
    rerender({
      ...baseInput,
      taskList: {
        active: {data: {interaction: {state: 'connected'}}},
      } as unknown as UseWellnessBreakInput['taskList'],
    });
    expect(result.current.hasBlockingTasks).toBe(true);
  });

  it('preloads break audio during the starting countdown and plays it with the timeline', async () => {
    jest.useFakeTimers();
    const audio = {
      currentTime: 8,
      load: jest.fn(),
      muted: true,
      pause: jest.fn(),
      play: jest.fn().mockResolvedValue(undefined),
      removeAttribute: jest.fn(),
      volume: 0,
    } as unknown as HTMLAudioElement;
    const audioConstructor = jest.fn(() => audio);
    window.Audio = audioConstructor as unknown as typeof Audio;
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result, rerender, unmount} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {
        ...baseInput,
        wellnessAudioUrl: '/wellness.mp3',
        wellnessBreakState: {phase: 'offer-pending', event: provide},
      },
    });

    await act(async () => result.current.onAccept());
    rerender({
      ...baseInput,
      wellnessAudioUrl: '/wellness.mp3',
      legacyAgentState: 'Idle',
      legacyAuxCodeId: 'wellness',
      wellnessBreakState: {phase: 'waiting-for-safe-state', event: provide},
    });

    await act(async () => {
      jest.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
    expect(audioConstructor).toHaveBeenCalledWith('/wellness.mp3');
    expect(audio.load).toHaveBeenCalledTimes(1);
    expect(audio.play).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    expect(audio.currentTime).toBe(0);
    expect(audio.muted).toBe(false);
    expect(audio.volume).toBe(1);
    expect(audio.play).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('clears pre-accept state on feature revocation and unmount', () => {
    const {rerender, unmount} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {...baseInput, wellnessBreakState: {phase: 'offer-pending', event}},
    });

    rerender({...baseInput, enabled: false, wellnessBreakState: {phase: 'offer-pending', event}});
    expect(storeMock.setWellnessBreakState).toHaveBeenCalledWith({phase: 'idle'});

    storeMock.setWellnessBreakState.mockClear();
    rerender({...baseInput, wellnessBreakState: {phase: 'request-pending'}});
    unmount();
    expect(storeMock.setWellnessBreakState).toHaveBeenCalledWith({phase: 'idle'});
  });

  it('waits for a pending break-state request before restoring on feature revocation', async () => {
    let resolveState: (() => void) | undefined;
    storeMock.cc.setAgentState.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveState = resolve;
        })
    );
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result, rerender} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {...baseInput, wellnessBreakState: {phase: 'offer-pending', event: provide}},
    });

    act(() => result.current.onAccept('card'));
    await act(async () => {
      await Promise.resolve();
    });
    rerender({...baseInput, enabled: false, wellnessBreakState: {phase: 'changing-to-break', event: provide}});
    expect(storeMock.cc.setAgentState).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveState?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(storeMock.cc.setAgentState).toHaveBeenCalledTimes(2));
    expect(storeMock.cc.setAgentState).toHaveBeenLastCalledWith(
      expect.objectContaining({state: 'Available', auxCodeId: '0', lastStateChangeReason: 'wellness-break-complete'})
    );
  });

  it('waits for a pending break-state request before restoring on unmount', async () => {
    let resolveState: (() => void) | undefined;
    storeMock.cc.setAgentState.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveState = resolve;
        })
    );
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result, unmount} = renderHook(() =>
      useWellnessBreak({...baseInput, wellnessBreakState: {phase: 'offer-pending', event: provide}})
    );

    act(() => result.current.onAccept('card'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(storeMock.cc.setAgentState).toHaveBeenCalledTimes(1);

    unmount();
    expect(storeMock.cc.setAgentState).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveState?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(storeMock.cc.setAgentState).toHaveBeenCalledTimes(2));
    expect(storeMock.cc.setAgentState).toHaveBeenLastCalledWith(
      expect.objectContaining({state: 'Available', auxCodeId: '0', lastStateChangeReason: 'wellness-break-complete'})
    );
    expect(storeMock.cc.apiAIAssistant.respondToWellnessBreak).not.toHaveBeenCalled();
  });

  it('does not overwrite an external state when unmounted during playback', async () => {
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const {result, rerender, unmount} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: {...baseInput, wellnessBreakState: {phase: 'offer-pending', event: provide}},
    });

    await act(async () => result.current.onAccept('card'));
    rerender({
      ...baseInput,
      legacyAgentState: 'Idle',
      legacyAuxCodeId: 'rona',
      wellnessBreakState: {phase: 'playing', event: provide},
    });
    unmount();
    await act(async () => {
      await Promise.resolve();
    });

    expect(storeMock.cc.setAgentState).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(WELLNESS_RECOVERY_KEY)).toBeNull();
  });

  it('gives a later break a fresh background restore retry budget', async () => {
    jest.useFakeTimers();
    storeMock.cc.apiAIAssistant.respondToWellnessBreak.mockRejectedValue(new Error('accept failed'));
    storeMock.cc.setAgentState.mockImplementation(({lastStateChangeReason}) =>
      lastStateChangeReason === 'wellness-break' ? Promise.resolve() : Promise.reject(new Error('restore failed'))
    );
    const provide = {...event, actionEvent: 'PROVIDE_WELLNESS_BREAK' as const};
    const offerInput = {...baseInput, wellnessBreakState: {phase: 'offer-pending' as const, event: provide}};
    const errorInput = {
      ...baseInput,
      legacyAgentState: 'Idle',
      legacyAuxCodeId: 'wellness',
      wellnessBreakState: {phase: 'error' as const, errorCode: 'RESTORE_FAILED' as const},
    };
    const {result, rerender, unmount} = renderHook((props: UseWellnessBreakInput) => useWellnessBreak(props), {
      initialProps: offerInput,
    });
    const advance = async (milliseconds: number) => {
      await act(async () => {
        await jest.advanceTimersByTimeAsync(milliseconds);
      });
    };
    const restoreCalls = () =>
      storeMock.cc.setAgentState.mock.calls.filter(
        ([params]) => params.lastStateChangeReason === 'wellness-break-complete'
      ).length;

    await act(async () => result.current.onAccept('card'));
    await advance(20_000);
    expect(restoreCalls()).toBe(3);
    rerender(errorInput);
    await advance(100_000);
    expect(restoreCalls()).toBe(8);

    rerender(offerInput);
    await act(async () => result.current.onAccept('card'));
    await advance(20_000);
    expect(restoreCalls()).toBe(11);
    rerender(errorInput);
    await advance(20_000);
    expect(restoreCalls()).toBe(12);

    rerender({...baseInput, agentSessionId: 'session-2'});
    unmount();
  });
});
