import React from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import AIAssistantComponent from '../../../src/components/AIAssistant/ai-assistant';
import {AI_ASSISTANT_SUMMARY_MESSAGES} from '../../../src/components/AIAssistant/AISummary';
import type {
  AIAssistantComponentProps,
  AIAssistantActionEvent,
} from '../../../src/components/AIAssistant/ai-assistant.types';

jest.mock('@webex/cc-ui-logging', () => ({
  withMetrics: (Component: React.ComponentType) => Component,
}));

jest.mock('../../../src/components/AIAssistant/AdaptiveCardRenderer/adaptive-card-renderer', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    __esModule: true,
    default: ({
      card,
      fallbackText,
      displayOnly,
      onRender,
      onUserAction,
      footer,
    }: {
      card?: unknown;
      fallbackText?: string;
      displayOnly?: boolean;
      onRender?: (rendered: boolean) => void;
      onUserAction?: (event: AIAssistantActionEvent) => void;
      footer?: React.ReactNode;
    }) => {
      const [rendered, setRendered] = ReactModule.useState(
        !(card as {mockDeferredRender?: boolean} | undefined)?.mockDeferredRender
      );
      ReactModule.useEffect(() => setRendered(true), [card]);
      const shouldFallback = Boolean((card as {mockFallback?: boolean} | undefined)?.mockFallback);
      const shouldRenderAction = !displayOnly && Boolean(onUserAction);
      ReactModule.useEffect(() => {
        onRender?.(rendered && !shouldFallback);
      }, [onRender, rendered, shouldFallback]);
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
            ),
        footer
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
  clearContent: jest.fn(),
  hasClearableContent: false,
  ...overrides,
});

type ReceiverSummaryContent = Extract<NonNullable<AIAssistantComponentProps['receiverSummary']>, {surface: 'content'}>;

const createReceiverSummary = (overrides: Partial<ReceiverSummaryContent> = {}): ReceiverSummaryContent => ({
  surface: 'content',
  branchKey: 'interaction-1:agent-1:1',
  content: {
    conversationId: 'interaction-1',
    adaptiveCard: {type: 'AdaptiveCard', version: '1.5', body: [{type: 'TextBlock', text: 'Receiver summary'}]},
  },
  selectedFeedback: 'none',
  feedbackPending: false,
  recordReceiverSummaryCopied: jest.fn().mockReturnValue(true),
  setReceiverSummaryFeedback: jest.fn(),
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

  it('renders Clear as the first header action and only enables it for assistant content', () => {
    const props = createProps({hasClearableContent: true});
    render(<AIAssistantComponent {...props} />);

    const actions = screen.getByTestId('ai-assistant:header-actions');
    expect(actions.firstElementChild).toBe(screen.getByTestId('ai-assistant:header-clear'));
    expect(screen.getByText('Clear')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ai-assistant:header-clear'));
    expect(props.clearContent).toHaveBeenCalledTimes(1);
  });

  it('renders persistent wellness history across close and reopen until Clear is pressed', () => {
    const history = [
      {
        type: 'offer' as const,
        id: 'offer-1',
        createdAt: 1,
        actionable: false,
        event: {
          agentId: 'agent-1',
          orgId: 'org-1',
          agentSessionId: 'notification-session',
          actionEvent: 'PROVIDE_WELLNESS_BREAK' as const,
          actionText: 'This break is pre-approved by your organization.',
        },
      },
      {type: 'user-action' as const, id: 'action-1', createdAt: 2, action: 'take-break' as const},
      {type: 'acknowledgement' as const, id: 'ack-1', createdAt: 3, hasBlockingTasks: false},
      {type: 'notice' as const, id: 'done-1', createdAt: 4, notice: 'completed' as const},
    ];
    const wellness = {
      enabled: true,
      phase: 'idle' as const,
      requestAvailable: false,
      hasBlockingTasks: false,
      elapsedSeconds: 0,
      reducedMotion: false,
      history,
      contentCleared: false,
      onRequest: jest.fn(),
      onAccept: jest.fn(),
      onLater: jest.fn(),
      onClearHistory: jest.fn(),
      onMediaError: jest.fn(),
    };
    const props = createProps({wellness, hasClearableContent: true});
    const {rerender} = render(<AIAssistantComponent {...props} />);

    expect(screen.getByText('Well-being break scheduled')).toBeInTheDocument();
    expect(screen.getByText('Take a break')).toBeInTheDocument();
    expect(screen.getByText('Great. Your well-being break will begin shortly.')).toBeInTheDocument();
    expect(screen.getByText('Well-being break completed')).toBeInTheDocument();

    rerender(<AIAssistantComponent {...props} chrome="closed" />);
    expect(screen.queryByText('Well-being break completed')).not.toBeInTheDocument();
    rerender(<AIAssistantComponent {...props} chrome="open" />);
    expect(screen.getByText('Well-being break completed')).toBeInTheDocument();
  });

  it.each(['header', 'minimized', 'external'] as const)(
    'returns to normal assistant content when the host reopens after %s close',
    async (source) => {
      let updateChrome: React.Dispatch<React.SetStateAction<AIAssistantComponentProps['chrome']>> = () => undefined;
      const receiverSummary = createReceiverSummary();
      const Harness = () => {
        const [chrome, setChrome] = React.useState<AIAssistantComponentProps['chrome']>('closed');
        updateChrome = setChrome;
        return (
          <AIAssistantComponent
            {...createProps({
              chrome,
              receiverSummary,
              open: () => setChrome('open'),
              close: () => setChrome('closed'),
              minimize: () => setChrome('minimized'),
            })}
          />
        );
      };
      render(<Harness />);
      fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
      expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();

      if (source === 'external') {
        act(() => updateChrome('closed'));
      } else {
        if (source === 'minimized') {
          fireEvent.click(screen.getByTestId('ai-assistant:header-minimize'));
        }
        fireEvent.click(screen.getByTestId(`ai-assistant:${source}-close`));
      }
      expect(screen.getByTestId('ai-assistant:closed-chrome')).toBeInTheDocument();
      act(() => updateChrome('open'));

      expect(await screen.findByTestId('ai-assistant:empty')).toBeInTheDocument();
      expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
    }
  );

  it.each(['completed', 'declined'] as const)(
    'shows an explicitly selected summary over retained %s wellness history',
    async (notice) => {
      const wellness = {
        enabled: true,
        phase: 'idle' as const,
        notice,
        requestAvailable: false,
        hasBlockingTasks: false,
        elapsedSeconds: 0,
        reducedMotion: false,
        history: [{type: 'notice' as const, id: 'notice-1', createdAt: 1, notice}],
        onRequest: jest.fn(),
        onAccept: jest.fn(),
        onLater: jest.fn(),
        onMediaError: jest.fn(),
      };
      renderStatefulReceiver('closed', createReceiverSummary(), {wellness});
      fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

      expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
      expect(screen.queryByTestId('wellness-break:history')).not.toBeInTheDocument();
      expect(screen.queryByTestId('wellness-break:request-card')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('ai-assistant:header-close'));
      fireEvent.click(screen.getByTestId('ai-assistant:launcher'));
      expect(await screen.findByTestId('wellness-break:history')).toBeInTheDocument();
      expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
    }
  );

  it.each(['offer-pending', 'starting'] as const)(
    'keeps an active %s wellness flow ahead of an explicitly selected summary',
    async (phase) => {
      const wellness = {
        enabled: true,
        phase,
        requestAvailable: false,
        hasBlockingTasks: false,
        elapsedSeconds: 0,
        reducedMotion: false,
        onRequest: jest.fn(),
        onAccept: jest.fn(),
        onLater: jest.fn(),
        onMediaError: jest.fn(),
      };
      renderStatefulReceiver('closed', createReceiverSummary(), {wellness});
      fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

      expect(await screen.findByTestId('ai-assistant:panel')).toBeInTheDocument();
      expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Get Assistance'})).not.toBeInTheDocument();
      expect(
        screen.getByTestId(phase === 'starting' ? 'wellness-break:overlay' : 'wellness-break:offer-card')
      ).toBeInTheDocument();
    }
  );

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

    const landing = screen.getByTestId('ai-assistant:landing');
    expect(landing).toBeInTheDocument();
    expect(landing).toHaveTextContent('✨Real-time Assist');
    expect(landing).toHaveTextContent('Real-time guidance to help you to respond to the customer');
    expect(landing).toHaveTextContent('🪷Wellness breaks');
    expect(landing).toHaveTextContent('Ensuring you get those well needed breaks');
    expect(landing).toHaveTextContent('✍🏻Smart summaries');
    expect(landing).toHaveTextContent(
      'Focus on the conversation while we capture the context - covering AI handoffs, transfers & consults, dropped conversations, and wrap-up.'
    );
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

  it('keeps the Momentum receiver trigger available in closed, minimized and ordinarily reopened chrome', async () => {
    const receiverSummary = createReceiverSummary();
    const {rerender} = render(<AIAssistantComponent {...createProps({chrome: 'closed', receiverSummary})} />);

    const trigger = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.viewSummary});
    expect(trigger.tagName.toLowerCase()).toBe('mdc-button');
    expect(trigger).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.viewSummary);
    expect(trigger).toHaveAttribute('aria-label', AI_ASSISTANT_SUMMARY_MESSAGES.viewSummary);
    expect(trigger).toHaveAttribute('variant', 'secondary');
    expect(trigger).not.toHaveAttribute('title');
    expect(screen.getByTestId('ai-assistant:closed-chrome')).toContainElement(trigger);

    rerender(<AIAssistantComponent {...createProps({chrome: 'minimized', receiverSummary})} />);

    expect(screen.getByTestId('ai-assistant:minimized-bar')).toContainElement(
      screen.getByTestId('ai-assistant:view-summary')
    );

    rerender(<AIAssistantComponent {...createProps({chrome: 'open', receiverSummary})} />);

    expect(screen.getByTestId('ai-assistant:summary-actions')).toContainElement(
      screen.getByTestId('ai-assistant:view-summary')
    );
    expect(screen.getByTestId('ai-assistant:header')).not.toContainElement(
      screen.getByTestId('ai-assistant:view-summary')
    );

    for (const chrome of ['closed', 'minimized', 'open'] as const) {
      rerender(<AIAssistantComponent {...createProps({chrome})} />);
      expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();

      rerender(<AIAssistantComponent {...createProps({chrome, receiverSummary, hasActiveInteraction: false})} />);
      expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();
    }
  });

  it('automatically displays a summary that arrives while the panel is open without moving host focus', async () => {
    const props = createProps({isFeatureEnabled: false});
    const renderHost = (receiverSummary?: AIAssistantComponentProps['receiverSummary']) => (
      <>
        <button type="button">Host control</button>
        <AIAssistantComponent {...props} receiverSummary={receiverSummary} />
      </>
    );
    const {rerender} = render(renderHost());
    expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();
    const hostControl = screen.getByRole('button', {name: 'Host control'});
    act(() => hostControl.focus());

    rerender(renderHost(createReceiverSummary()));

    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:summary-actions')).not.toBeInTheDocument();
    expect(props.open).not.toHaveBeenCalled();
    expect(props.restore).not.toHaveBeenCalled();
    expect(hostControl).toHaveFocus();
  });

  it('automatically displays an available receiver summary when initially mounted open', async () => {
    const props = createProps({receiverSummary: createReceiverSummary()});
    render(<AIAssistantComponent {...props} />);

    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();
    expect(props.open).not.toHaveBeenCalled();
    expect(props.restore).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'automatically displays receiver content in StrictMode (available on mount: %s)',
    async (availableOnMount) => {
      const receiverSummary = createReceiverSummary();
      const props = createProps();
      const renderStrict = (summary?: AIAssistantComponentProps['receiverSummary']) => (
        <React.StrictMode>
          <AIAssistantComponent {...props} receiverSummary={summary} />
        </React.StrictMode>
      );
      const {rerender} = render(renderStrict(availableOnMount ? receiverSummary : undefined));

      if (!availableOnMount) {
        expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
        rerender(renderStrict(receiverSummary));
      }

      expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
      expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();
      expect(props.open).not.toHaveBeenCalled();
      expect(props.restore).not.toHaveBeenCalled();
    }
  );

  it.each(['offer-pending', 'starting'] as const)(
    'keeps active %s wellness ahead of automatic arrival and displays the selected summary when idle',
    async (phase) => {
      const wellness = {
        enabled: true,
        phase,
        requestAvailable: false,
        hasBlockingTasks: false,
        elapsedSeconds: 0,
        reducedMotion: false,
        onRequest: jest.fn(),
        onAccept: jest.fn(),
        onLater: jest.fn(),
        onMediaError: jest.fn(),
      };
      const props = createProps({wellness});
      const receiverSummary = createReceiverSummary();
      const {rerender} = render(<AIAssistantComponent {...props} />);

      rerender(<AIAssistantComponent {...props} receiverSummary={receiverSummary} />);

      expect(
        screen.getByTestId(phase === 'starting' ? 'wellness-break:overlay' : 'wellness-break:offer-card')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Get Assistance'})).not.toBeInTheDocument();
      expect(props.open).not.toHaveBeenCalled();
      expect(props.restore).not.toHaveBeenCalled();

      rerender(
        <AIAssistantComponent
          {...props}
          receiverSummary={receiverSummary}
          wellness={{
            ...wellness,
            phase: 'idle',
            history: [{type: 'notice', id: 'notice-1', createdAt: 1, notice: 'completed'}],
          }}
        />
      );

      expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
      expect(screen.queryByTestId('wellness-break:history')).not.toBeInTheDocument();
      expect(screen.queryByTestId('wellness-break:overlay')).not.toBeInTheDocument();
    }
  );

  it('omits an invalid receiver timestamp while keeping copy and feedback usable', async () => {
    const receiverSummary = createReceiverSummary();
    receiverSummary.content.timestamp = Number.NaN;
    render(<AIAssistantComponent {...createProps({receiverSummary})} />);
    const footer = await screen.findByTestId('ai-summary:receiver-footer');

    expect(footer.querySelector('time')).toBeNull();
    expect(footer).not.toHaveTextContent('${sourceTimestamp}');
    expect(within(footer).getAllByRole('button')).toHaveLength(3);
    expect(within(footer).getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).toBeEnabled();
  });

  it.each([false, true])(
    'requests assistance once from the received summary and returns to its conversation (already started: %s)',
    async (hasInitialRequestSucceeded) => {
      const props = createProps({
        receiverSummary: createReceiverSummary(),
        hasInitialRequestSucceeded,
        chatEntries: hasInitialRequestSucceeded
          ? [{id: 'greeting-1', type: 'assistant-greeting', text: 'Existing assistance conversation'}]
          : [],
      });
      render(<AIAssistantComponent {...props} />);
      const summary = await screen.findByTestId('ai-assistant:receiver-summary');
      const assistance = within(summary).getByRole('button', {name: 'Get Assistance'});
      expect(assistance).toHaveClass('ai-assistant__pill-button');

      fireEvent.click(assistance);

      expect(props.requestRealTimeAssist).toHaveBeenCalledTimes(1);
      expect(props.requestRealTimeAssist).toHaveBeenCalledWith();
      expect(props.open).not.toHaveBeenCalled();
      expect(props.restore).not.toHaveBeenCalled();
      expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
      expect(
        screen.getByTestId(hasInitialRequestSucceeded ? 'ai-assistant:context-form' : 'ai-assistant:empty')
      ).toBeInTheDocument();
      if (hasInitialRequestSucceeded) {
        expect(screen.getByText('Existing assistance conversation')).toBeInTheDocument();
      }
      expect(screen.getByTestId('ai-assistant:view-summary')).toBeInTheDocument();
    }
  );

  it('disables summary assistance and guards its callback while another assistance request is pending', async () => {
    const props = createProps({receiverSummary: createReceiverSummary(), isRequesting: true});
    render(<AIAssistantComponent {...props} />);
    const summary = await screen.findByTestId('ai-assistant:receiver-summary');
    const assistance = within(summary).getByRole('button', {name: 'Get Assistance'});

    expect(assistance).toHaveAttribute('disabled');
    fireEvent.click(assistance);

    expect(props.requestRealTimeAssist).not.toHaveBeenCalled();
    expect(screen.getByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
  });

  it('shows requested assistance over idle wellness history while retaining active wellness priority', async () => {
    const wellness = {
      enabled: true,
      phase: 'idle' as const,
      notice: 'completed' as const,
      requestAvailable: false,
      hasBlockingTasks: false,
      elapsedSeconds: 0,
      reducedMotion: false,
      history: [{type: 'notice' as const, id: 'notice-1', createdAt: 1, notice: 'completed' as const}],
      onRequest: jest.fn(),
      onAccept: jest.fn(),
      onLater: jest.fn(),
      onMediaError: jest.fn(),
    };
    const props = createProps({receiverSummary: createReceiverSummary(), wellness});
    const {rerender} = render(<AIAssistantComponent {...props} />);
    const summary = await screen.findByTestId('ai-assistant:receiver-summary');

    fireEvent.click(within(summary).getByRole('button', {name: 'Get Assistance'}));

    expect(props.requestRealTimeAssist).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
    expect(screen.queryByTestId('wellness-break:history')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();

    rerender(
      <AIAssistantComponent
        {...props}
        wellness={{...wellness, phase: 'offer-pending', notice: undefined, history: []}}
      />
    );
    expect(screen.getByTestId('wellness-break:offer-card')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:empty')).not.toBeInTheDocument();

    rerender(<AIAssistantComponent {...props} />);
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
    expect(screen.queryByTestId('wellness-break:history')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-assistant:header-close'));
    rerender(<AIAssistantComponent {...props} chrome="closed" />);
    rerender(<AIAssistantComponent {...props} />);

    expect(screen.getByTestId('wellness-break:history')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:empty')).not.toBeInTheDocument();
  });

  it('keeps Get Assistance in its own row outside the receiver card and its footer', async () => {
    render(<AIAssistantComponent {...createProps({receiverSummary: createReceiverSummary()})} />);
    const summary = await screen.findByTestId('ai-assistant:receiver-summary');
    const row = within(summary).getByTestId('ai-assistant:receiver-assistance');
    const assistance = within(row).getByRole('button', {name: 'Get Assistance'});
    const card = within(summary).getByTestId('ai-assistant:adaptive-card');

    expect(row).toContainElement(assistance);
    expect(card).not.toContainElement(row);
    expect(card).toContainElement(within(summary).getByRole('button', {name: 'Copy Summary'}));
  });

  it('does not expose summary assistance without Real-time Assist enablement or an active interaction', async () => {
    const props = createProps({receiverSummary: createReceiverSummary(), isFeatureEnabled: false});
    const {rerender} = render(<AIAssistantComponent {...props} />);
    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Get Assistance'})).not.toBeInTheDocument();

    rerender(<AIAssistantComponent {...props} isFeatureEnabled hasActiveInteraction={false} />);

    expect(screen.queryByRole('button', {name: 'Get Assistance'})).not.toBeInTheDocument();
    expect(props.requestRealTimeAssist).not.toHaveBeenCalled();
  });

  it('automatically selects a different receiver branch arriving while the panel remains open', async () => {
    const props = createProps({receiverSummary: createReceiverSummary()});
    const {rerender} = render(<AIAssistantComponent {...props} />);
    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();

    rerender(
      <AIAssistantComponent
        {...props}
        receiverSummary={createReceiverSummary({
          branchKey: 'interaction-2:agent-1:1',
          content: {
            conversationId: 'interaction-2',
            adaptiveCard: {
              type: 'AdaptiveCard',
              body: [{type: 'TextBlock', text: 'New incoming summary'}],
              mockRenderedText: 'New incoming summary',
            },
          },
        })}
      />
    );

    expect(await screen.findByText('New incoming summary')).toBeInTheDocument();
    expect(screen.queryByText('Visible receiver card copy')).not.toBeInTheDocument();
    expect(props.open).not.toHaveBeenCalled();
    expect(props.restore).not.toHaveBeenCalled();
  });

  it('automatically displays new receiver content on the same branch after ordinary reopening', async () => {
    const receiverSummary = createReceiverSummary();
    const props = createProps({receiverSummary});
    const {rerender} = render(<AIAssistantComponent {...props} chrome="closed" />);
    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));
    rerender(<AIAssistantComponent {...props} />);
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();

    rerender(
      <AIAssistantComponent
        {...props}
        receiverSummary={{
          ...receiverSummary,
          content: {
            conversationId: 'interaction-1',
            adaptiveCard: {
              type: 'AdaptiveCard',
              body: [{type: 'TextBlock', text: 'New consult on the same interaction'}],
              mockRenderedText: 'New consult on the same interaction',
            },
          },
        }}
      />
    );

    expect(await screen.findByText('New consult on the same interaction')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:empty')).not.toBeInTheDocument();
    expect(props.open).toHaveBeenCalledTimes(1);
    expect(props.restore).not.toHaveBeenCalled();
  });

  it('does not reselect existing receiver content when feedback metadata or callbacks change', async () => {
    const receiverSummary = createReceiverSummary();
    const props = createProps({receiverSummary});
    const {rerender} = render(<AIAssistantComponent {...props} chrome="closed" />);
    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));
    rerender(<AIAssistantComponent {...props} />);
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();

    rerender(
      <AIAssistantComponent
        {...props}
        receiverSummary={{
          ...receiverSummary,
          selectedFeedback: 'thumbs_up',
          feedbackPending: true,
          recordReceiverSummaryCopied: jest.fn().mockReturnValue(true),
          setReceiverSummaryFeedback: jest.fn(),
        }}
      />
    );

    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:view-summary')).toBeInTheDocument();
    expect(props.open).toHaveBeenCalledTimes(1);
    expect(props.restore).not.toHaveBeenCalled();
  });

  it('returns to ordinary assistance when the automatically displayed summary disappears', async () => {
    const props = createProps({receiverSummary: createReceiverSummary()});
    const {rerender} = render(<AIAssistantComponent {...props} />);
    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();

    rerender(<AIAssistantComponent {...props} receiverSummary={undefined} />);

    expect(await screen.findByTestId('ai-assistant:empty')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();
  });

  it('hides the automatically displayed summary and its action after the interaction ends', async () => {
    const props = createProps({receiverSummary: createReceiverSummary()});
    const {rerender} = render(<AIAssistantComponent {...props} />);
    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();

    rerender(<AIAssistantComponent {...props} hasActiveInteraction={false} />);

    expect(screen.getByTestId('ai-assistant:landing')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:summary-actions')).not.toBeInTheDocument();

    rerender(<AIAssistantComponent {...props} />);

    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
  });

  it.each(['closed', 'minimized'] as const)(
    'does not expand %s chrome when a receiver summary arrives and still permits explicit selection',
    async (chrome) => {
      const props = createProps({chrome});
      const {rerender} = render(<AIAssistantComponent {...props} />);

      rerender(<AIAssistantComponent {...props} receiverSummary={createReceiverSummary()} />);

      const trigger = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.viewSummary});
      expect(screen.queryByTestId('ai-assistant:panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
      expect(props.open).not.toHaveBeenCalled();
      expect(props.restore).not.toHaveBeenCalled();

      fireEvent.click(trigger);
      expect(chrome === 'closed' ? props.open : props.restore).toHaveBeenCalledTimes(1);
      rerender(<AIAssistantComponent {...props} chrome="open" receiverSummary={createReceiverSummary()} />);

      expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    }
  );

  it.each(['closed', 'minimized'] as const)(
    'keeps ordinary assistance when existing receiver content is opened from %s chrome',
    async (chrome) => {
      const receiverSummary = createReceiverSummary();
      const props = createProps({chrome, receiverSummary});
      const {rerender} = render(<AIAssistantComponent {...props} />);
      const ordinaryControl = chrome === 'closed' ? 'launcher' : 'minimized-restore';

      fireEvent.click(screen.getByTestId(`ai-assistant:${ordinaryControl}`));
      rerender(<AIAssistantComponent {...props} chrome="open" />);

      expect(await screen.findByTestId('ai-assistant:empty')).toBeInTheDocument();
      expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument();
      const trigger = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.viewSummary});
      act(() => trigger.focus());
      fireEvent.click(trigger);

      expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
      expect(screen.queryByTestId('ai-assistant:summary-actions')).not.toBeInTheDocument();
    }
  );

  it('uses Momentum autofocus when opening the receiver branch from closed and minimized chrome', async () => {
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
        conversationId: 'interaction-1',
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

  it('keeps receiver card actions inert and copies only visible rendered card text', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText: jest.fn().mockResolvedValue(undefined)},
    });
    const receiverSummary = createReceiverSummary({
      content: {
        conversationId: 'interaction-1',
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
    expect(screen.getByTestId('ai-summary:mid-call-receiver')).toContainElement(card);
    const cardBody = card.querySelector('.ai-assistant__card-host');
    expect(cardBody).not.toBeNull();
    expect(within(cardBody as HTMLElement).queryByRole('button')).not.toBeInTheDocument();

    const copyButton = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary});
    expect(card).toContainElement(screen.getByTestId('ai-summary:actions'));
    fireEvent.click(copyButton);

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Visible receiver card copy'));
    expect(receiverSummary.recordReceiverSummaryCopied).toHaveBeenCalledWith();
  });

  it('reports receiver feedback through the bound callback and paints the selection it is given', async () => {
    const receiverSummary = createReceiverSummary();
    renderStatefulReceiver('closed', receiverSummary);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    const like = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like});
    fireEvent.click(like);

    expect(receiverSummary.setReceiverSummaryFeedback).toHaveBeenCalledWith('thumbs_up');
    expect(like).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens the receiver branch from View summary and disables pending feedback controls', async () => {
    const receiverSummary = createReceiverSummary({feedbackPending: true});
    renderStatefulReceiver('closed', receiverSummary);

    const viewSummary = screen.getByTestId('ai-assistant:view-summary');
    expect(viewSummary).toHaveAttribute('aria-label', AI_ASSISTANT_SUMMARY_MESSAGES.viewSummary);
    expect(viewSummary).not.toHaveAttribute('title');
    fireEvent.click(viewSummary);

    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like})).toHaveAttribute('disabled');
  });

  it('opens the receiver branch when Real-time Assist is disabled', async () => {
    renderStatefulReceiver('closed', createReceiverSummary(), {isFeatureEnabled: false});

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

  it('removes receiver actions when the renderer falls back', async () => {
    const receiverSummary = createReceiverSummary();
    const fallbackReceiverSummary = createReceiverSummary({
      branchKey: receiverSummary.branchKey,
      content: {
        conversationId: 'interaction-1',
        adaptiveCard: {
          type: 'AdaptiveCard',
          mockFallback: true,
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
    const copyButton = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary});
    act(() => {
      copyButton.focus();
    });
    expect(copyButton).toHaveFocus();

    act(() => {
      setSummary(fallbackReceiverSummary);
    });

    expect(await screen.findByTestId('ai-assistant:adaptive-card-fallback')).toHaveTextContent(
      AI_ASSISTANT_SUMMARY_MESSAGES.unavailable
    );
    await waitFor(() => expect(screen.queryByTestId('ai-summary:actions')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:panel')).toBeInTheDocument();
  });

  it.each([
    AI_ASSISTANT_SUMMARY_MESSAGES.copySummary,
    AI_ASSISTANT_SUMMARY_MESSAGES.like,
    AI_ASSISTANT_SUMMARY_MESSAGES.dislike,
  ])('keeps the focused %s action connected when a valid receiver card is replaced', async (name) => {
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
          content: {
            conversationId: 'interaction-1',
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
  });

  it('preserves connected external focus when a receiver trigger is removed', async () => {
    const props = createProps({chrome: 'closed', receiverSummary: createReceiverSummary()});
    const renderHost = (receiverSummary: AIAssistantComponentProps['receiverSummary']) => (
      <>
        <button type="button">Host control</button>
        <AIAssistantComponent {...props} receiverSummary={receiverSummary} />
      </>
    );
    const {rerender} = render(renderHost(props.receiverSummary));
    const trigger = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.viewSummary});
    act(() => trigger.focus());
    expect(trigger).toHaveFocus();
    const host = screen.getByRole('button', {name: 'Host control'});
    act(() => host.focus());
    rerender(renderHost(undefined));
    expect(host).toHaveFocus();
  });

  it('returns to ordinary assistant content when the receiver summary branch is removed', async () => {
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
    const copyButton = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary});
    act(() => {
      copyButton.focus();
    });
    expect(copyButton).toHaveFocus();

    act(() => {
      clearSummary();
    });

    await waitFor(() => expect(screen.queryByTestId('ai-assistant:receiver-summary')).not.toBeInTheDocument());
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
  });

  it('resets receiver selection for ordinary chrome actions and selects a newly arriving branch', async () => {
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
    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:empty')).not.toBeInTheDocument();
  });

  it('applies the full-screen class and matching header control label', () => {
    render(<AIAssistantComponent {...createProps({isFullScreen: true})} />);

    expect(screen.getByTestId('ai-assistant:panel')).toHaveClass('ai-assistant__panel--full-screen');
    expect(screen.getByTestId('ai-assistant:header-fullscreen')).toHaveAttribute('aria-label', 'Exit full screen');
  });

  it('renders wellness offer and eligible suggestion without stacking normal assistant content', () => {
    const onRequest = jest.fn();
    const onAccept = jest.fn();
    const onLater = jest.fn();
    const wellness = {
      enabled: true,
      phase: 'offer-pending' as const,
      event: {
        agentId: 'agent-1',
        orgId: 'org-1',
        agentSessionId: 'session-1',
        actionEvent: 'PROVIDE_WELLNESS_BREAK' as const,
      },
      requestAvailable: false,
      hasBlockingTasks: false,
      elapsedSeconds: 0,
      reducedMotion: false,
      onRequest,
      onAccept,
      onLater,
      onMediaError: jest.fn(),
    };
    const {rerender} = render(<AIAssistantComponent {...createProps({isFeatureEnabled: false, wellness})} />);

    expect(screen.queryByTestId('ai-assistant:landing')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wellness-break:accept'));
    fireEvent.click(screen.getByTestId('wellness-break:later'));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onLater).toHaveBeenCalledTimes(1);

    rerender(
      <AIAssistantComponent
        {...createProps({
          isFeatureEnabled: false,
          wellness: {
            ...wellness,
            phase: 'idle',
            event: {
              ...wellness.event,
              actionEvent: 'SUGGEST_WELLNESS_BREAK',
              actionText: 'This is your approved break.',
            },
            requestAvailable: true,
          },
        })}
      />
    );
    expect(
      screen.getByText("Looks like it's a busy day. Here's how I can help you stay focussed and on top of your game")
    ).toBeInTheDocument();
    expect(screen.getByText('This is your approved break.')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:landing')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wellness-break:request'));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('lets an eligible suggestion fill the assistant body while retaining prior wellness history', () => {
    const history = [
      {
        type: 'notice' as const,
        id: 'completed-1',
        createdAt: 1,
        notice: 'completed' as const,
      },
    ];
    const wellness = {
      enabled: true,
      phase: 'idle' as const,
      event: {
        agentId: 'agent-1',
        orgId: 'org-1',
        agentSessionId: 'notification-session',
        actionEvent: 'SUGGEST_WELLNESS_BREAK' as const,
      },
      requestAvailable: true,
      hasBlockingTasks: false,
      elapsedSeconds: 0,
      reducedMotion: false,
      history,
      contentCleared: false,
      onRequest: jest.fn(),
      onAccept: jest.fn(),
      onLater: jest.fn(),
      onClearHistory: jest.fn(),
      onMediaError: jest.fn(),
    };
    const props = createProps({isFeatureEnabled: false, wellness});
    const {rerender} = render(<AIAssistantComponent {...props} />);

    expect(screen.getByTestId('ai-assistant:body')).toHaveClass(
      'ai-assistant__body--landing',
      'ai-assistant__body--wellness-suggestion'
    );
    expect(screen.getByTestId('wellness-break:request-card')).toBeInTheDocument();
    expect(screen.queryByTestId('wellness-break:history')).not.toBeInTheDocument();
    expect(screen.queryByText('Well-being break completed')).not.toBeInTheDocument();

    rerender(<AIAssistantComponent {...props} wellness={{...wellness, requestAvailable: false}} />);

    expect(screen.getByTestId('ai-assistant:body')).not.toHaveClass('ai-assistant__body--wellness-suggestion');
    expect(screen.getByTestId('wellness-break:history')).toBeInTheDocument();
    expect(screen.getByText('Well-being break completed')).toBeInTheDocument();
  });

  it('keeps a suggestion hidden while interaction content has priority', () => {
    render(
      <AIAssistantComponent
        {...createProps({
          wellness: {
            enabled: true,
            phase: 'idle',
            event: {
              agentId: 'agent-1',
              orgId: 'org-1',
              agentSessionId: 'session-1',
              actionEvent: 'SUGGEST_WELLNESS_BREAK',
            },
            requestAvailable: true,
            hasBlockingTasks: false,
            elapsedSeconds: 0,
            reducedMotion: false,
            onRequest: jest.fn(),
            onAccept: jest.fn(),
            onLater: jest.fn(),
            onMediaError: jest.fn(),
          },
        })}
      />
    );

    expect(screen.queryByTestId('wellness-break:request')).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
  });

  it('shows request results exclusively and does not restore the manual CTA for completion', () => {
    const wellness = {
      enabled: true,
      phase: 'request-pending' as const,
      requestAvailable: false,
      hasBlockingTasks: false,
      elapsedSeconds: 0,
      reducedMotion: false,
      onRequest: jest.fn(),
      onAccept: jest.fn(),
      onLater: jest.fn(),
      onMediaError: jest.fn(),
    };
    const {rerender} = render(<AIAssistantComponent {...createProps({isFeatureEnabled: false, wellness})} />);

    expect(screen.getByText('Take a break')).toBeInTheDocument();
    expect(screen.queryByText('Request pending')).not.toBeInTheDocument();
    expect(screen.queryByTestId('wellness-break:request')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:landing')).not.toBeInTheDocument();

    const completedWellness = {
      ...wellness,
      phase: 'idle' as const,
      notice: 'completed' as const,
      requestAvailable: true,
    };
    rerender(<AIAssistantComponent {...createProps({isFeatureEnabled: false, wellness: completedWellness})} />);

    expect(screen.getByText('Well-being break completed')).toBeInTheDocument();
    expect(screen.queryByTestId('wellness-break:request')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:landing')).not.toBeInTheDocument();

    rerender(
      <AIAssistantComponent
        {...createProps({chrome: 'closed', isFeatureEnabled: false, wellness: completedWellness})}
      />
    );
    expect(screen.queryByText('Well-being break completed')).not.toBeInTheDocument();

    rerender(<AIAssistantComponent {...createProps({isFeatureEnabled: false, wellness: completedWellness})} />);
    expect(screen.getByText('Well-being break completed')).toBeInTheDocument();
  });

  it('shows backend denial action text and falls back to the approved copy when it is blank', () => {
    const wellness = {
      enabled: true,
      phase: 'idle' as const,
      event: {
        agentId: 'agent-1',
        orgId: 'org-1',
        agentSessionId: 'session-1',
        actionEvent: 'WELLNESS_BREAK_NOT_ALLOWED' as const,
        actionText: 'Sorry, you have already reached your limit for today.',
      },
      notice: 'not-allowed' as const,
      requestAvailable: false,
      hasBlockingTasks: false,
      elapsedSeconds: 0,
      reducedMotion: false,
      onRequest: jest.fn(),
      onAccept: jest.fn(),
      onLater: jest.fn(),
      onMediaError: jest.fn(),
    };
    const {rerender} = render(<AIAssistantComponent {...createProps({isFeatureEnabled: false, wellness})} />);

    expect(screen.getByText('Sorry, you have already reached your limit for today.')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:landing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('wellness-break:request')).not.toBeInTheDocument();

    rerender(
      <AIAssistantComponent
        {...createProps({
          isFeatureEnabled: false,
          wellness: {...wellness, event: {...wellness.event, actionText: '   '}},
        })}
      />
    );

    expect(
      screen.getByText(
        "I'm sorry, you've reached your well-being break limit today. Continue with your tasks, but remember to take care of yourself."
      )
    ).toBeInTheDocument();
  });

  it('keeps the accessible wellness overlay mounted while assistant chrome is closed', () => {
    render(
      <AIAssistantComponent
        {...createProps({
          chrome: 'closed',
          wellness: {
            enabled: true,
            phase: 'starting',
            countdown: 5,
            requestAvailable: false,
            hasBlockingTasks: false,
            elapsedSeconds: 0,
            reducedMotion: true,
            onRequest: jest.fn(),
            onAccept: jest.fn(),
            onLater: jest.fn(),
            onMediaError: jest.fn(),
          },
        })}
      />
    );

    expect(screen.getByTestId('wellness-break:overlay')).toBeInTheDocument();
    expect(screen.getByRole('dialog', {name: 'Relax'})).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('5 seconds')).toBeInTheDocument();
    expect(screen.getByTestId('wellness-break:surface')).toContainElement(
      screen.getByTestId('wellness-break:animation')
    );
    expect(screen.getByTestId('wellness-break:countdown')).toHaveTextContent('54321');
    expect(screen.getByText('5')).toHaveClass('wellness-break-modal__countdown-digit--active');
  });

  it('uses an injected animation loader only during an animated break', async () => {
    const animationData = {v: '5.0'};
    const animation = {
      totalFrames: 20,
      goToAndPlay: jest.fn(),
      goToAndStop: jest.fn(),
      destroy: jest.fn(),
    };
    const loadWellnessAnimation = jest.fn().mockResolvedValue(animation);
    const wellness = {
      enabled: true,
      phase: 'starting' as const,
      requestAvailable: false,
      hasBlockingTasks: false,
      elapsedSeconds: 0,
      animationData,
      reducedMotion: false,
      onRequest: jest.fn(),
      onAccept: jest.fn(),
      onLater: jest.fn(),
      onMediaError: jest.fn(),
    };
    const {rerender, unmount} = render(
      <AIAssistantComponent {...createProps({chrome: 'closed', wellness, loadWellnessAnimation})} />
    );

    await waitFor(() => expect(loadWellnessAnimation).toHaveBeenCalledWith(expect.any(HTMLDivElement), animationData));
    expect(animation.goToAndStop).toHaveBeenCalledWith(0, true);

    rerender(
      <AIAssistantComponent
        {...createProps({chrome: 'closed', wellness: {...wellness, phase: 'playing'}, loadWellnessAnimation})}
      />
    );
    expect(animation.goToAndPlay).toHaveBeenCalledWith(0, true);

    rerender(
      <AIAssistantComponent
        {...createProps({chrome: 'closed', wellness: {...wellness, phase: 'ending'}, loadWellnessAnimation})}
      />
    );
    expect(animation.goToAndStop).toHaveBeenCalledWith(19, true);
    expect(loadWellnessAnimation).toHaveBeenCalledTimes(1);
    unmount();
    expect(animation.destroy).toHaveBeenCalledTimes(1);
  });

  it('locks and restores document scrolling for the default viewport overlay', () => {
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'scroll';
    const transformedHost = document.createElement('div');
    transformedHost.style.transform = 'translateZ(0)';
    document.body.append(transformedHost);

    const {unmount} = render(
      <AIAssistantComponent
        {...createProps({
          chrome: 'closed',
          wellness: {
            enabled: true,
            phase: 'playing',
            requestAvailable: false,
            hasBlockingTasks: false,
            elapsedSeconds: 10,
            reducedMotion: true,
            onRequest: jest.fn(),
            onAccept: jest.fn(),
            onLater: jest.fn(),
            onMediaError: jest.fn(),
          },
        })}
      />,
      {container: transformedHost}
    );

    const overlay = screen.getByTestId('wellness-break:overlay');
    expect(overlay).toHaveClass('wellness-break-overlay--viewport');
    expect(overlay.parentElement).toBe(document.body);
    expect(transformedHost).not.toContainElement(overlay);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.documentElement.style.overflow).toBe('auto');
    expect(document.body.style.overflow).toBe('scroll');
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
    transformedHost.remove();
  });

  it('keeps an assistant-scoped overlay canvas while chrome is closed or minimized', () => {
    const wellness = {
      enabled: true,
      phase: 'playing' as const,
      requestAvailable: false,
      hasBlockingTasks: false,
      elapsedSeconds: 10,
      reducedMotion: true,
      onRequest: jest.fn(),
      onAccept: jest.fn(),
      onLater: jest.fn(),
      onMediaError: jest.fn(),
    };
    const props = createProps({chrome: 'closed', wellnessBreakOverlayTarget: 'assistant', wellness});
    const {rerender} = render(<AIAssistantComponent {...props} />);

    const root = screen.getByTestId('ai-assistant:root');
    const overlay = screen.getByTestId('wellness-break:overlay');
    expect(root).toHaveClass('ai-assistant--wellness-overlay');
    expect(overlay).toHaveClass('wellness-break-overlay--assistant');
    expect(overlay.parentElement).toBe(root);

    rerender(<AIAssistantComponent {...props} chrome="minimized" />);
    expect(root).toHaveClass('ai-assistant--wellness-overlay');
    expect(screen.getByTestId('wellness-break:overlay').parentElement).toBe(root);

    rerender(<AIAssistantComponent {...props} wellness={{...wellness, phase: 'idle'}} />);
    expect(root).not.toHaveClass('ai-assistant--wellness-overlay');
    expect(screen.queryByTestId('wellness-break:overlay')).not.toBeInTheDocument();
  });

  it('can portal the wellness overlay into a custom container and restores its styles', () => {
    const customTarget = document.createElement('section');
    customTarget.style.overflow = 'auto';
    document.body.append(customTarget);

    const {unmount} = render(
      <AIAssistantComponent
        {...createProps({
          wellnessBreakOverlayTarget: customTarget,
          wellness: {
            enabled: true,
            phase: 'playing',
            requestAvailable: false,
            hasBlockingTasks: false,
            elapsedSeconds: 10,
            reducedMotion: true,
            onRequest: jest.fn(),
            onAccept: jest.fn(),
            onLater: jest.fn(),
            onMediaError: jest.fn(),
          },
        })}
      />
    );

    const overlay = screen.getByTestId('wellness-break:overlay');
    expect(overlay).toHaveClass('wellness-break-overlay--custom');
    expect(overlay.parentElement).toBe(customTarget);
    expect(customTarget.style.position).toBe('relative');
    expect(customTarget.style.overflow).toBe('hidden');

    unmount();
    expect(customTarget.style.position).toBe('');
    expect(customTarget.style.overflow).toBe('auto');
    customTarget.remove();
  });

  it('renders the ongoing Desktop-style message and progress over the full break surface', () => {
    render(
      <AIAssistantComponent
        {...createProps({
          chrome: 'closed',
          wellness: {
            enabled: true,
            phase: 'playing',
            requestAvailable: false,
            hasBlockingTasks: false,
            elapsedSeconds: 24,
            reducedMotion: true,
            onRequest: jest.fn(),
            onAccept: jest.fn(),
            onLater: jest.fn(),
            onMediaError: jest.fn(),
          },
        })}
      />
    );

    const surface = screen.getByTestId('wellness-break:surface');
    expect(surface).toContainElement(screen.getByText('This moment is yours.'));
    expect(surface).toContainElement(screen.getByRole('progressbar', {name: 'Well-being break progress'}));
  });

  it('uses only the inline countdown message while the break is ending', () => {
    render(
      <AIAssistantComponent
        {...createProps({
          chrome: 'closed',
          wellness: {
            enabled: true,
            phase: 'ending',
            countdown: 3,
            requestAvailable: false,
            hasBlockingTasks: false,
            elapsedSeconds: 60,
            reducedMotion: true,
            onRequest: jest.fn(),
            onAccept: jest.fn(),
            onLater: jest.fn(),
            onMediaError: jest.fn(),
          },
        })}
      />
    );

    expect(screen.getByText('Transitioning back to work mode in')).toBeInTheDocument();
    expect(screen.queryByRole('heading', {name: 'Transitioning back to work mode'})).not.toBeInTheDocument();
    expect(screen.getByTestId('wellness-break:countdown')).toHaveTextContent('54321');
    expect(screen.getByText('3')).toHaveClass('wellness-break-modal__countdown-digit--active');
  });

  it('shows an actionable offer toast while the panel is closed', () => {
    const onAccept = jest.fn();
    const onDismissNotification = jest.fn();
    const {rerender} = render(
      <AIAssistantComponent
        {...createProps({
          chrome: 'closed',
          wellness: {
            enabled: true,
            phase: 'offer-pending',
            event: {
              agentId: 'agent-1',
              orgId: 'org-1',
              agentSessionId: 'session-1',
              actionEvent: 'PROVIDE_WELLNESS_BREAK',
              actionText: 'Your approved break is ready.',
            },
            requestAvailable: false,
            hasBlockingTasks: false,
            elapsedSeconds: 0,
            reducedMotion: false,
            onRequest: jest.fn(),
            onAccept,
            onLater: jest.fn(),
            onDismissNotification,
            onMediaError: jest.fn(),
          },
        })}
      />
    );

    expect(screen.getByTestId('wellness-break:offer-toast')).toHaveTextContent('Your approved break is ready.');
    fireEvent.click(screen.getByTestId('wellness-break:toast-accept'));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept).toHaveBeenCalledWith('notification');
    expect(screen.queryByTestId('wellness-break:offer-toast')).not.toBeInTheDocument();

    // A newly delivered offer remounts the actionable notification state.
    rerender(
      <AIAssistantComponent
        {...createProps({
          chrome: 'closed',
          wellness: {
            enabled: true,
            phase: 'offer-pending',
            event: {
              agentId: 'agent-1',
              orgId: 'org-1',
              agentSessionId: 'session-1',
              actionEvent: 'PROVIDE_WELLNESS_BREAK',
              actionText: 'Another approved break is ready.',
            },
            requestAvailable: false,
            hasBlockingTasks: false,
            elapsedSeconds: 0,
            reducedMotion: false,
            onRequest: jest.fn(),
            onAccept: jest.fn(),
            onLater: jest.fn(),
            onDismissNotification,
            onMediaError: jest.fn(),
          },
        })}
      />
    );
    expect(screen.getByTestId('wellness-break:offer-toast')).toHaveTextContent('Another approved break is ready.');
    const toast = screen.getByTestId('wellness-break:offer-toast').querySelector('mdc-toast');
    expect(toast).toBeTruthy();
    fireEvent(toast as Element, new CustomEvent('close'));
    expect(onDismissNotification).toHaveBeenCalledTimes(1);
  });

  it('keeps the offer in the panel without duplicating the toast when open', () => {
    render(
      <AIAssistantComponent
        {...createProps({
          wellness: {
            enabled: true,
            phase: 'offer-pending',
            event: {
              agentId: 'agent-1',
              orgId: 'org-1',
              agentSessionId: 'session-1',
              actionEvent: 'PROVIDE_WELLNESS_BREAK',
            },
            requestAvailable: false,
            hasBlockingTasks: false,
            elapsedSeconds: 0,
            reducedMotion: false,
            onRequest: jest.fn(),
            onAccept: jest.fn(),
            onLater: jest.fn(),
            onMediaError: jest.fn(),
          },
        })}
      />
    );

    expect(screen.getByTestId('wellness-break:offer-card')).toBeInTheDocument();
    expect(screen.queryByTestId('wellness-break:offer-toast')).not.toBeInTheDocument();
  });

  it('only mentions current work when a task is actually blocking the break', () => {
    const wellness = {
      enabled: true,
      phase: 'waiting-for-safe-state' as const,
      requestAvailable: false,
      hasBlockingTasks: false,
      elapsedSeconds: 0,
      reducedMotion: false,
      onRequest: jest.fn(),
      onAccept: jest.fn(),
      onLater: jest.fn(),
      onMediaError: jest.fn(),
    };
    const {rerender} = render(<AIAssistantComponent {...createProps({wellness})} />);

    expect(screen.getByTestId('wellness-break:status')).toHaveTextContent('will begin shortly');
    expect(screen.queryByText(/current work/)).not.toBeInTheDocument();

    rerender(<AIAssistantComponent {...createProps({wellness: {...wellness, hasBlockingTasks: true}})} />);
    expect(screen.getByTestId('wellness-break:status')).toHaveTextContent('right after your current work');
  });
});
