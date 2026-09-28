import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import AIAssistantComponent from '../../../src/components/AIAssistant/ai-assistant';
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
      fallbackText,
      onUserAction,
    }: {
      fallbackText?: string;
      onUserAction?: (event: AIAssistantActionEvent) => void;
    }) =>
      ReactModule.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'mock-adaptive-card',
          onClick: () => onUserAction?.({type: 'like', actionId: 'likeButton'}),
        },
        fallbackText
      ),
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

  it('can scope the wellness overlay to the assistant container', () => {
    render(
      <AIAssistantComponent
        {...createProps({
          wellnessBreakOverlayTarget: 'assistant',
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
    expect(overlay).toHaveClass('wellness-break-overlay--assistant');
    expect(overlay.parentElement).toBe(screen.getByTestId('ai-assistant:root'));
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
