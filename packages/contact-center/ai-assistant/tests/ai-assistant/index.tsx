import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {AIAssistant} from '../../src';
import * as helper from '../../src/helper';
import store from '@webex/cc-store';
import '@testing-library/jest-dom';

jest.mock('@webex/cc-store', () => {
  return {
    __esModule: true,
    default: {
      cc: {
        apiAIAssistant: {
          getRealTimeAssistance: jest.fn(),
          sendRealTimeAssistanceUserAction: jest.fn(),
        },
      },
      currentTask: {data: {interactionId: 'interaction-1'}},
      agentId: 'agent-1',
      featureFlags: {isSuggestedResponsesEnabled: true},
      realTimeAssist: {},
      onErrorCallback: undefined,
      clearRealTimeAssist: jest.fn(),
    },
  };
});

type StoreMock = {
  cc: {
    apiAIAssistant: {
      getRealTimeAssistance: jest.Mock;
      sendRealTimeAssistanceUserAction: jest.Mock;
    };
  };
  currentTask?: {data: {interactionId: string}};
  agentId: string;
  featureFlags: {isSuggestedResponsesEnabled: boolean};
  realTimeAssist: Record<string, unknown>;
  onErrorCallback?: jest.Mock;
  clearRealTimeAssist: jest.Mock;
};
const storeMock = store as unknown as StoreMock;

describe('AIAssistant widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    storeMock.currentTask = {data: {interactionId: 'interaction-1'}};
    storeMock.featureFlags = {isSuggestedResponsesEnabled: true};
    storeMock.realTimeAssist = {};
    storeMock.onErrorCallback = undefined;
    storeMock.cc.apiAIAssistant.sendRealTimeAssistanceUserAction.mockResolvedValue(undefined);
  });

  it('renders launcher when chrome is closed', () => {
    render(<AIAssistant />);
    expect(screen.getByTestId('ai-assistant:launcher')).toBeInTheDocument();
  });

  it('offers the launcher and the landing page before an interaction starts', () => {
    storeMock.currentTask = undefined;
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));

    expect(screen.getByTestId('ai-assistant:landing')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:footer')).not.toBeInTheDocument();
  });

  it('offers the launcher and the landing page when the feature is disabled', () => {
    storeMock.featureFlags = {isSuggestedResponsesEnabled: false};
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));

    expect(screen.getByTestId('ai-assistant:landing')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:empty')).not.toBeInTheDocument();
  });

  it('renders RealTimeAssist inside the shared assistant panel', async () => {
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));

    expect(screen.getByRole('dialog', {name: 'Cisco AI Assistant'})).toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
    expect(within(screen.getByTestId('ai-assistant:body')).queryByTestId('ai-assistant:context-form')).toBeNull();

    fireEvent.click(screen.getByTestId('ai-assistant:get-suggestions'));

    expect(
      await within(screen.getByTestId('ai-assistant:body')).findByTestId('ai-assistant:context-form')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('ai-assistant:footer')).queryByTestId('ai-assistant:context-form')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:disclaimer')).toHaveTextContent(
      'I can make mistakes, so check my responses.'
    );
  });

  it('passes through className to root', () => {
    const {container} = render(<AIAssistant className="my-host-class" />);
    expect(container.querySelector('.my-host-class')).toBeInTheDocument();
  });

  it('routes errors thrown in the hook to store.onErrorCallback', () => {
    const onErrorCallback = jest.fn();
    storeMock.onErrorCallback = onErrorCallback;
    jest.spyOn(helper, 'useAiAssistant').mockImplementation(() => {
      throw new Error('Boom');
    });

    const {container} = render(<AIAssistant />);
    expect(container.firstChild).toBeNull();
    expect(onErrorCallback).toHaveBeenCalledWith('AIAssistant', expect.any(Error));
  });
});
