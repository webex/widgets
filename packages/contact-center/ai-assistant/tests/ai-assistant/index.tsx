import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {AIAssistant} from '../../src';
import * as helper from '../../src/helper';
import store from '@webex/cc-store';
import '@testing-library/jest-dom';

jest.mock('adaptivecards', () => ({
  AdaptiveCard: jest.fn().mockImplementation(() => {
    const adaptiveCard: {
      hostConfig?: unknown;
      onExecuteAction?: (action: {id: string}) => void;
      parse: jest.Mock;
      render: jest.Mock;
    } = {
      parse: jest.fn(),
      render: jest.fn(() => {
        const container = globalThis.document.createElement('div');
        [
          ['likeButton', 'like-regular.svg'],
          ['dislikeButton', 'dislike-regular.svg'],
          ['copyButton', 'copy-regular.svg'],
        ].forEach(([actionId, icon]) => {
          const button = globalThis.document.createElement('button');
          const image = globalThis.document.createElement('img');
          image.src = icon;
          button.appendChild(image);
          button.onclick = () => adaptiveCard.onExecuteAction?.({id: actionId});
          container.appendChild(button);
        });
        return container;
      }),
    };
    return adaptiveCard;
  }),
  HostConfig: jest.fn(),
}));

jest.mock('@momentum-design/icons/dist/svg/check-circle-filled.svg', () => 'check-circle-filled.svg');
jest.mock(
  '@momentum-design/icons/dist/svg/cisco-ai-assistant-solid-bold.svg',
  () => 'cisco-ai-assistant-solid-bold.svg'
);
jest.mock('@momentum-design/icons/dist/svg/copy-regular.svg', () => 'copy-regular.svg');
jest.mock('@momentum-design/icons/dist/svg/dislike-filled.svg', () => 'dislike-filled.svg');
jest.mock('@momentum-design/icons/dist/svg/dislike-regular.svg', () => 'dislike-regular.svg');
jest.mock('@momentum-design/icons/dist/svg/link-regular.svg', () => 'link-regular.svg');
jest.mock('@momentum-design/icons/dist/svg/like-filled.svg', () => 'like-filled.svg');
jest.mock('@momentum-design/icons/dist/svg/like-regular.svg', () => 'like-regular.svg');

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
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    storeMock.realTimeAssist = {};
    storeMock.onErrorCallback = undefined;
    storeMock.cc.apiAIAssistant.sendRealTimeAssistanceUserAction.mockResolvedValue(undefined);
  });

  it('renders launcher when chrome is closed', () => {
    render(<AIAssistant />);
    expect(screen.getByTestId('ai-assistant:launcher')).toBeInTheDocument();
  });

  it('renders RealTimeAssist inside the shared assistant panel', () => {
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));

    expect(screen.getByRole('dialog', {name: 'Cisco AI Assistant'})).toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('ai-assistant:body')).getByTestId('ai-assistant:context-form')
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

  it.each([
    ['Like suggestion', 'likeButton'],
    ['Dislike suggestion', 'dislikeButton'],
    ['Copy suggestion', 'copyButton'],
  ])('sends the SDK user action when %s is activated', async (label, actionId) => {
    storeMock.realTimeAssist = {
      'interaction-1': [
        {
          data: {
            adaptiveCard: {type: 'AdaptiveCard'},
            adaptiveCardId: 'card-1',
            suggestion: 'Suggested response',
            languageCode: 'en',
          },
        },
      ],
    };
    render(<AIAssistant />);
    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));

    fireEvent.click(await screen.findByLabelText(label));

    expect(storeMock.cc.apiAIAssistant.sendRealTimeAssistanceUserAction).toHaveBeenCalledWith({
      agentId: 'agent-1',
      interactionId: 'interaction-1',
      adaptiveCardId: 'card-1',
      actionId,
      languageCode: 'en',
    });
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
