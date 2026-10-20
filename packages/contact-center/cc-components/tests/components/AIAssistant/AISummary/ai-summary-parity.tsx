import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import AISummary from '../../../../src/components/AIAssistant/AISummary/ai-summary';
import type {AISummaryProps} from '../../../../src/components/AIAssistant/AISummary/ai-summary.types';

const content = {
  conversationId: 'summary-parity',
  sections: {initialContactReason: 'Invoice question', nextSteps: ''},
};

const renderSummary = (props: Partial<AISummaryProps> = {}) =>
  render(<AISummary mode="post-call" state="content" content={content} onEdit={jest.fn()} {...props} />);

describe('Desktop summary interactions', () => {
  const innerText = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText');
  beforeAll(() => {
    // Adaptive Cards uses innerText; jsdom only implements textContent.
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent;
      },
      set(value: string) {
        this.textContent = value;
      },
    });
  });
  afterAll(() => {
    if (innerText) Object.defineProperty(HTMLElement.prototype, 'innerText', innerText);
    else Reflect.deleteProperty(HTMLElement.prototype, 'innerText');
  });
  it('shows read-only text until the explicit Edit summary action opens all fields', async () => {
    renderSummary();
    expect(document.querySelector('mdc-textarea')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Edit Initial contact reason'})).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', {name: 'Edit summary'}));
    await waitFor(() => expect(document.querySelectorAll('mdc-textarea')).toHaveLength(2));
    expect(document.querySelector('mdc-textarea[label="Next Steps"]')).toBeInTheDocument();
  });

  it('shows unavailable without receiver actions when the SDK payload has no card', () => {
    renderSummary({mode: 'mid-call-receiver', onCopy: jest.fn(() => true), onFeedback: jest.fn()});
    expect(screen.getByTestId('ai-summary:unavailable')).toHaveTextContent('The summary is not available');
    expect(screen.queryByTestId('ai-assistant:adaptive-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-summary:actions')).not.toBeInTheDocument();
  });

  it('offers Retry for a failed mid-call summary', async () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    renderSummary({mode: 'mid-call-initiator', state: 'generic-error', onRetry});
    fireEvent.click(await screen.findByRole('button', {name: 'Retry'}));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('uses the SDK view and edit cards without rewriting the payload', async () => {
    const cardContent = {
      ...content,
      adaptiveCard: {
        type: 'AdaptiveCard',
        version: '1.3',
        body: [{type: 'TextBlock', text: 'SDK view'}],
        actions: [{type: 'Action.Submit', id: 'editButton', title: 'Edit summary'}],
      },
      editAdaptiveCard: {
        type: 'AdaptiveCard',
        version: '1.3',
        body: [
          {type: 'TextBlock', text: 'SDK editor'},
          {type: 'Input.Text', id: 'initialContactReason', value: 'Invoice question', isMultiline: true},
        ],
      },
    };
    const original = JSON.stringify(cardContent);
    renderSummary({content: cardContent});
    expect(await screen.findByText('SDK view')).toBeInTheDocument();
    expect(screen.getByTestId('ai-summary:editor-surface')).toHaveClass('ai-summary__native-card');
    expect(screen.getByTestId('ai-assistant:adaptive-card')).toHaveClass('ai-assistant__card--summary');
    fireEvent.click(await screen.findByRole('button', {name: 'Edit summary'}));
    expect(await screen.findByText('SDK editor')).toBeInTheDocument();
    expect(JSON.stringify(cardContent)).toBe(original);
  });
  it('keeps a card-only payload in view mode when its initial response is empty', async () => {
    renderSummary({
      content: {
        conversationId: 'card-only',
        adaptiveCard: {type: 'AdaptiveCard', version: '1.3', body: [{type: 'TextBlock', text: 'Read first'}]},
        editAdaptiveCard: {
          type: 'AdaptiveCard',
          version: '1.3',
          body: [{type: 'TextBlock', text: 'Editing prematurely'}],
        },
      },
      editedSummary: '',
    });
    expect(await screen.findByText('Read first')).toBeInTheDocument();
    expect(screen.queryByText('Editing prematurely')).not.toBeInTheDocument();
  });

  it('edits canonical SDK card fields missing from sections while ignoring outcome and unknown fields', async () => {
    const onEdit = jest.fn();
    const sdkContent = {
      conversationId: 'optional-section-fields',
      sections: {initialContactReason: 'Invoice question'},
      adaptiveCard: {
        type: 'AdaptiveCard',
        version: '1.3',
        body: [{type: 'TextBlock', text: 'Summary view'}],
        actions: [{type: 'Action.Submit', id: 'editButton', title: 'Edit summary'}],
      },
      editAdaptiveCard: {
        type: 'AdaptiveCard',
        version: '1.3',
        body: [
          {type: 'Input.Text', id: 'additionalContext', label: 'Additional context', value: '', isMultiline: true},
          {type: 'Input.Text', id: 'resolution', label: 'Outcome', value: '', isMultiline: true},
          {type: 'Input.Text', id: 'unknownField', label: 'Unknown field', value: '', isMultiline: true},
        ],
      },
    };
    const original = JSON.stringify(sdkContent);
    renderSummary({onEdit, content: sdkContent});
    fireEvent.click(await screen.findByRole('button', {name: 'Edit summary'}));
    fireEvent.input(await screen.findByRole('textbox', {name: 'Additional context'}), {target: {value: 'New context'}});
    expect(onEdit).toHaveBeenCalledWith('additionalContext', 'New context');
    fireEvent.input(screen.getByRole('textbox', {name: 'Outcome'}), {target: {value: 'Uneditable outcome'}});
    fireEvent.input(screen.getByRole('textbox', {name: 'Unknown field'}), {target: {value: 'Unknown edit'}});
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(sdkContent)).toBe(original);
  });

  it('preserves the SDK editor value when a plain card has no summaryText baseline', async () => {
    const onEdit = jest.fn();
    renderSummary({
      content: {
        conversationId: 'plain-card-only',
        adaptiveCard: {
          type: 'AdaptiveCard',
          version: '1.3',
          body: [{type: 'TextBlock', text: 'SDK summary'}],
          actions: [{type: 'Action.Submit', id: 'editButton', title: 'Edit summary'}],
        },
        editAdaptiveCard: {
          type: 'AdaptiveCard',
          version: '1.3',
          body: [{type: 'Input.Text', id: 'conversationSummaryTextInput', value: 'SDK summary', isMultiline: true}],
        },
      },
      editedSummary: '',
      onEdit,
    });
    fireEvent.click(await screen.findByRole('button', {name: 'Edit summary'}));
    const editor = await screen.findByRole('textbox');
    expect(editor).toHaveValue('SDK summary');
    fireEvent.input(editor, {target: {value: 'Revised summary'}});
    expect(onEdit).toHaveBeenCalledWith('summaryText', 'Revised summary');
  });

  it('routes card Retry and hides unsupported card actions', async () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    renderSummary({
      onRetry,
      onEdit: undefined,
      content: {
        ...content,
        adaptiveCard: {
          type: 'AdaptiveCard',
          version: '1.3',
          body: [],
          actions: [
            {type: 'Action.Submit', id: 'editButton', title: 'Edit summary'},
            {type: 'Action.Submit', id: 'copyButton', title: 'Copy Summary'},
            {type: 'Action.Submit', id: 'likeButton', title: 'Helpful'},
            {type: 'Action.Submit', id: 'retryButton', title: 'Try again'},
          ],
        },
      },
    });
    fireEvent.click(await screen.findByRole('button', {name: 'Try again'}));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', {name: 'Edit summary'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Copy Summary'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'This is helpful'})).not.toBeInTheDocument();
  });

  it('restores a plain draft into the SDK input with its original field id', async () => {
    const onEdit = jest.fn();
    renderSummary({
      onEdit,
      editedSummary: 'Restored draft',
      content: {
        conversationId: 'plain-card',
        summaryText: 'Original text',
        editAdaptiveCard: {
          type: 'AdaptiveCard',
          version: '1.3',
          body: [{type: 'Input.Text', id: 'backend-summary-field', value: 'Original text', isMultiline: true}],
        },
      },
    });
    const input = await screen.findByDisplayValue('Restored draft');
    expect(input).toHaveFocus();
    fireEvent.input(input, {target: {value: 'Continued draft'}});
    expect(onEdit).toHaveBeenCalledWith('summaryText', 'Continued draft');
  });
  it('shares successful copy and controlled feedback actions with suggested responses', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}});
    const onCopy = jest.fn(() => true);
    const onFeedback = jest.fn();
    const sdkContent = {
      ...content,
      adaptiveCard: {
        type: 'AdaptiveCard',
        version: '1.3',
        body: [{type: 'TextBlock', text: 'Invoice question'}],
        actions: ['copyButton', 'likeButton', 'dislikeButton'].map((id) => ({type: 'Action.Submit', id, title: ''})),
      },
    };
    const Harness = () => {
      const [feedback, setFeedback] = React.useState<AISummaryProps['selectedFeedback']>('none');
      return (
        <AISummary
          mode="post-call"
          state="content"
          content={sdkContent}
          selectedFeedback={feedback}
          onCopy={onCopy}
          onFeedback={(next) => {
            onFeedback(next);
            setFeedback(next);
          }}
        />
      );
    };
    render(<Harness />);
    const like = await screen.findByRole('button', {name: 'This is helpful'});
    fireEvent.click(like);
    expect(onFeedback).toHaveBeenLastCalledWith('thumbs_up');
    expect(like).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(like);
    expect(onFeedback).toHaveBeenLastCalledWith('none');
    expect(like).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(await screen.findByRole('button', {name: 'Copy Summary'}));
    await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith('Initial contact reason: Invoice question');
  });
});
