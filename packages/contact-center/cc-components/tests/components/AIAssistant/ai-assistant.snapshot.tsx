import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import AIAssistantComponent from '../../../src/components/AIAssistant/ai-assistant';
import type {AIAssistantComponentProps} from '../../../src/components/AIAssistant/ai-assistant.types';

jest.mock('@webex/cc-ui-logging', () => ({
  withMetrics: (Component: React.ComponentType) => Component,
}));

jest.mock('../../../src/components/AIAssistant/AdaptiveCardRenderer/adaptive-card-renderer', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    __esModule: true,
    default: ({fallbackText}: {fallbackText?: string}) =>
      ReactModule.createElement('div', {'data-testid': 'mock-adaptive-card'}, fallbackText),
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

describe('AIAssistantComponent snapshots', () => {
  it('matches the closed launcher state', () => {
    const {container} = render(<AIAssistantComponent {...createProps({chrome: 'closed'})} />);
    expect(container).toMatchSnapshot();
  });

  it('matches the minimized shared chrome', () => {
    const {container} = render(<AIAssistantComponent {...createProps({chrome: 'minimized'})} />);
    expect(container).toMatchSnapshot();
  });

  it('matches the open RealTimeAssist empty state', () => {
    const {container} = render(<AIAssistantComponent {...createProps()} />);
    expect(container).toMatchSnapshot();
  });

  it('matches the AI features landing state', () => {
    const {container} = render(
      <AIAssistantComponent {...createProps({agentName: 'User5 Agent5', hasActiveInteraction: false})} />
    );
    expect(container).toMatchSnapshot();
  });

  it('matches a full-screen RealTimeAssist conversation', () => {
    const {container} = render(
      <AIAssistantComponent
        {...createProps({
          isFullScreen: true,
          requestStatus: 'ready',
          contextDraft: 'Additional refund context',
          hasInitialRequestSucceeded: true,
          chatEntries: [
            {type: 'assistant-greeting', id: 'greeting-1', text: 'How can I help?'},
            {type: 'user', id: 'user-1', text: 'Help with a refund'},
            {
              type: 'assistant',
              id: 'assistant-1',
              realTimeAssist: {
                data: {
                  adaptiveCard: {type: 'AdaptiveCard'},
                  adaptiveCardId: 'card-1',
                  title: 'Suggested response',
                  suggestion: 'Use the refund workflow',
                },
              },
            },
          ],
        })}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
