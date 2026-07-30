import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
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

  it('applies the full-screen class and matching header control label', () => {
    render(<AIAssistantComponent {...createProps({isFullScreen: true})} />);

    expect(screen.getByTestId('ai-assistant:panel')).toHaveClass('ai-assistant__panel--full-screen');
    expect(screen.getByTestId('ai-assistant:header-fullscreen')).toHaveAttribute('aria-label', 'Exit full screen');
  });
});
