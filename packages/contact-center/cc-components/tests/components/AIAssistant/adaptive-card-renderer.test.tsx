import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import AdaptiveCardRenderer from '../../../src/components/AIAssistant/AdaptiveCardRenderer/adaptive-card-renderer';

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

        const source = globalThis.document.createElement('div');
        const sourceImage = globalThis.document.createElement('img');
        sourceImage.alt = 'Source';
        sourceImage.src = 'missing-source.svg';
        source.append(sourceImage, globalThis.document.createTextNode('Source'));
        container.appendChild(source);
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

describe('AdaptiveCardRenderer', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText: jest.fn().mockResolvedValue(undefined)},
    });
  });

  it.each([
    ['like', 'likeButton'],
    ['dislike', 'dislikeButton'],
    ['copy', 'copyButton'],
  ] as const)('emits %s feedback through the Adaptive Card action', async (type, actionId) => {
    const onFeedback = jest.fn();
    render(
      <AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} suggestionText="Suggested response" onFeedback={onFeedback} />
    );

    fireEvent.click(await screen.findByLabelText(`${type[0].toUpperCase()}${type.slice(1)} suggestion`));

    await waitFor(() => expect(onFeedback).toHaveBeenCalledWith({type, actionId}));
  });

  it('replaces a failed source image with the bundled link icon', async () => {
    render(<AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} />);
    const sourceImage = await screen.findByAltText('Source');

    fireEvent.error(sourceImage);

    expect(sourceImage.getAttribute('src')).toContain('link-regular.svg');
  });
});
