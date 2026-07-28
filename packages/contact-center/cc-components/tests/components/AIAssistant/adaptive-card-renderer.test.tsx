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
    if (type === 'copy') {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Suggested response');
    }
  });

  it('replaces a failed source image with the bundled link icon', async () => {
    render(<AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} />);
    const sourceImage = await screen.findByAltText('Source');
    const originalSource = sourceImage.getAttribute('src');

    fireEvent.error(sourceImage);

    expect(sourceImage.getAttribute('src')).not.toBe(originalSource);
    expect(sourceImage).not.toHaveAttribute('hidden');
  });

  it('uses the bordered quote treatment for customer statements', () => {
    render(<AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} assistantTitle="The customer said:" />);

    expect(screen.getByTestId('ai-assistant:adaptive-card')).toHaveClass('ai-assistant__card--customer-statement');
  });
});
