import {renderHook, act, waitFor} from '@testing-library/react';
import {useAiAssistant} from '../src/helper';
import store from '@webex/cc-store';

jest.mock('@webex/cc-store', () => {
  const clearSuggestedResponse = jest.fn();
  const getSuggestedResponse = jest.fn().mockResolvedValue({});
  return {
    __esModule: true,
    default: {
      cc: {
        apiAIAssistant: {
          getSuggestedResponse,
        },
      },
      clearSuggestedResponse,
    },
  };
});

type StoreMock = {
  cc: {apiAIAssistant: {getSuggestedResponse: jest.Mock}};
  clearSuggestedResponse: jest.Mock;
};
const storeMock = store as unknown as StoreMock;

const baseProps = {
  agentId: 'agent-1',
  interactionId: 'interaction-1',
  isFeatureEnabled: true,
  suggestions: [] as Array<{data: {adaptiveCard: unknown; title?: string}}>,
};

describe('useAiAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in the closed/idle state', () => {
    const {result} = renderHook(() => useAiAssistant(baseProps));
    expect(result.current.chrome).toBe('closed');
    expect(result.current.isFullScreen).toBe(false);
    expect(result.current.requestStatus).toBe('idle');
  });

  it('open/close/minimize/restore flips chrome state and fires callbacks', () => {
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const onMinimize = jest.fn();
    const onRestore = jest.fn();
    const {result} = renderHook(() => useAiAssistant({...baseProps, onOpen, onClose, onMinimize, onRestore}));

    act(() => result.current.open());
    expect(result.current.chrome).toBe('open');
    expect(onOpen).toHaveBeenCalled();

    act(() => result.current.minimize());
    expect(result.current.chrome).toBe('minimized');
    expect(onMinimize).toHaveBeenCalled();

    act(() => result.current.restore());
    expect(result.current.chrome).toBe('open');
    expect(onRestore).toHaveBeenCalled();

    act(() => result.current.close());
    expect(result.current.chrome).toBe('closed');
    expect(onClose).toHaveBeenCalled();
  });

  it('toggleFullScreen flips state and reports the next value', () => {
    const onFullScreenToggle = jest.fn();
    const {result} = renderHook(() => useAiAssistant({...baseProps, onFullScreenToggle}));

    act(() => result.current.toggleFullScreen());
    expect(result.current.isFullScreen).toBe(true);
    expect(onFullScreenToggle).toHaveBeenLastCalledWith(true);

    act(() => result.current.toggleFullScreen());
    expect(result.current.isFullScreen).toBe(false);
    expect(onFullScreenToggle).toHaveBeenLastCalledWith(false);
  });

  it('clearChat resets state, calls store.clearSuggestedResponse, and fires onClearChat', () => {
    const onClearChat = jest.fn();
    const {result} = renderHook(() => useAiAssistant({...baseProps, onClearChat}));

    act(() => result.current.setContextDraft('hello'));
    act(() => result.current.clearChat());

    expect(result.current.contextDraft).toBe('');
    expect(result.current.requestStatus).toBe('idle');
    expect(storeMock.clearSuggestedResponse).toHaveBeenCalledWith('interaction-1');
    expect(onClearChat).toHaveBeenCalled();
  });

  it('requestSuggestion sends the right shape and sets listening', async () => {
    const {result} = renderHook(() => useAiAssistant(baseProps));

    await act(async () => {
      result.current.requestSuggestion();
    });

    expect(storeMock.cc.apiAIAssistant.getSuggestedResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'agent-1',
        interactionId: 'interaction-1',
        actionTimeStamp: expect.any(Number),
      })
    );
    expect(result.current.requestStatus).toBe('listening');
  });

  it('flips status to ready and notifies host once a suggestion arrives', async () => {
    const onSuggestionReceived = jest.fn();
    const payload = {data: {adaptiveCard: {type: 'AdaptiveCard'}, title: 'Refund policy'}};

    const {result, rerender} = renderHook((props: {suggestions?: Array<typeof payload>} = {}) =>
      useAiAssistant({...baseProps, ...props, suggestions: props.suggestions ?? [], onSuggestionReceived})
    );

    await act(async () => {
      result.current.requestSuggestion();
    });
    expect(result.current.requestStatus).toBe('listening');

    rerender({suggestions: [payload]});

    await waitFor(() => expect(result.current.requestStatus).toBe('ready'));
    expect(onSuggestionReceived).toHaveBeenCalledWith(payload);
  });

  it('appends additional suggestions and notifies the host on each', async () => {
    const onSuggestionReceived = jest.fn();
    const first = {data: {adaptiveCard: {type: 'AdaptiveCard'}, title: 'first'}};
    const second = {data: {adaptiveCard: {type: 'AdaptiveCard'}, title: 'second'}};

    const {result, rerender} = renderHook((props: {suggestions?: Array<typeof first>} = {}) =>
      useAiAssistant({...baseProps, ...props, suggestions: props.suggestions ?? [], onSuggestionReceived})
    );

    rerender({suggestions: [first]});
    await waitFor(() => expect(onSuggestionReceived).toHaveBeenLastCalledWith(first));

    rerender({suggestions: [first, second]});
    await waitFor(() => expect(onSuggestionReceived).toHaveBeenLastCalledWith(second));
    expect(onSuggestionReceived).toHaveBeenCalledTimes(2);
    expect(result.current.requestStatus).toBe('ready');
  });

  it('adds user context messages alongside assistant suggestions in chatEntries', async () => {
    const first = {
      data: {adaptiveCard: {type: 'AdaptiveCard'}, title: 'first', publishTimestamp: Date.now() + 100},
    };
    const second = {
      data: {adaptiveCard: {type: 'AdaptiveCard'}, title: 'second', publishTimestamp: Date.now() + 2000},
    };

    const {result, rerender} = renderHook((props: {suggestions?: Array<typeof first>} = {}) =>
      useAiAssistant({...baseProps, ...props, suggestions: props.suggestions ?? []})
    );

    // First Get Suggestions (no context) → first assistant response arrives.
    // After the first request the chat is seeded with an assistant greeting.
    await act(async () => {
      result.current.requestSuggestion();
    });
    rerender({suggestions: [first]});
    await waitFor(() => expect(result.current.requestStatus).toBe('ready'));
    expect(result.current.chatEntries[0]).toMatchObject({type: 'assistant-greeting'});
    expect(result.current.chatEntries.some((e) => e.type === 'assistant')).toBe(true);

    // Agent types context and sends → user entry appears, then second
    // assistant response arrives
    act(() => result.current.setContextDraft('refunds question'));
    await act(async () => {
      result.current.submitContext();
    });
    expect(result.current.chatEntries.some((e) => e.type === 'user' && e.text === 'refunds question')).toBe(true);

    rerender({suggestions: [first, second]});
    await waitFor(() => expect(result.current.chatEntries.filter((e) => e.type === 'assistant')).toHaveLength(2));

    const types = result.current.chatEntries.map((e) => e.type);
    expect(types).toContain('user');
    expect(types).toContain('assistant-greeting');
    expect(types.filter((t) => t === 'assistant')).toHaveLength(2);
  });

  it('errors out when feature flag is off', async () => {
    const {result} = renderHook(() => useAiAssistant({...baseProps, isFeatureEnabled: false}));

    await act(async () => {
      result.current.requestSuggestion();
    });

    expect(result.current.requestStatus).toBe('error');
    expect(storeMock.cc.apiAIAssistant.getSuggestedResponse).not.toHaveBeenCalled();
  });

  it('submitContext requests with the trimmed draft and clears it', async () => {
    const {result} = renderHook(() => useAiAssistant(baseProps));

    act(() => result.current.setContextDraft('  refund policy  '));
    await act(async () => {
      result.current.submitContext();
    });

    expect(storeMock.cc.apiAIAssistant.getSuggestedResponse).toHaveBeenCalledWith(
      expect.objectContaining({context: 'refund policy'})
    );
    expect(result.current.contextDraft).toBe('');
  });

  it('submitContext is a no-op when draft is empty', async () => {
    const {result} = renderHook(() => useAiAssistant(baseProps));
    await act(async () => {
      result.current.submitContext();
    });
    expect(storeMock.cc.apiAIAssistant.getSuggestedResponse).not.toHaveBeenCalled();
  });

  it('records error path when SDK rejects', async () => {
    storeMock.cc.apiAIAssistant.getSuggestedResponse.mockRejectedValueOnce(new Error('boom'));

    const {result} = renderHook(() => useAiAssistant(baseProps));
    await act(async () => {
      await result.current.requestSuggestion();
    });

    expect(result.current.requestStatus).toBe('error');
    expect(result.current.errorMessage).toBe('boom');
  });
});
