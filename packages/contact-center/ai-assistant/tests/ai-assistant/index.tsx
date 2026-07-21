import React from 'react';
import {render, screen} from '@testing-library/react';
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
  currentTask: {data: {interactionId: string}};
  agentId: string;
  featureFlags: {isSuggestedResponsesEnabled: boolean};
  realTimeAssist: Record<string, unknown>;
  onErrorCallback?: jest.Mock;
  clearRealTimeAssist: jest.Mock;
};
const storeMock = store as unknown as StoreMock;

describe('AIAssistant widget', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    storeMock.realTimeAssist = {};
    storeMock.onErrorCallback = undefined;
  });

  it('renders launcher when chrome is closed', () => {
    render(<AIAssistant />);
    expect(screen.getByTestId('ai-assistant:launcher')).toBeInTheDocument();
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
