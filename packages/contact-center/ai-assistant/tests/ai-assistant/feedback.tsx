import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import {AIAssistant} from '../../src';
import store from '@webex/cc-store';

jest.mock('@webex/cc-components', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    __esModule: true,
    AIAssistantComponent: ({
      onRealTimeAssistAction,
    }: {
      onRealTimeAssistAction?: (
        event: {type: 'like' | 'dislike' | 'copy'; actionId: string},
        assist: {data: {adaptiveCardId?: string; languageCode?: string}}
      ) => void;
    }) =>
      ReactModule.createElement(
        ReactModule.Fragment,
        null,
        ['likeButton', 'dislikeButton', 'copyButton'].map((actionId) =>
          ReactModule.createElement(
            'button',
            {
              key: actionId,
              type: 'button',
              'data-testid': actionId,
              onClick: () =>
                onRealTimeAssistAction?.(
                  {
                    type: actionId === 'likeButton' ? 'like' : actionId === 'dislikeButton' ? 'dislike' : 'copy',
                    actionId,
                  },
                  {data: {adaptiveCardId: 'card-1', languageCode: 'en'}}
                ),
            },
            actionId
          )
        ),
        ReactModule.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'missing-card-id',
            onClick: () =>
              onRealTimeAssistAction?.({type: 'like', actionId: 'likeButton'}, {data: {languageCode: 'en'}}),
          },
          'missing card id'
        )
      ),
  };
});

jest.mock('@webex/cc-store', () => ({
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
    realTimeAssist: {'interaction-1': []},
    clearRealTimeAssist: jest.fn(),
    logger: {error: jest.fn()},
  },
}));

type StoreMock = {
  cc: {
    apiAIAssistant: {
      sendRealTimeAssistanceUserAction: jest.Mock;
    };
  };
  logger: {error: jest.Mock};
};

const storeMock = store as unknown as StoreMock;

describe('AIAssistant real-time assist feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storeMock.cc.apiAIAssistant.sendRealTimeAssistanceUserAction.mockResolvedValue(undefined);
  });

  it.each(['likeButton', 'dislikeButton', 'copyButton'])('sends the %s action through the SDK', (actionId) => {
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId(actionId));

    expect(storeMock.cc.apiAIAssistant.sendRealTimeAssistanceUserAction).toHaveBeenCalledWith({
      agentId: 'agent-1',
      interactionId: 'interaction-1',
      adaptiveCardId: 'card-1',
      actionId,
      languageCode: 'en',
    });
  });

  it('does not call the SDK when the adaptive card id is missing', () => {
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('missing-card-id'));

    expect(storeMock.cc.apiAIAssistant.sendRealTimeAssistanceUserAction).not.toHaveBeenCalled();
  });

  it('logs SDK feedback failures', async () => {
    storeMock.cc.apiAIAssistant.sendRealTimeAssistanceUserAction.mockRejectedValueOnce(new Error('feedback failed'));
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('likeButton'));

    await waitFor(() =>
      expect(storeMock.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('sendRealTimeAssistanceUserAction failed'),
        expect.objectContaining({method: 'handleRealTimeAssistAction'})
      )
    );
  });
});
