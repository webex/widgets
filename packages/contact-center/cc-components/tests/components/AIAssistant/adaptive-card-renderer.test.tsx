import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import AdaptiveCardRenderer from '../../../src/components/AIAssistant/AdaptiveCardRenderer/adaptive-card-renderer';
import {extractCardText} from '../../../src/components/AIAssistant/AdaptiveCardRenderer/adaptive-card-renderer.utils';

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

  it('keeps a host footer inside the card while omitting backend timestamp metadata only from its render clone', async () => {
    const card = {
      type: 'AdaptiveCard',
      body: [
        {type: 'TextBlock', text: 'Received summary'},
        {
          type: 'RichTextBlock',
          id: 'source-timestamp-richTextBlock',
          inlines: [{type: 'TextRun', text: '${sourceTimestamp}'}],
        },
      ],
    };
    const original = JSON.stringify(card);
    render(<AdaptiveCardRenderer card={card} displayOnly omitSourceTimestamp footer={<button>Host copy</button>} />);

    const footerControl = await screen.findByRole('button', {name: 'Host copy'});
    expect(footerControl.parentElement).toHaveClass('ai-assistant__card-footer');
    expect(screen.getByTestId('ai-assistant:adaptive-card')).toContainElement(footerControl);
    const parser = jest.requireMock('adaptivecards').AdaptiveCard.mock.results.at(-1).value.parse;
    expect(parser).toHaveBeenCalledWith({type: 'AdaptiveCard', body: [{type: 'TextBlock', text: 'Received summary'}]});
    expect(JSON.stringify(card)).toBe(original);
  });

  it('resets a receiver summary error when its card is replaced', async () => {
    jest.requireMock('adaptivecards').AdaptiveCard.mockImplementationOnce(() => ({
      parse: jest.fn(() => {
        throw new Error('Malformed card');
      }),
      render: jest.fn(),
      getAllActions: jest.fn(() => []),
    }));
    const {rerender} = render(
      <AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} displayOnly fallbackText="The summary is not available" />
    );

    expect(await screen.findByTestId('ai-assistant:adaptive-card-fallback')).toHaveTextContent(
      'The summary is not available'
    );

    rerender(
      <AdaptiveCardRenderer
        card={{type: 'AdaptiveCard', version: '1.5'}}
        displayOnly
        fallbackText="The summary is not available"
      />
    );

    await waitFor(() => expect(screen.queryByTestId('ai-assistant:adaptive-card-fallback')).not.toBeInTheDocument());
    expect(await screen.findByLabelText('Like suggestion')).toBeInTheDocument();
  });

  it('keeps the ordinary RTA error fallback when its card is replaced', async () => {
    jest.requireMock('adaptivecards').AdaptiveCard.mockImplementationOnce(() => ({
      parse: jest.fn(() => {
        throw new Error('Malformed card');
      }),
      render: jest.fn(),
      getAllActions: jest.fn(() => []),
    }));
    const {rerender} = render(
      <AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} fallbackText="Suggestion unavailable" />
    );

    expect(await screen.findByTestId('ai-assistant:adaptive-card-fallback')).toHaveTextContent(
      'Suggestion unavailable'
    );

    rerender(
      <AdaptiveCardRenderer card={{type: 'AdaptiveCard', version: '1.5'}} fallbackText="Suggestion unavailable" />
    );

    expect(screen.getByTestId('ai-assistant:adaptive-card-fallback')).toHaveTextContent('Suggestion unavailable');
    expect(screen.queryByLabelText('Like suggestion')).not.toBeInTheDocument();
  });

  it('renders receiver cards without actions or inputs and copies only their visible text', async () => {
    // Adaptive Cards writes plain text through innerText, which jsdom does not implement.
    const innerText = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText');
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent;
      },
      set(value: string) {
        this.textContent = value;
      },
    });
    try {
      const adaptiveCards = jest.requireActual<typeof import('adaptivecards')>('adaptivecards');
      jest.requireMock('adaptivecards').AdaptiveCard.mockImplementationOnce(() => new adaptiveCards.AdaptiveCard());
      jest
        .requireMock('adaptivecards')
        .HostConfig.mockImplementationOnce(
          (config: ConstructorParameters<typeof adaptiveCards.HostConfig>[0]) => new adaptiveCards.HostConfig(config)
        );
      const onRender = jest.fn();
      const onAction = jest.fn();
      const onUserAction = jest.fn();
      const card = {
        type: 'AdaptiveCard',
        version: '1.5',
        selectAction: {type: 'Action.Submit', title: 'Select card'},
        body: [
          {type: 'TextBlock', text: 'Receiver summary'},
          {type: 'TextBlock', text: 'Hidden summary', isVisible: false},
          {
            type: 'Container',
            isVisible: false,
            items: [{type: 'TextBlock', text: 'Hidden container text'}],
          },
          {
            type: 'Container',
            selectAction: {type: 'Action.OpenUrl', title: 'Open container', url: 'https://example.com'},
            items: [
              {type: 'RichTextBlock', inlines: [{type: 'TextRun', text: 'Next steps'}]},
              {type: 'FactSet', facts: [{title: 'Outcome', value: 'Resolved'}]},
              {
                type: 'Container',
                items: [{type: 'TextBlock', text: '• Confirm resolution\n• Thank the customer', wrap: true}],
              },
              {type: 'Input.Text', id: 'edit', value: 'Hidden input'},
              {type: 'ActionSet', actions: [{type: 'Action.Submit', title: 'Like'}]},
            ],
          },
        ],
        actions: [{type: 'Action.Submit', title: 'Copy'}],
      };
      const originalCard = JSON.stringify(card);
      render(
        <AdaptiveCardRenderer
          card={card}
          displayOnly
          onRender={onRender}
          onAction={onAction}
          onUserAction={onUserAction}
        />
      );

      expect(await screen.findByText('Receiver summary')).toBeInTheDocument();
      expect(screen.getByText('Next steps')).toBeInTheDocument();
      expect(screen.getByText('Outcome')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('Hidden summary')).not.toBeVisible();
      expect(screen.getByText('Hidden container text')).not.toBeVisible();
      expect(extractCardText(screen.getByTestId('ai-assistant:adaptive-card'), {visibleOnly: true})).toBe(
        'Receiver summary\nNext steps\nOutcome\nResolved\n• Confirm resolution\n• Thank the customer'
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(onRender).toHaveBeenLastCalledWith(true);
      expect(onAction).not.toHaveBeenCalled();
      expect(onUserAction).not.toHaveBeenCalled();
      expect(JSON.stringify(card)).toBe(originalCard);
    } finally {
      if (innerText) {
        Object.defineProperty(HTMLElement.prototype, 'innerText', innerText);
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).innerText;
      }
    }
  });

  it.each(['parse-error', 'no-output', 'absent-card'] as const)(
    'reports a receiver render failure for %s',
    async (failure) => {
      if (failure !== 'absent-card') {
        jest.requireMock('adaptivecards').AdaptiveCard.mockImplementationOnce(() => ({
          parse: jest.fn(() => {
            if (failure === 'parse-error') throw new Error('Malformed card');
          }),
          render: jest.fn(() => undefined),
          getAllActions: jest.fn(() => []),
        }));
      }
      const onRender = jest.fn();
      render(
        <AdaptiveCardRenderer
          card={failure === 'absent-card' ? undefined : {type: 'AdaptiveCard'}}
          displayOnly
          onRender={onRender}
          fallbackText="The summary is not available"
        />
      );

      await waitFor(() => expect(onRender).toHaveBeenLastCalledWith(false));
      if (failure !== 'absent-card') {
        expect(screen.getByTestId('ai-assistant:adaptive-card-fallback')).toHaveTextContent(
          'The summary is not available'
        );
      }
    }
  );

  it('uses the bordered quote treatment for customer statements', () => {
    render(<AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} assistantTitle="The customer said:" />);

    expect(screen.getByTestId('ai-assistant:adaptive-card')).toHaveClass('ai-assistant__card--customer-statement');
  });
});
