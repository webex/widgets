import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
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
    const onUserAction = jest.fn();
    render(
      <AdaptiveCardRenderer
        card={{type: 'AdaptiveCard'}}
        suggestionText="Suggested response"
        onUserAction={onUserAction}
      />
    );

    fireEvent.click(await screen.findByLabelText(`${type[0].toUpperCase()}${type.slice(1)} suggestion`));

    await waitFor(() => expect(onUserAction).toHaveBeenCalledWith({type, actionId}));
    if (type === 'copy') {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Suggested response');
    }
  });

  it('marks like as selected once the action reaches the backend', async () => {
    render(<AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} onUserAction={() => Promise.resolve()} />);

    const likeButton = await screen.findByLabelText('Like suggestion');
    fireEvent.click(likeButton);

    await waitFor(() => expect(likeButton).toHaveAttribute('data-active', 'true'));
  });

  it('keeps like and dislike mutually exclusive', async () => {
    render(<AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} onUserAction={() => Promise.resolve()} />);

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
    render(<AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} onAction={onAction} onUserAction={onUserAction} />);

    const unlabelled = (await screen.findAllByRole('button')).filter((button) => !button.getAttribute('aria-label'));
    expect(unlabelled).toHaveLength(1);

    fireEvent.click(unlabelled[0]);

    expect(onAction).toHaveBeenCalledWith({id: 'sourceExpandButton'});
    expect(onUserAction).not.toHaveBeenCalled();
  });

  it('leaves like unselected when the action never reaches the backend', async () => {
    render(
      <AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} onUserAction={() => Promise.reject(new Error('failed'))} />
    );

    const likeButton = await screen.findByLabelText('Like suggestion');
    fireEvent.click(likeButton);

    await waitFor(() => expect(likeButton).not.toHaveAttribute('data-active'));
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
