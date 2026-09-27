import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import * as AdaptiveCards from 'adaptivecards';
import AdaptiveCardRenderer from '../../../src/components/AIAssistant/AdaptiveCardRenderer/adaptive-card-renderer';

// Mirrors the real renderer: icons arrive as inline data URIs (no file name to
// match on) and the payload's empty `title` leaves buttons unlabelled, so the
// only reliable link between an action and its button is `renderedElement`.
jest.mock('adaptivecards', () => ({
  AdaptiveCard: jest.fn().mockImplementation(() => {
    const actions: {id: string; title: string; renderedElement?: HTMLElement}[] = [];
    const adaptiveCard: {
      hostConfig?: unknown;
      onExecuteAction?: (action: {id: string}) => void;
      parse: jest.Mock;
      render: jest.Mock;
      getAllActions: jest.Mock;
    } = {
      parse: jest.fn(),
      getAllActions: jest.fn(() => actions),
      render: jest.fn(() => {
        const container = globalThis.document.createElement('div');
        actions.length = 0;
        ['likeButton', 'dislikeButton', 'copyButton', 'sourceExpandButton'].forEach((actionId) => {
          const button = globalThis.document.createElement('button');
          const image = globalThis.document.createElement('img');
          image.src = 'data:image/svg+xml;base64,PHN2Zy8+';
          button.appendChild(image);
          button.onclick = () => adaptiveCard.onExecuteAction?.({id: actionId});
          container.appendChild(button);
          actions.push({id: actionId, title: '', renderedElement: button});
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

const getLastAdaptiveCard = (): {parse: jest.Mock; render: jest.Mock} => {
  const adaptiveCardMock = AdaptiveCards.AdaptiveCard as unknown as jest.Mock;
  const results = adaptiveCardMock.mock.results;
  return results[results.length - 1].value as {parse: jest.Mock; render: jest.Mock};
};

const renderableCard = {
  type: 'AdaptiveCard',
  body: [{type: 'TextBlock', text: 'Suggested response'}],
};

describe('AdaptiveCardRenderer', () => {
  beforeEach(() => {
    (AdaptiveCards.AdaptiveCard as unknown as jest.Mock).mockClear();
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
    const onUserAction = jest.fn();
    render(
      <AdaptiveCardRenderer card={renderableCard} suggestionText="Suggested response" onUserAction={onUserAction} />
    );

    fireEvent.click(await screen.findByLabelText(`${type[0].toUpperCase()}${type.slice(1)} suggestion`));

    await waitFor(() => expect(onUserAction).toHaveBeenCalledWith({type, actionId}));
    if (type === 'copy') {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Suggested response');
    }
  });

  it('marks like as selected once the action reaches the backend', async () => {
    render(<AdaptiveCardRenderer card={renderableCard} onUserAction={() => Promise.resolve()} />);

    const likeButton = await screen.findByLabelText('Like suggestion');
    fireEvent.click(likeButton);

    await waitFor(() => expect(likeButton).toHaveAttribute('data-active', 'true'));
  });

  it('keeps like and dislike mutually exclusive', async () => {
    render(<AdaptiveCardRenderer card={renderableCard} onUserAction={() => Promise.resolve()} />);

    const likeButton = await screen.findByLabelText('Like suggestion');
    const dislikeButton = screen.getByLabelText('Dislike suggestion');

    fireEvent.click(likeButton);
    await waitFor(() => expect(likeButton).toHaveAttribute('data-active', 'true'));

    fireEvent.click(dislikeButton);
    await waitFor(() => expect(dislikeButton).toHaveAttribute('data-active', 'true'));
    expect(likeButton).not.toHaveAttribute('data-active');
  });

  it('hands actions that are not feedback controls to the host handler', async () => {
    const onAction = jest.fn();
    const onUserAction = jest.fn();
    render(<AdaptiveCardRenderer card={renderableCard} onAction={onAction} onUserAction={onUserAction} />);

    const unlabelled = (await screen.findAllByRole('button')).filter((button) => !button.getAttribute('aria-label'));
    expect(unlabelled).toHaveLength(1);

    fireEvent.click(unlabelled[0]);

    expect(onAction).toHaveBeenCalledWith({id: 'sourceExpandButton'});
    expect(onUserAction).not.toHaveBeenCalled();
  });

  it('leaves like unselected when the action never reaches the backend', async () => {
    render(<AdaptiveCardRenderer card={renderableCard} onUserAction={() => Promise.reject(new Error('failed'))} />);

    const likeButton = await screen.findByLabelText('Like suggestion');
    fireEvent.click(likeButton);

    await waitFor(() => expect(likeButton).not.toHaveAttribute('data-active'));
  });

  it('replaces a failed source image with the bundled link icon', async () => {
    render(<AdaptiveCardRenderer card={renderableCard} />);
    const sourceImage = await screen.findByAltText('Source');
    const originalSource = sourceImage.getAttribute('src');

    fireEvent.error(sourceImage);

    expect(sourceImage.getAttribute('src')).not.toBe(originalSource);
    expect(sourceImage).not.toHaveAttribute('hidden');
  });

  it('shows the unavailable fallback without parsing or requesting a remote image when sanitization leaves no content', async () => {
    render(
      <AdaptiveCardRenderer
        card={{
          type: 'AdaptiveCard',
          body: [{type: 'Image', url: 'https://example.invalid/only.png', altText: 'Remote only'}],
        }}
        fallbackText="The summary is not available"
      />
    );

    expect(await screen.findByTestId('ai-assistant:adaptive-card-fallback')).toHaveTextContent(
      'The summary is not available'
    );
    expect(getLastAdaptiveCard().parse).not.toHaveBeenCalled();
    expect(document.querySelector('img[src="https://example.invalid/only.png"]')).toBeNull();
  });

  it('keeps text renderable after stripping a remote image before parsing', async () => {
    render(
      <AdaptiveCardRenderer
        card={{
          type: 'AdaptiveCard',
          body: [
            {type: 'Image', url: 'https://example.invalid/customer.png', altText: 'Remote customer image'},
            {type: 'TextBlock', text: 'Text remains after remote image sanitization.'},
          ],
        }}
        fallbackText="The summary is not available"
      />
    );

    await waitFor(() => expect(getLastAdaptiveCard().parse).toHaveBeenCalled());
    const parsedCard = getLastAdaptiveCard().parse.mock.calls[0][0] as {
      body: Array<{type: string; text?: string; url?: string}>;
    };

    expect(parsedCard.body[0]).not.toHaveProperty('url');
    expect(parsedCard.body[1].text).toBe('Text remains after remote image sanitization.');
    expect(JSON.stringify(parsedCard)).not.toContain('https://example.invalid/customer.png');
    expect(screen.queryByTestId('ai-assistant:adaptive-card-fallback')).not.toBeInTheDocument();
  });

  it('strips image-set and media remote resources before parsing', async () => {
    render(
      <AdaptiveCardRenderer
        card={{
          type: 'AdaptiveCard',
          body: [
            {type: 'ImageSet', images: [{url: 'https://example.invalid/tracker.png'}]},
            {
              type: 'Media',
              poster: 'https://example.invalid/poster.png',
              sources: [{url: 'https://example.invalid/v.mp4'}],
            },
            {type: 'TextBlock', text: 'Text keeps the card renderable.'},
          ],
        }}
        fallbackText="The summary is not available"
      />
    );

    await waitFor(() => expect(getLastAdaptiveCard().parse).toHaveBeenCalled());
    const parsedCard = getLastAdaptiveCard().parse.mock.calls[0][0];

    expect(JSON.stringify(parsedCard)).not.toContain('https://example.invalid');
    expect(screen.queryByTestId('ai-assistant:adaptive-card-fallback')).not.toBeInTheDocument();
  });

  it('resets the error boundary when a replacement card becomes renderable', async () => {
    const {rerender} = render(
      <AdaptiveCardRenderer
        card={{
          type: 'AdaptiveCard',
          body: [{type: 'Image', url: 'https://example.invalid/only.png'}],
        }}
        fallbackText="The summary is not available"
      />
    );

    expect(await screen.findByTestId('ai-assistant:adaptive-card-fallback')).toHaveTextContent(
      'The summary is not available'
    );

    rerender(<AdaptiveCardRenderer card={renderableCard} fallbackText="The summary is not available" />);

    await waitFor(() => expect(screen.queryByTestId('ai-assistant:adaptive-card-fallback')).not.toBeInTheDocument());
    expect(await screen.findByLabelText('Like suggestion')).toBeInTheDocument();
  });

  it('uses the bordered quote treatment for customer statements', () => {
    render(<AdaptiveCardRenderer card={renderableCard} assistantTitle="The customer said:" />);

    expect(screen.getByTestId('ai-assistant:adaptive-card')).toHaveClass('ai-assistant__card--customer-statement');
  });
});
