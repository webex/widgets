import React from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import AIAssistantComponent from '../../../src/components/AIAssistant/ai-assistant';
import {AI_SUMMARY_MESSAGES} from '../../../src/components/AISummary';
import type {
  AIAssistantComponentProps,
  AIAssistantActionEvent,
} from '../../../src/components/AIAssistant/ai-assistant.types';

jest.mock('@webex/cc-ui-logging', () => ({
  withMetrics: (Component: React.ComponentType) => Component,
}));

jest.mock('../../../src/components/AIAssistant/AdaptiveCardRenderer/adaptive-card-renderer', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  const hasActionNode = (value: unknown): boolean => {
    if (Array.isArray(value)) {
      return value.some(hasActionNode);
    }
    if (!value || typeof value !== 'object') {
      return false;
    }
    const record = value as Record<string, unknown>;
    return (
      (typeof record.type === 'string' && (record.type === 'ActionSet' || record.type.startsWith('Action.'))) ||
      Object.values(record).some(hasActionNode)
    );
  };
  return {
    __esModule: true,
    default: ({
      card,
      fallbackText,
      onUserAction,
    }: {
      card?: unknown;
      fallbackText?: string;
      onUserAction?: (event: AIAssistantActionEvent) => void;
    }) => {
      const [rendered, setRendered] = ReactModule.useState(
        !(card as {mockDeferredRender?: boolean} | undefined)?.mockDeferredRender
      );
      ReactModule.useEffect(() => setRendered(true), [card]);
      const shouldFallback = Boolean((card as {mockFallback?: boolean} | undefined)?.mockFallback);
      const shouldRenderAction = Boolean(onUserAction || hasActionNode(card));
      const renderedText =
        typeof (card as {mockRenderedText?: unknown} | undefined)?.mockRenderedText === 'string'
          ? (card as {mockRenderedText: string}).mockRenderedText
          : 'Visible receiver card copy';
      return ReactModule.createElement(
        'div',
        {
          'data-testid': 'ai-assistant:adaptive-card',
        },
        shouldFallback
          ? ReactModule.createElement('span', {'data-testid': 'ai-assistant:adaptive-card-fallback'}, fallbackText)
          : ReactModule.createElement(
              'div',
              {className: 'ai-assistant__card-host'},
              rendered ? ReactModule.createElement('span', {className: 'ac-textBlock'}, renderedText) : null,
              shouldRenderAction
                ? ReactModule.createElement(
                    'button',
                    {
                      type: 'button',
                      'data-testid': 'mock-adaptive-card',
                      onClick: () => onUserAction?.({type: 'like', actionId: 'likeButton'}),
                    },
                    'Mock card action'
                  )
                : null
            )
      );
    },
  };
});

const createProps = (overrides: Partial<AIAssistantComponentProps> = {}): AIAssistantComponentProps => ({
  chrome: 'open',
  isFullScreen: false,
  requestStatus: 'idle',
  contextDraft: '',
  isRequesting: false,
  chatEntries: [],
  isFeatureEnabled: true,
  hasActiveInteraction: true,
  agentName: 'User5 Agent5',
  hasInitialRequestSucceeded: false,
  open: jest.fn(),
  close: jest.fn(),
  minimize: jest.fn(),
  restore: jest.fn(),
  toggleFullScreen: jest.fn(),
  requestRealTimeAssist: jest.fn(),
  setContextDraft: jest.fn(),
  submitContext: jest.fn(),
  ...overrides,
});

type ReceiverSummaryContent = Extract<NonNullable<AIAssistantComponentProps['receiverSummary']>, {surface: 'content'}>;

const createReceiverSummary = (overrides: Partial<ReceiverSummaryContent> = {}): ReceiverSummaryContent => ({
  surface: 'content',
  branchKey: 'interaction-1:agent-1:1',
  content: {
    type: 'card',
    adaptiveCard: {type: 'AdaptiveCard', version: '1.5', body: [{type: 'TextBlock', text: 'Receiver summary'}]},
  },
  contentRevision: 3,
  actionType: 'TRANSFER',
  selectedFeedback: 'none',
  midCallFeedbackPending: false,
  controlsDisabled: false,
  openReceiverSummary: jest.fn().mockReturnValue(true),
  recordReceiverSummaryCopied: jest.fn().mockReturnValue(true),
  setReceiverSummaryFeedback: jest.fn().mockResolvedValue({outcome: 'confirmed'}),
  ...overrides,
});

const renderStatefulReceiver = (
  initialChrome: AIAssistantComponentProps['chrome'],
  receiverSummary: ReceiverSummaryContent = createReceiverSummary(),
  overrides: Partial<AIAssistantComponentProps> = {}
) => {
  const controls = {
    open: jest.fn(),
    close: jest.fn(),
    minimize: jest.fn(),
    restore: jest.fn(),
  };
  const Harness = () => {
    const [chrome, setChrome] = React.useState<AIAssistantComponentProps['chrome']>(initialChrome);

    return (
      <AIAssistantComponent
        {...createProps({
          ...overrides,
          chrome,
          receiverSummary,
          open: () => {
            controls.open();
            setChrome('open');
          },
          close: () => {
            controls.close();
            setChrome('closed');
          },
          minimize: () => {
            controls.minimize();
            setChrome('minimized');
          },
          restore: () => {
            controls.restore();
            setChrome('open');
          },
        })}
      />
    );
  };

  render(<Harness />);
  return controls;
};

describe('AIAssistantComponent', () => {
  it('invokes the launcher, minimized, and header chrome actions', () => {
    const props = createProps({chrome: 'closed'});
    const {rerender} = render(<AIAssistantComponent {...props} />);

    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));
    expect(props.open).toHaveBeenCalledTimes(1);

    rerender(<AIAssistantComponent {...props} chrome="minimized" />);
    fireEvent.click(screen.getByTestId('ai-assistant:minimized-restore'));
    fireEvent.click(screen.getByTestId('ai-assistant:minimized-close'));
    expect(props.restore).toHaveBeenCalledTimes(1);
    expect(props.close).toHaveBeenCalledTimes(1);

    rerender(<AIAssistantComponent {...props} chrome="open" />);
    fireEvent.click(screen.getByTestId('ai-assistant:header-minimize'));
    fireEvent.click(screen.getByTestId('ai-assistant:header-fullscreen'));
    fireEvent.click(screen.getByTestId('ai-assistant:header-close'));
    expect(props.minimize).toHaveBeenCalledTimes(1);
    expect(props.toggleFullScreen).toHaveBeenCalledTimes(1);
    expect(props.close).toHaveBeenCalledTimes(2);
  });

  it('renders the empty state and requests a suggestion', () => {
    const props = createProps();
    render(<AIAssistantComponent {...props} />);

    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:context-form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ai-assistant:get-suggestions'));
    expect(props.requestRealTimeAssist).toHaveBeenCalledTimes(1);
  });

  it('renders the landing page without Real-time Assist when the feature is disabled', () => {
    const props = createProps({isFeatureEnabled: false});
    render(<AIAssistantComponent {...props} />);

    expect(screen.getByTestId('ai-assistant:landing')).toHaveTextContent("Hi User5 Agent5. I'm your AI Assistant");
    expect(screen.queryByText('Real-time Assist')).not.toBeInTheDocument();
    expect(screen.getByText('Wellness breaks')).toBeInTheDocument();
    expect(screen.getByText('Smart summaries')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:context-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:footer')).not.toBeInTheDocument();
  });

  it('shows Real-time Assist on the landing page before an interaction starts', () => {
    render(<AIAssistantComponent {...createProps({hasActiveInteraction: false})} />);

    expect(screen.getByTestId('ai-assistant:landing')).toBeInTheDocument();
    expect(screen.getByText('Real-time Assist')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:empty')).not.toBeInTheDocument();
  });

  it('buffers in place while the first request is in flight', () => {
    render(<AIAssistantComponent {...createProps({requestStatus: 'listening', isRequesting: true})} />);

    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:requesting')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:get-suggestions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:context-form')).not.toBeInTheDocument();
  });

  it('stays on the initial prompt with the reason when the first request fails', () => {
    const props = createProps({requestStatus: 'error', errorMessage: 'Real-time assistance failed'});
    render(<AIAssistantComponent {...props} />);

    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:error')).toHaveTextContent('Real-time assistance failed');
    expect(screen.queryByTestId('ai-assistant:listening')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-assistant:get-suggestions'));
    expect(props.requestRealTimeAssist).toHaveBeenCalledTimes(1);
  });

  it('shows a generic reason when a failed request carries no message', () => {
    render(<AIAssistantComponent {...createProps({requestStatus: 'error'})} />);

    expect(screen.getByTestId('ai-assistant:error')).toHaveTextContent(
      'Something went wrong while requesting a suggestion.'
    );
  });

  it('keeps listening mode when a later context request fails', () => {
    const props = createProps({
      requestStatus: 'error',
      errorMessage: 'Real-time assistance failed',
      hasInitialRequestSucceeded: true,
      chatEntries: [{type: 'assistant-greeting', id: 'greeting', text: 'Greeting'}],
    });
    render(<AIAssistantComponent {...props} />);

    expect(screen.getByTestId('ai-assistant:listening')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:error')).not.toBeInTheDocument();
  });

  it('updates and submits context after the initial request', () => {
    const props = createProps({
      requestStatus: 'listening',
      hasInitialRequestSucceeded: true,
      contextDraft: 'refund policy',
    });
    render(<AIAssistantComponent {...props} />);

    const listening = screen.getByTestId('ai-assistant:listening');
    expect(listening).toHaveTextContent('Listening');
    expect(listening.querySelectorAll('.ai-assistant__chat-listening-dot')).toHaveLength(3);

    const input = screen.getByTestId('ai-assistant:context-input');
    fireEvent(
      input,
      new CustomEvent('input', {
        bubbles: true,
        detail: {value: 'updated context'},
      })
    );
    expect(props.setContextDraft).toHaveBeenCalledWith('updated context');

    fireEvent.submit(screen.getByTestId('ai-assistant:context-form'));
    expect(props.submitContext).toHaveBeenCalledTimes(1);
  });

  it('blocks a second context submit while the previous request is in flight', () => {
    const props = createProps({
      requestStatus: 'listening',
      hasInitialRequestSucceeded: true,
      contextDraft: 'refund policy',
      isRequesting: true,
    });
    render(<AIAssistantComponent {...props} />);

    expect((screen.getByTestId('ai-assistant:context-submit') as HTMLElement & {disabled: boolean}).disabled).toBe(
      true
    );

    fireEvent.submit(screen.getByTestId('ai-assistant:context-form'));
    expect(props.submitContext).not.toHaveBeenCalled();
  });

  it('renders a customer-statement title supplied only by its adaptive card', () => {
    const props = createProps({
      requestStatus: 'ready',
      hasInitialRequestSucceeded: true,
      chatEntries: [
        {
          type: 'assistant',
          id: 'customer-statement',
          realTimeAssist: {
            data: {
              adaptiveCard: {
                type: 'AdaptiveCard',
                body: [{type: 'TextBlock', text: 'The customer said:'}],
              },
            },
          },
        },
      ],
    });

    render(<AIAssistantComponent {...props} />);

    expect(screen.getByText('The customer said:')).toBeInTheDocument();
  });

  it('renders chat entries and forwards adaptive-card feedback with its assist payload', () => {
    const onRealTimeAssistAction = jest.fn();
    const assist = {
      data: {
        adaptiveCard: {type: 'AdaptiveCard'},
        adaptiveCardId: 'card-1',
        title: 'Suggested response',
        suggestion: 'Use the refund workflow',
      },
    };
    const props = createProps({
      requestStatus: 'ready',
      hasInitialRequestSucceeded: true,
      onRealTimeAssistAction,
      chatEntries: [
        {type: 'assistant-greeting', id: 'greeting-1', text: 'How can I help?'},
        {type: 'user', id: 'user-1', text: 'Help with a refund'},
        {type: 'assistant', id: 'assistant-1', realTimeAssist: assist},
      ],
    });
    render(<AIAssistantComponent {...props} />);

    expect(screen.getByTestId('ai-assistant:chat-greeting')).toHaveTextContent('How can I help?');
    expect(screen.getByTestId('ai-assistant:chat-user')).toHaveTextContent('Help with a refund');
    expect(screen.getByTestId('ai-assistant:chat-assistant')).toHaveTextContent('Suggested response');

    fireEvent.click(screen.getByTestId('mock-adaptive-card'));
    expect(onRealTimeAssistAction).toHaveBeenCalledWith({type: 'like', actionId: 'likeButton'}, assist);
  });

  it('renders the exact native receiver trigger only in closed and minimized chrome slots', () => {
    const receiverSummary = createReceiverSummary();
    const {rerender} = render(<AIAssistantComponent {...createProps({chrome: 'open', receiverSummary})} />);

    expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();

    rerender(<AIAssistantComponent {...createProps({chrome: 'closed', receiverSummary})} />);

    const trigger = screen.getByTestId('ai-assistant:view-summary');
    expect(trigger.tagName.toLowerCase()).toBe('button');
    expect(trigger).toHaveTextContent(AI_SUMMARY_MESSAGES.viewSummary);
    expect(trigger).toHaveAttribute('aria-label', AI_SUMMARY_MESSAGES.viewSummary);
    expect(trigger).toHaveAttribute('title', AI_SUMMARY_MESSAGES.viewSummary);
    expect(screen.getByTestId('ai-assistant:closed-chrome')).toContainElement(trigger);

    rerender(<AIAssistantComponent {...createProps({chrome: 'minimized', receiverSummary})} />);

    expect(screen.getByTestId('ai-assistant:minimized-bar')).toContainElement(
      screen.getByTestId('ai-assistant:view-summary')
    );

    rerender(<AIAssistantComponent {...createProps({chrome: 'closed'})} />);

    expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();
  });

  it('opens the receiver branch from closed and minimized chrome and recovers focus into the panel', async () => {
    const controls = renderStatefulReceiver('closed');

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(controls.open).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('ai-assistant:header-minimize')).toHaveFocus());

    fireEvent.click(screen.getByTestId('ai-assistant:header-minimize'));
    expect(await screen.findByTestId('ai-assistant:panel-minimized')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(controls.restore).toHaveBeenCalledTimes(1);
    expect(controls.open).toHaveBeenCalledTimes(1);
  });

  it('applies automatic direction to mixed-direction receiver summary content only', async () => {
    const receiverSummary = createReceiverSummary({
      content: {
        type: 'card',
        adaptiveCard: {
          type: 'AdaptiveCard',
          version: '1.5',
          mockRenderedText: 'סיכום Receiver 42',
          body: [{type: 'TextBlock', text: 'סיכום Receiver 42'}],
        },
      },
    });
    renderStatefulReceiver('closed', receiverSummary);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    const receiverBranch = await screen.findByTestId('ai-assistant:receiver-summary');
    expect(receiverBranch).not.toHaveAttribute('dir', 'auto');
    const card = within(receiverBranch).getByTestId('ai-assistant:adaptive-card');
    expect(card.closest('[dir]')).toHaveAttribute('dir', 'auto');
    const actions = await screen.findByTestId('ai-summary:actions');
    expect(actions.closest('[dir]')).not.toHaveAttribute('dir', 'auto');
    expect(screen.getByTestId('ai-assistant:panel')).not.toHaveAttribute('dir');
    expect(within(receiverBranch).getByText('סיכום Receiver 42')).toBeInTheDocument();
  });

  it('falls back to the panel root when the receiver focus successor is unavailable', async () => {
    const originalQuerySelector = HTMLDivElement.prototype.querySelector;
    const querySelector = jest.spyOn(HTMLDivElement.prototype, 'querySelector').mockImplementation(function (
      this: HTMLDivElement,
      selectors: string
    ) {
      if (
        selectors === '[data-testid="ai-assistant:header-minimize"]' &&
        this.dataset.testid === 'ai-assistant:panel'
      ) {
        return null;
      }
      return originalQuerySelector.call(this, selectors);
    });

    try {
      renderStatefulReceiver('closed');

      fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

      await waitFor(() => expect(screen.getByTestId('ai-assistant:panel')).toHaveFocus());
    } finally {
      querySelector.mockRestore();
    }
  });

  it('keeps receiver card actions inert and copies only visible rendered card text', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText: jest.fn().mockResolvedValue(undefined)},
    });
    const receiverSummary = createReceiverSummary({
      content: {
        type: 'card',
        adaptiveCard: {
          type: 'AdaptiveCard',
          version: '1.5',
          selectAction: {type: 'Action.Submit', id: 'selectCard', title: 'Select'},
          body: [
            {type: 'TextBlock', text: 'Receiver summary'},
            {
              type: 'ActionSet',
              actions: [
                {type: 'Action.Submit', id: 'copyButton', title: 'Copy'},
                {type: 'Action.Execute', id: 'likeButton', title: 'Like'},
              ],
            },
          ],
          actions: [{type: 'Action.Submit', id: 'dislikeButton', title: 'Dislike'}],
        },
      },
    });
    renderStatefulReceiver('closed', receiverSummary);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    const card = await screen.findByTestId('ai-assistant:adaptive-card');
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();

    const copyButton = await screen.findByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary});
    expect(card).not.toContainElement(screen.getByTestId('ai-summary:actions'));
    fireEvent.click(copyButton);

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Visible receiver card copy'));
    expect(receiverSummary.recordReceiverSummaryCopied).toHaveBeenCalledWith(3);
  });

  it('paints receiver feedback only after the host confirms the action', async () => {
    let resolveFeedback: (value: {outcome: 'confirmed'}) => void = () => undefined;
    const pendingFeedback = new Promise<{outcome: 'confirmed'}>((resolve) => {
      resolveFeedback = resolve;
    });
    const receiverSummary = createReceiverSummary({
      setReceiverSummaryFeedback: jest.fn().mockReturnValue(pendingFeedback),
    });
    renderStatefulReceiver('closed', receiverSummary);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    const like = await screen.findByRole('button', {name: AI_SUMMARY_MESSAGES.like});
    fireEvent.click(like);

    expect(receiverSummary.setReceiverSummaryFeedback).toHaveBeenCalledWith('like', 'TRANSFER', 3);
    expect(like).toHaveAttribute('aria-pressed', 'false');

    resolveFeedback({outcome: 'confirmed'});

    await waitFor(() => expect(like).toHaveAttribute('aria-pressed', 'true'));
  });

  it('gates the receiver branch on accepted view recording and disables pending feedback controls', async () => {
    const openReceiverSummary = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);
    const receiverSummary = createReceiverSummary({
      midCallFeedbackPending: true,
      controlsDisabled: true,
      openReceiverSummary,
    });
    const controls = renderStatefulReceiver('closed', receiverSummary);

    const viewSummary = screen.getByTestId('ai-assistant:view-summary');
    expect(viewSummary).toHaveAttribute('aria-label', AI_SUMMARY_MESSAGES.viewSummary);
    expect(viewSummary).toHaveAttribute('title', AI_SUMMARY_MESSAGES.viewSummary);
    fireEvent.click(viewSummary);
    expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
    expect(controls.open).not.toHaveBeenCalled();

    fireEvent.click(viewSummary);
    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(await screen.findByRole('button', {name: AI_SUMMARY_MESSAGES.like})).toBeDisabled();
    expect(openReceiverSummary).toHaveBeenCalledTimes(2);
  });

  it('opens the receiver branch when Real-time Assist is disabled', async () => {
    renderStatefulReceiver(
      'closed',
      createReceiverSummary({
        contentRevision: 4,
      }),
      {isFeatureEnabled: false}
    );

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:landing')).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:footer')).toBeInTheDocument();
  });

  it('renders receiver actions when the host opens chrome after activation settles', async () => {
    const props = createProps({chrome: 'closed', receiverSummary: createReceiverSummary()});
    const {rerender} = render(<AIAssistantComponent {...props} />);
    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    expect(props.open).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('ai-summary:actions')).not.toBeInTheDocument();
    rerender(<AIAssistantComponent {...props} chrome="open" />);
    expect(await screen.findByTestId('ai-summary:actions')).toBeInTheDocument();
  });

  it('removes receiver actions when the renderer falls back and restores panel focus', async () => {
    const receiverSummary = createReceiverSummary();
    const fallbackReceiverSummary = createReceiverSummary({
      branchKey: receiverSummary.branchKey,
      contentRevision: receiverSummary.contentRevision + 1,
      content: {
        type: 'card',
        adaptiveCard: {
          type: 'AdaptiveCard',
          mockFallback: true,
          body: [{type: 'Image', url: 'https://example.invalid/only.png'}],
        },
      },
    });
    let setSummary: React.Dispatch<React.SetStateAction<ReceiverSummaryContent>> = () => undefined;
    const Harness = () => {
      const [chrome, setChrome] = React.useState<AIAssistantComponentProps['chrome']>('closed');
      const [summary, setSummaryState] = React.useState(receiverSummary);
      setSummary = setSummaryState;

      return (
        <AIAssistantComponent
          {...createProps({
            chrome,
            receiverSummary: summary,
            open: () => setChrome('open'),
            close: () => setChrome('closed'),
            minimize: () => setChrome('minimized'),
            restore: () => setChrome('open'),
          })}
        />
      );
    };
    render(<Harness />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    const copyButton = await screen.findByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary});
    act(() => {
      copyButton.focus();
    });
    expect(copyButton).toHaveFocus();

    act(() => {
      setSummary(fallbackReceiverSummary);
    });

    expect(await screen.findByTestId('ai-assistant:adaptive-card-fallback')).toHaveTextContent(
      AI_SUMMARY_MESSAGES.unavailable
    );
    await waitFor(() => expect(screen.queryByTestId('ai-summary:actions')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:panel')).toHaveFocus();
  });

  it.each([AI_SUMMARY_MESSAGES.copySummary, AI_SUMMARY_MESSAGES.like, AI_SUMMARY_MESSAGES.dislike])(
    'keeps the focused %s action connected when a valid receiver card is replaced',
    async (name) => {
      const receiverSummary = createReceiverSummary();
      let replaceSummary: React.Dispatch<React.SetStateAction<ReceiverSummaryContent>> = () => undefined;
      const Harness = () => {
        const [chrome, setChrome] = React.useState<AIAssistantComponentProps['chrome']>('closed');
        const [summary, setSummary] = React.useState(receiverSummary);
        replaceSummary = setSummary;
        return (
          <AIAssistantComponent {...createProps({chrome, receiverSummary: summary, open: () => setChrome('open')})} />
        );
      };
      render(<Harness />);
      fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
      const action = await screen.findByRole('button', {name});
      act(() => action.focus());

      act(() => {
        replaceSummary(
          createReceiverSummary({
            contentRevision: receiverSummary.contentRevision + 1,
            content: {
              type: 'card',
              adaptiveCard: {
                type: 'AdaptiveCard',
                mockDeferredRender: true,
                body: [{type: 'TextBlock', text: 'Replacement summary'}],
                mockRenderedText: 'Replacement summary',
              },
            },
          })
        );
      });

      await screen.findByText('Replacement summary');
      expect(screen.getByRole('button', {name})).toBe(action);
      expect(action).toHaveFocus();
    }
  );

  it.each(['closed', 'minimized'] as const)(
    'restores focus when a focused receiver trigger is omitted from %s chrome',
    (chrome) => {
      const props = createProps({chrome, receiverSummary: createReceiverSummary()});
      const {rerender} = render(<AIAssistantComponent {...props} />);
      act(() => screen.getByTestId('ai-assistant:view-summary').focus());
      expect(screen.getByTestId('ai-assistant:view-summary')).toHaveFocus();
      rerender(<AIAssistantComponent {...props} receiverSummary={undefined} />);
      expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();
      expect(
        screen.getByTestId(chrome === 'closed' ? 'ai-assistant:launcher' : 'ai-assistant:minimized-restore')
      ).toHaveFocus();
    }
  );

  it('preserves connected external focus when a receiver trigger is removed', () => {
    const props = createProps({chrome: 'closed', receiverSummary: createReceiverSummary()});
    const renderHost = (receiverSummary: AIAssistantComponentProps['receiverSummary']) => (
      <>
        <button type="button">Host control</button>
        <AIAssistantComponent {...props} receiverSummary={receiverSummary} />
      </>
    );
    const {rerender} = render(renderHost(props.receiverSummary));
    act(() => screen.getByTestId('ai-assistant:view-summary').focus());
    const host = screen.getByRole('button', {name: 'Host control'});
    act(() => host.focus());
    rerender(renderHost(undefined));
    expect(host).toHaveFocus();
  });

  it('restores panel focus when the whole receiver summary branch is removed', async () => {
    let clearSummary: () => void = () => undefined;
    const receiverSummary = createReceiverSummary();
    const Harness = () => {
      const [chrome, setChrome] = React.useState<AIAssistantComponentProps['chrome']>('closed');
      const [summary, setSummary] = React.useState<AIAssistantComponentProps['receiverSummary']>(receiverSummary);
      clearSummary = () => setSummary(undefined);

      return (
        <AIAssistantComponent
          {...createProps({
            chrome,
            receiverSummary: summary,
            open: () => setChrome('open'),
            close: () => setChrome('closed'),
            minimize: () => setChrome('minimized'),
            restore: () => setChrome('open'),
          })}
        />
      );
    };
    render(<Harness />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    const copyButton = await screen.findByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary});
    act(() => {
      copyButton.focus();
    });
    expect(copyButton).toHaveFocus();

    act(() => {
      clearSummary();
    });

    await waitFor(() => expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument());
    expect(screen.getByTestId('ai-assistant:panel')).toHaveFocus();
  });

  it('resets the receiver branch for ordinary chrome actions and owner changes', async () => {
    const receiverSummary = createReceiverSummary();
    const props = createProps({chrome: 'closed', receiverSummary});
    const {rerender} = render(<AIAssistantComponent {...props} />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    rerender(<AIAssistantComponent {...props} chrome="open" />);
    expect(screen.getByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-assistant:header-close'));
    expect(props.close).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();

    rerender(<AIAssistantComponent {...props} chrome="closed" />);
    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    rerender(<AIAssistantComponent {...props} chrome="open" />);
    expect(screen.getByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    rerender(<AIAssistantComponent {...props} chrome="closed" />);
    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));
    rerender(<AIAssistantComponent {...props} chrome="open" />);
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();

    rerender(<AIAssistantComponent {...props} chrome="closed" />);
    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    rerender(<AIAssistantComponent {...props} chrome="open" />);
    expect(screen.getByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    rerender(<AIAssistantComponent {...props} chrome="minimized" />);
    fireEvent.click(screen.getByTestId('ai-assistant:minimized-restore'));
    rerender(<AIAssistantComponent {...props} chrome="open" />);
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();

    rerender(<AIAssistantComponent {...props} chrome="closed" />);
    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    rerender(<AIAssistantComponent {...props} chrome="open" />);
    expect(screen.getByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    rerender(
      <AIAssistantComponent
        {...props}
        chrome="open"
        receiverSummary={createReceiverSummary({branchKey: 'interaction-2:agent-1:1'})}
      />
    );
    await waitFor(() => expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument());
  });

  it('applies the full-screen class and matching header control label', () => {
    render(<AIAssistantComponent {...createProps({isFullScreen: true})} />);

    expect(screen.getByTestId('ai-assistant:panel')).toHaveClass('ai-assistant__panel--full-screen');
    expect(screen.getByTestId('ai-assistant:header-fullscreen')).toHaveAttribute('aria-label', 'Exit full screen');
  });
});
