import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
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
      getAllInputs: jest.Mock;
    } = {
      parse: jest.fn(),
      getAllActions: jest.fn(() => actions),
      getAllInputs: jest.fn(() => []),
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
    let finishCopy: (() => void) | undefined;
    if (type === 'copy') {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: jest.fn(
            () =>
              new Promise<void>((resolve) => {
                finishCopy = resolve;
              })
          ),
        },
      });
    }
    render(
      <AdaptiveCardRenderer
        card={{type: 'AdaptiveCard'}}
        suggestionText="Suggested response"
        onUserAction={onUserAction}
      />
    );

    fireEvent.click(await screen.findByLabelText(`${type[0].toUpperCase()}${type.slice(1)} suggestion`));

    expect(onUserAction).toHaveBeenCalledWith({type, actionId});
    if (type === 'copy') {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Suggested response');
      await act(async () => finishCopy?.());
    }
  });

  it('toggles suggested-response feedback only as each rapid click reaches the backend', async () => {
    const completeActions: Array<() => void> = [];
    const onUserAction = jest.fn(() => new Promise<void>((resolve) => completeActions.push(resolve)));
    render(<AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} onUserAction={onUserAction} />);

    const likeButton = await screen.findByLabelText('Like suggestion');
    fireEvent.click(likeButton);
    fireEvent.click(likeButton);
    expect(onUserAction.mock.calls).toEqual([
      [{type: 'like', actionId: 'likeButton'}],
      [{type: 'like', actionId: 'likeButton'}],
    ]);
    expect(likeButton).not.toHaveAttribute('data-active');

    await act(async () => completeActions[0]());
    expect(likeButton).toHaveAttribute('data-active', 'true');
    await act(async () => completeActions[1]());
    expect(likeButton).not.toHaveAttribute('data-active');
  });

  it('clears repeated feedback and restores controlled feedback on a replacement card', async () => {
    const onUserAction = jest.fn();
    const {rerender} = render(
      <AdaptiveCardRenderer card={{type: 'AdaptiveCard'}} feedback="like" onUserAction={onUserAction} />
    );
    const likeButton = await screen.findByLabelText('Like suggestion');
    expect(likeButton).toHaveAttribute('data-active', 'true');
    expect(likeButton).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(likeButton);
    expect(onUserAction).toHaveBeenCalledWith({type: 'like', actionId: 'likeButton', feedback: 'none'});

    rerender(<AdaptiveCardRenderer card={{type: 'AdaptiveCard', version: '1.5'}} feedback="dislike" />);
    expect(await screen.findByLabelText('Dislike suggestion')).toHaveAttribute('data-active', 'true');
    expect(screen.getByLabelText('Like suggestion')).not.toHaveAttribute('data-active');
  });

  it('updates feedback without parsing or replacing the focused card', async () => {
    const card = {type: 'AdaptiveCard'};
    const {rerender} = render(<AdaptiveCardRenderer card={card} feedback="none" />);
    const likeButton = await screen.findByLabelText('Like suggestion');
    likeButton.focus();
    const parse = jest.requireMock('adaptivecards').AdaptiveCard.mock.results.slice(-1)[0].value.parse;

    rerender(<AdaptiveCardRenderer card={card} feedback="like" />);

    expect(screen.getByLabelText('Like suggestion')).toBe(likeButton);
    expect(likeButton).toHaveFocus();
    expect(likeButton).toHaveAttribute('data-active', 'true');
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('uses updated callbacks and copy text without rebuilding the card', async () => {
    const card = {type: 'AdaptiveCard'};
    const previousAction = jest.fn();
    const nextAction = jest.fn();
    const onAction = jest.fn();
    const {rerender} = render(
      <AdaptiveCardRenderer card={card} suggestionText="Previous suggestion" onUserAction={previousAction} />
    );
    const copyButton = await screen.findByLabelText('Copy suggestion');
    const instance = jest.requireMock('adaptivecards').AdaptiveCard.mock.results.slice(-1)[0].value;

    rerender(
      <AdaptiveCardRenderer
        card={card}
        suggestionText="Current suggestion"
        onUserAction={nextAction}
        onAction={onAction}
      />
    );
    fireEvent.click(screen.getByLabelText('Like suggestion'));
    fireEvent.click(copyButton);
    instance.onExecuteAction({id: 'sourceExpandButton'});

    await waitFor(() => expect(nextAction).toHaveBeenCalledWith({type: 'copy', actionId: 'copyButton'}));
    expect(nextAction).toHaveBeenCalledWith({type: 'like', actionId: 'likeButton'});
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Current suggestion');
    expect(onAction).toHaveBeenCalledWith({id: 'sourceExpandButton'});
    expect(previousAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Copy suggestion')).toBe(copyButton);
    expect(instance.parse).toHaveBeenCalledTimes(1);
  });

  it('uses host-provided summary action labels and preserves suggested-response defaults', async () => {
    const card = {type: 'AdaptiveCard'};
    const {rerender} = render(<AdaptiveCardRenderer card={card} />);
    const copyButton = await screen.findByLabelText('Copy suggestion');
    rerender(
      <AdaptiveCardRenderer
        card={card}
        actionLabels={{copy: 'Copy Summary', like: 'This is helpful', dislike: "This isn't helpful"}}
      />
    );
    expect(screen.getByLabelText('Copy Summary')).toBe(copyButton);
    expect(screen.getByLabelText('This is helpful')).toBeInTheDocument();
    expect(screen.getByLabelText("This isn't helpful")).toBeInTheDocument();
    rerender(<AdaptiveCardRenderer card={card} />);
    expect(screen.getByLabelText('Copy suggestion')).toBe(copyButton);
  });

  it('emits summary copy only after the clipboard write succeeds', async () => {
    let completeCopy: (() => void) | undefined;
    const writeText = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          completeCopy = resolve;
        })
    );
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}});
    const onUserAction = jest.fn();
    render(
      <AdaptiveCardRenderer
        card={{type: 'AdaptiveCard'}}
        presentation="summary"
        suggestionText="Summary"
        onUserAction={onUserAction}
      />
    );

    fireEvent.click(await screen.findByLabelText('Copy suggestion'));
    expect(onUserAction).not.toHaveBeenCalled();
    await act(async () => {
      completeCopy?.();
    });
    expect(onUserAction).toHaveBeenCalledWith({type: 'copy', actionId: 'copyButton'});
  });

  it('does not emit summary copy when the clipboard write fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText: jest.fn().mockRejectedValue(new Error('Clipboard unavailable'))},
    });
    const onUserAction = jest.fn();
    render(
      <AdaptiveCardRenderer
        card={{type: 'AdaptiveCard'}}
        presentation="summary"
        suggestionText="Summary"
        onUserAction={onUserAction}
      />
    );
    const copyButton = await screen.findByLabelText('Copy suggestion');
    fireEvent.click(copyButton);
    await act(async () => undefined);
    expect(onUserAction).not.toHaveBeenCalled();
    expect(copyButton).not.toHaveAttribute('data-copied');
  });

  it.each(['replaced', 'unmounted'] as const)('ignores clipboard completion after its card is %s', async (change) => {
    let completeCopy: (() => void) | undefined;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn(
          () =>
            new Promise<void>((resolve) => {
              completeCopy = resolve;
            })
        ),
      },
    });
    const onUserAction = jest.fn();
    const {rerender, unmount} = render(
      <AdaptiveCardRenderer
        card={{type: 'AdaptiveCard'}}
        presentation="summary"
        suggestionText="Old summary"
        onUserAction={onUserAction}
      />
    );
    const copyButton = await screen.findByLabelText('Copy suggestion');
    fireEvent.click(copyButton);
    if (change === 'replaced')
      rerender(<AdaptiveCardRenderer card={{type: 'AdaptiveCard', version: '1.5'}} presentation="summary" />);
    else unmount();

    await act(async () => {
      completeCopy?.();
    });
    expect(onUserAction).not.toHaveBeenCalled();
    expect(copyButton).not.toHaveAttribute('data-copied');
  });

  it('invalidates pending copy when a new response reuses the same card object', async () => {
    let completeCopy: (() => void) | undefined;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn(
          () =>
            new Promise<void>((resolve) => {
              completeCopy = resolve;
            })
        ),
      },
    });
    const card = {type: 'AdaptiveCard'};
    const onUserAction = jest.fn();
    const {rerender} = render(
      <AdaptiveCardRenderer
        card={card}
        contentIdentity={{id: 'previous-summary'}}
        presentation="summary"
        suggestionText="Old summary"
        onUserAction={onUserAction}
      />
    );
    const previousButton = await screen.findByLabelText('Copy suggestion');
    fireEvent.click(previousButton);
    rerender(<AdaptiveCardRenderer card={card} contentIdentity={{id: 'next-summary'}} presentation="summary" />);
    await act(async () => {
      completeCopy?.();
    });
    expect(previousButton).not.toHaveAttribute('data-copied');
    expect(onUserAction).not.toHaveBeenCalled();
  });

  it('disables actions without replacing the rendered card', async () => {
    const card = {type: 'AdaptiveCard'};
    const onUserAction = jest.fn();
    const onAction = jest.fn();
    const {rerender} = render(<AdaptiveCardRenderer card={card} onUserAction={onUserAction} onAction={onAction} />);
    const likeButton = await screen.findByLabelText('Like suggestion');
    rerender(<AdaptiveCardRenderer card={card} disabled onUserAction={onUserAction} onAction={onAction} />);
    expect(screen.getByLabelText('Like suggestion')).toBe(likeButton);
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    });
    expect(onUserAction).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('hides unsupported actions and restores them without reparsing the card', async () => {
    const card = {type: 'AdaptiveCard'};
    const onAction = jest.fn();
    const onUserAction = jest.fn();
    const {rerender} = render(<AdaptiveCardRenderer card={card} onAction={onAction} onUserAction={onUserAction} />);
    const copyButton = await screen.findByLabelText('Copy suggestion');
    const instance = jest.requireMock('adaptivecards').AdaptiveCard.mock.results.slice(-1)[0].value;
    rerender(
      <AdaptiveCardRenderer
        card={card}
        hiddenActionIds={['copyButton', 'sourceExpandButton']}
        onAction={onAction}
        onUserAction={onUserAction}
      />
    );
    expect(copyButton).not.toBeVisible();
    instance.onExecuteAction({id: 'copyButton'});
    instance.onExecuteAction({id: 'sourceExpandButton'});
    expect(onAction).not.toHaveBeenCalled();
    expect(onUserAction).not.toHaveBeenCalled();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    rerender(<AdaptiveCardRenderer card={card} onAction={onAction} onUserAction={onUserAction} />);
    expect(screen.getByLabelText('Copy suggestion')).toBe(copyButton);
    expect(copyButton).toBeVisible();
    expect(instance.parse).toHaveBeenCalledTimes(1);
  });

  it('restores Input.Text drafts and emits original field ids without reparsing or losing focus', async () => {
    const adaptiveCards = jest.requireActual<typeof import('adaptivecards')>('adaptivecards');
    const adaptiveCard = new adaptiveCards.AdaptiveCard();
    const parse = jest.spyOn(adaptiveCard, 'parse');
    jest.requireMock('adaptivecards').AdaptiveCard.mockImplementationOnce(() => adaptiveCard);
    jest
      .requireMock('adaptivecards')
      .HostConfig.mockImplementationOnce(
        (config: ConstructorParameters<typeof adaptiveCards.HostConfig>[0]) => new adaptiveCards.HostConfig(config)
      );
    const card = {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [{type: 'Input.Text', id: 'reasonForContact', value: 'Server summary', isMultiline: true}],
    };
    const originalCard = JSON.stringify(card);
    const onInputChange = jest.fn();
    const {rerender} = render(
      <AdaptiveCardRenderer card={card} inputValues={{reasonForContact: 'Local draft'}} onInputChange={onInputChange} />
    );
    const editor = await screen.findByRole('textbox');
    expect(editor).toHaveValue('Local draft');
    editor.focus();
    fireEvent.input(editor, {target: {value: ''}});
    expect(onInputChange).toHaveBeenLastCalledWith('reasonForContact', '');

    rerender(<AdaptiveCardRenderer card={card} inputValues={{reasonForContact: ''}} onInputChange={onInputChange} />);
    expect(screen.getByRole('textbox')).toBe(editor);
    expect(editor).toHaveFocus();
    expect(editor).toHaveValue('');
    expect(parse).toHaveBeenCalledTimes(1);

    rerender(
      <AdaptiveCardRenderer
        card={card}
        inputValues={{reasonForContact: 'Restored draft'}}
        disabled
        onInputChange={onInputChange}
      />
    );
    expect(editor).toHaveValue('Restored draft');
    expect(editor).toBeDisabled();
    fireEvent.input(editor, {target: {value: 'Ignore disabled event'}});
    expect(onInputChange).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(card)).toBe(originalCard);
  });

  it.each([1, 2])('applies a plain draft only to an unambiguous single text input (%s inputs)', async (inputCount) => {
    const adaptiveCards = jest.requireActual<typeof import('adaptivecards')>('adaptivecards');
    jest.requireMock('adaptivecards').AdaptiveCard.mockImplementationOnce(() => new adaptiveCards.AdaptiveCard());
    jest
      .requireMock('adaptivecards')
      .HostConfig.mockImplementationOnce(
        (config: ConstructorParameters<typeof adaptiveCards.HostConfig>[0]) => new adaptiveCards.HostConfig(config)
      );
    const card = {
      type: 'AdaptiveCard',
      version: '1.5',
      body: Array.from({length: inputCount}, (_, index) => ({
        type: 'Input.Text',
        id: `backend-field-${index}`,
        value: `Original value ${index}`,
      })),
    };
    const onInputChange = jest.fn();
    render(<AdaptiveCardRenderer card={card} inputValues="Local plain summary" onInputChange={onInputChange} />);
    const editors = await screen.findAllByRole('textbox');
    editors.forEach((editor, index) =>
      expect(editor).toHaveValue(inputCount === 1 ? 'Local plain summary' : `Original value ${index}`)
    );
    fireEvent.input(editors[0], {target: {value: 'Edited value'}});
    expect(onInputChange).toHaveBeenCalledWith('backend-field-0', 'Edited value');
  });

  it('makes card inputs read-only without replacing them and suppresses change callbacks', async () => {
    const adaptiveCards = jest.requireActual<typeof import('adaptivecards')>('adaptivecards');
    const adaptiveCard = new adaptiveCards.AdaptiveCard();
    const parse = jest.spyOn(adaptiveCard, 'parse');
    jest.requireMock('adaptivecards').AdaptiveCard.mockImplementationOnce(() => adaptiveCard);
    jest
      .requireMock('adaptivecards')
      .HostConfig.mockImplementationOnce(
        (config: ConstructorParameters<typeof adaptiveCards.HostConfig>[0]) => new adaptiveCards.HostConfig(config)
      );
    const card = {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [{type: 'Input.Text', id: 'summary', value: 'Original summary', isMultiline: true}],
      actions: [{type: 'Action.Submit', id: 'copyButton', title: 'Copy', isEnabled: false}],
    };
    const onInputChange = jest.fn();
    const {rerender} = render(<AdaptiveCardRenderer card={card} onInputChange={onInputChange} />);
    const editor = await screen.findByRole('textbox');
    const serverDisabledAction = screen.getByRole('button', {name: 'Copy'});
    expect(serverDisabledAction).toBeDisabled();
    rerender(<AdaptiveCardRenderer card={card} onInputChange={onInputChange} readOnlyInputs />);
    expect(screen.getByRole('textbox')).toBe(editor);
    expect(editor).toHaveAttribute('readonly');
    expect(editor).not.toBeDisabled();
    fireEvent.input(editor, {target: {value: 'Unsupported edit'}});
    expect(onInputChange).not.toHaveBeenCalled();
    rerender(<AdaptiveCardRenderer card={card} onInputChange={onInputChange} />);
    expect(editor).not.toHaveAttribute('readonly');
    fireEvent.input(editor, {target: {value: 'Supported edit'}});
    expect(onInputChange).toHaveBeenCalledWith('summary', 'Supported edit');
    expect(serverDisabledAction).toBeDisabled();
    expect(serverDisabledAction).toHaveAttribute('aria-disabled', 'true');
    expect(parse).toHaveBeenCalledTimes(1);
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

  it('recovers an interactive summary render error when its response is replaced', async () => {
    jest.requireMock('adaptivecards').AdaptiveCard.mockImplementationOnce(() => ({
      parse: jest.fn(() => {
        throw new Error('Malformed summary');
      }),
    }));
    const card = {type: 'AdaptiveCard'};
    const {rerender} = render(
      <AdaptiveCardRenderer card={card} contentIdentity={{id: 'previous-summary'}} fallbackText="Summary unavailable" />
    );
    expect(await screen.findByTestId('ai-assistant:adaptive-card-fallback')).toHaveTextContent('Summary unavailable');
    rerender(
      <AdaptiveCardRenderer card={card} contentIdentity={{id: 'next-summary'}} fallbackText="Summary unavailable" />
    );
    expect(await screen.findByLabelText('Like suggestion')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:adaptive-card-fallback')).not.toBeInTheDocument();
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
      expect(extractCardText(screen.getByTestId('ai-assistant:adaptive-card'), {summaryOnly: true})).toBe(
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
