import React from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import type {AISummaryEntry, AISummaryResponse} from '@webex/cc-store';
import AISummary, {
  AI_ASSISTANT_SUMMARY_MESSAGES,
  AI_ASSISTANT_SUMMARY_SECTION_ORDER,
  getDisplaySections,
} from '../../../../src/components/AIAssistant/AISummary';

type AISummaryContent = NonNullable<AISummaryEntry['content']>;
import {COPIED_FEEDBACK_MS} from '../../../../src/components/AIAssistant/constants';

const sectionContent: AISummaryContent = {
  conversationId: 'interaction-main-1',
  sections: {
    initialContactReason: 'Customer asked for invoice help.',
    nextSteps: 'Send the updated invoice.',
  },
  resolution: 'Correction approved',
};

const textContent: AISummaryContent = {
  conversationId: 'interaction-main-1',
  summaryText: 'Customer asked for invoice help.',
};

const receiverContent: AISummaryContent = {
  ...textContent,
  adaptiveCard: {
    type: 'AdaptiveCard',
    version: '1.3',
    body: [{type: 'TextBlock', text: 'Visible receiver copy'}],
  },
};

const COMPLETE_WRAP_UP_LABEL = 'Submit Wrap Up';
const SECTION_DISPLAY_KEYS = [
  'reasonForTransferOrConsult',
  'initialContactReason',
  'additionalContactReasons',
  'additionalContext',
  'keyActionsTaken',
  'resolution',
  'nextSteps',
] as const;

const LITERAL_SUMMARY_COPY = {
  generatingTitle: 'Generating summary...',
  generatingDescription: 'Just a sec—the details are coming together.',
  unavailable: 'The summary is not available',
  generationError: 'Having trouble generating summary',
  generationErrorDescription:
    'It could be a lost connection or something else. Could you check your connection or try again later?',
  copySummary: 'Copy Summary',
  copied: 'Copied',
  attribution: 'AI-generated',
  like: 'This is helpful',
  dislike: "This isn't helpful",
  retry: 'Retry',
  completeWrapUp: 'Submit Wrap Up',
} as const;

const clipboardWrite = (impl: (value: string) => Promise<void>) => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value: {
      writeText: jest.fn(impl),
    },
  });
};

const flushSettledCallbacks = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const flushUnhandledRejectionQueues = async () => {
  await act(async () => {
    await Promise.resolve();
  });
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  await act(async () => {
    await Promise.resolve();
  });
};

const getCopyFeedback = (button: HTMLElement): HTMLElement => {
  const feedback = button.closest('.ai-summary__action')?.querySelector('.ai-summary__sr-only');
  expect(feedback).not.toBeNull();
  return feedback as HTMLElement;
};

const getSummaryEditor = async (label: string): Promise<HTMLTextAreaElement> =>
  waitFor(() => {
    const host = Array.from(document.querySelectorAll('mdc-textarea')).find(
      (element) => element.getAttribute('label') === label || element.getAttribute('data-aria-label') === label
    );
    const editor = host?.shadowRoot?.querySelector('textarea');
    expect(editor).toBeInstanceOf(HTMLTextAreaElement);
    return editor as HTMLTextAreaElement;
  });

const expectEditorFocus = async (editor: HTMLTextAreaElement) =>
  waitFor(() => expect((editor.getRootNode() as ShadowRoot).activeElement).toBe(editor));

const omittedStateIsRejected: React.ComponentProps<typeof AISummary> = {
  mode: 'mid-call-receiver',
  // @ts-expect-error Omission is container-owned and must be narrowed before AISummary is mounted.
  state: 'omitted',
};
const receiverChildrenAreRejected: React.ComponentProps<typeof AISummary> = {
  mode: 'mid-call-receiver',
  state: 'content',
  content: receiverContent,
  onCopy: () => true,
  onFeedback: async () => ({outcome: 'confirmed'}),
  // @ts-expect-error AISummary intentionally exposes no children surface.
  children: 'Receiver child',
};
const postCallActionTypeIsRejected: React.ComponentProps<typeof AISummary> = {
  mode: 'post-call',
  state: 'content',
  content: textContent,
  // @ts-expect-error Post-call summaries cannot carry a mid-call action type.
  actionType: 'TRANSFER',
  onEdit: jest.fn(),
  onCopy: jest.fn(),
  onFeedback: jest.fn(),
  onRetry: jest.fn(),
};

void omittedStateIsRejected;
void receiverChildrenAreRejected;
void postCallActionTypeIsRejected;

describe('AISummary', () => {
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
  beforeEach(() => {
    jest.useRealTimers();
    clipboardWrite(() => Promise.resolve());
  });

  it('exports a unique display order and places Outcome among the SDK sections', () => {
    expect(AI_ASSISTANT_SUMMARY_MESSAGES.postCall.completeAction).toBe(COMPLETE_WRAP_UP_LABEL);
    expect(AI_ASSISTANT_SUMMARY_SECTION_ORDER).toEqual(SECTION_DISPLAY_KEYS);
    expect([...new Set(AI_ASSISTANT_SUMMARY_SECTION_ORDER)]).toEqual(AI_ASSISTANT_SUMMARY_SECTION_ORDER);
    const projected = getDisplaySections(sectionContent);
    expect(projected.map((section) => section.key)).toEqual(['initialContactReason', 'resolution', 'nextSteps']);
    expect(projected.find((section) => section.key === 'resolution')).toMatchObject({
      value: 'Correction approved',
    });

    expect(getDisplaySections({...sectionContent, resolution: undefined}).map((section) => section.key)).toEqual([
      'initialContactReason',
      'nextSteps',
    ]);
    expect(getDisplaySections({...sectionContent, resolution: ''}).map((section) => section.key)).toEqual([
      'initialContactReason',
      'nextSteps',
    ]);
  });

  it.each(['mid-call-initiator', 'post-call'] as const)(
    'renders unavailable without actions when %s content is missing',
    (mode) => {
      const summaryProps = {
        state: 'content' as const,
        content: undefined,
        onEdit: jest.fn(),
        onCopy: jest.fn(),
        onFeedback: jest.fn(),
      };
      render(
        mode === 'post-call' ? (
          <AISummary {...summaryProps} mode={mode} onRetry={jest.fn()} />
        ) : (
          <AISummary {...summaryProps} mode={mode} />
        )
      );

      expect(screen.getByTestId('ai-summary:unavailable')).toHaveTextContent(LITERAL_SUMMARY_COPY.unavailable);
      expect(screen.queryByTestId('ai-summary:content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ai-summary:actions')).not.toBeInTheDocument();
      expect(screen.queryByText(AI_ASSISTANT_SUMMARY_MESSAGES.postCall.summaryHeading)).not.toBeInTheDocument();
    }
  );

  it('renders literal en-US labels and state copy without importing expected strings from the component constants', async () => {
    const {rerender} = render(
      <AISummary
        mode="post-call"
        state="generating"
        content={textContent}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    await waitFor(() =>
      expect(screen.getByText(LITERAL_SUMMARY_COPY.generatingTitle).shadowRoot?.querySelector('h3')).toBeInTheDocument()
    );
    expect(screen.getByText(LITERAL_SUMMARY_COPY.generatingDescription)).toBeInTheDocument();
    expect(screen.getByTestId('ai-summary:generating').querySelector('mdc-spinner')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(screen.getByText(LITERAL_SUMMARY_COPY.generatingTitle)).toHaveProperty('type', 'body-large-bold');

    rerender(
      <AISummary
        mode="post-call"
        state="unavailable"
        content={textContent}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    expect(screen.getByText(LITERAL_SUMMARY_COPY.unavailable)).toBeInTheDocument();

    rerender(
      <AISummary
        mode="post-call"
        state="generic-error"
        content={textContent}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    await waitFor(() =>
      expect(screen.getByText(LITERAL_SUMMARY_COPY.generationError).shadowRoot?.querySelector('h3')).toBeInTheDocument()
    );
    expect(screen.getByText(LITERAL_SUMMARY_COPY.generationErrorDescription)).toBeInTheDocument();
    expect(screen.getByText(LITERAL_SUMMARY_COPY.generationError)).toHaveProperty('type', 'body-midsize-bold');
    expect(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.retry})).toBeInTheDocument();

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    expect(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.like})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.dislike})).toBeInTheDocument();
    expect(screen.getByText(LITERAL_SUMMARY_COPY.attribution)).toBeInTheDocument();
  });

  it.each([
    ['post-call', 'content'],
    ['post-call', 'generating'],
    ['post-call', 'unavailable'],
    ['post-call', 'generic-error'],
    ['mid-call-initiator', 'content'],
    ['mid-call-initiator', 'generating'],
    ['mid-call-initiator', 'unavailable'],
    ['mid-call-initiator', 'generic-error'],
    ['mid-call-receiver', 'content'],
    ['mid-call-receiver', 'generating'],
    ['mid-call-receiver', 'unavailable'],
    ['mid-call-receiver', 'generic-error'],
  ] as const)('renders a discriminating %s %s state', async (mode, state) => {
    const sharedCallbacks = {
      onEdit: jest.fn(),
      onCopy: jest.fn(),
      onFeedback: jest.fn().mockResolvedValue({outcome: 'confirmed'}),
      onRetry: jest.fn().mockResolvedValue({outcome: 'blocked'}),
    };

    if (mode === 'mid-call-receiver' && state !== 'content') {
      render(<AISummary mode={mode} state={state} />);
    } else if (mode === 'mid-call-receiver') {
      render(
        <AISummary
          mode={mode}
          state={state}
          content={receiverContent}
          onCopy={jest.fn().mockReturnValue(true)}
          onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
        />
      );
    } else if (mode === 'mid-call-initiator') {
      render(
        <AISummary
          mode={mode}
          state={state}
          content={textContent}
          onEdit={sharedCallbacks.onEdit}
          onCopy={sharedCallbacks.onCopy}
          onFeedback={sharedCallbacks.onFeedback}
        />
      );
    } else {
      render(
        <AISummary
          mode={mode}
          state={state}
          content={textContent}
          onEdit={sharedCallbacks.onEdit}
          onCopy={sharedCallbacks.onCopy}
          onFeedback={jest.fn().mockReturnValue(true)}
          onRetry={sharedCallbacks.onRetry}
        />
      );
    }

    if (state === 'content') {
      expect(screen.getByTestId(`ai-summary:${mode}`)).toBeInTheDocument();
      expect(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary})).toBeInTheDocument();
      expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.like})).toBeInTheDocument();
      expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.dislike})).toBeInTheDocument();
    } else if (state === 'generating') {
      expect(screen.getByTestId('ai-summary:generating')).toHaveTextContent(LITERAL_SUMMARY_COPY.generatingTitle);
    } else if (state === 'unavailable') {
      expect(screen.getByTestId('ai-summary:unavailable')).toHaveTextContent(LITERAL_SUMMARY_COPY.unavailable);
    } else {
      expect(screen.getByTestId('ai-summary:error')).toHaveTextContent(LITERAL_SUMMARY_COPY.generationError);
      expect(screen.getByTestId('ai-summary:error')).toHaveTextContent(LITERAL_SUMMARY_COPY.generationErrorDescription);
      if (mode === 'post-call') {
        expect(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.retry})).toBeInTheDocument();
      } else {
        expect(screen.queryByRole('button', {name: LITERAL_SUMMARY_COPY.retry})).not.toBeInTheDocument();
      }
    }
  });

  it.each(['generating', 'unavailable', 'generic-error'] as const)(
    'renders %s without implicit live-region announcements',
    (state) => {
      const {container} = render(
        <AISummary
          mode="post-call"
          state={state}
          content={textContent}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn()}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        />
      );

      expect(container.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
    }
  );

  it('edits exact section keys and keeps cleared fields mounted after blur', async () => {
    const onEdit = jest.fn().mockReturnValue(true);
    const renderSummary = (editedSummary?: AISummaryResponse['summary']) => (
      <AISummary
        mode="post-call"
        state="content"
        content={sectionContent}
        editedSummary={editedSummary}
        onEdit={onEdit}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    const {rerender} = render(renderSummary());

    const surface = screen.getByTestId('ai-summary:editor-surface');
    expect(surface).toHaveTextContent(sectionContent.sections?.initialContactReason ?? '');
    expect(surface).toHaveTextContent(sectionContent.sections?.nextSteps ?? '');
    expect(surface).toContainElement(screen.getByTestId('ai-summary:actions'));
    expect(document.querySelector('mdc-textarea')).not.toBeInTheDocument();
    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.attribution)).toBeInTheDocument();
    expect(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).toHaveAttribute(
      'prefix-icon',
      'copy-regular'
    );
    expect(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like})).toHaveAttribute(
      'prefix-icon',
      'like-regular'
    );
    fireEvent.click(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.editSummary}));
    const editor = await getSummaryEditor(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason);
    const nextSteps = await getSummaryEditor(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.nextSteps);
    await expectEditorFocus(editor);
    expect(nextSteps).toHaveValue(sectionContent.sections?.nextSteps);
    expect(document.querySelector('mdc-textarea[label="Outcome"]')).not.toBeInTheDocument();

    fireEvent.input(editor, {target: {value: ''}, composed: true});
    expect(onEdit).toHaveBeenCalledWith('initialContactReason', '');
    rerender(renderSummary({initialContactReason: ''}));
    fireEvent.blur(editor, {composed: true});

    expect(await getSummaryEditor(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason)).toBe(editor);
    expect(editor).toHaveValue('');
    expect(await getSummaryEditor(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.nextSteps)).toBe(nextSteps);
    fireEvent.input(editor, {target: {value: 'Restored reason'}, composed: true});
    expect(onEdit).toHaveBeenLastCalledWith('initialContactReason', 'Restored reason');
    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.resolution)).toBeInTheDocument();
    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.editing)).toBeInTheDocument();
  });

  it('keeps structured previews read-only while controls are disabled', async () => {
    const onEdit = jest.fn();
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={sectionContent}
        controlsDisabled
        onEdit={onEdit}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn()}
      />
    );
    const edit = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.editSummary});
    expect(edit).toBeDisabled();
    fireEvent.click(edit);
    expect(document.querySelector('mdc-textarea')).not.toBeInTheDocument();
    expect(screen.getByText('Customer asked for invoice help.')).toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('applies automatic direction to mixed-direction structured summary text boundaries', () => {
    const bidiContent: AISummaryContent = {
      conversationId: 'interaction-main-1',
      sections: {
        initialContactReason: 'שלום ticket 42',
        keyActionsTaken: '• اتصل بالعميل\n- Send invoice INV-42',
        nextSteps: '• שלח טופס\n* Schedule follow-up',
      },
    };
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={bidiContent}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason)).toHaveAttribute(
      'dir',
      'auto'
    );
    expect(screen.getByText('שלום ticket 42')).toHaveAttribute('dir', 'auto');
    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.keyActionsTaken)).toHaveAttribute(
      'dir',
      'auto'
    );
    const [actionList, nextStepsList] = screen.getAllByRole('list');
    expect(actionList).toHaveAttribute('dir', 'auto');
    within(actionList)
      .getAllByRole('listitem')
      .forEach((item) => expect(item).toHaveAttribute('dir', 'auto'));
    expect(within(actionList).getByText('اتصل بالعميل')).toBeInTheDocument();
    expect(within(actionList).getByText('Send invoice INV-42')).toBeInTheDocument();
    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.nextSteps)).toHaveAttribute('dir', 'auto');
    expect(nextStepsList).toHaveAttribute('dir', 'auto');
    expect(within(nextStepsList).getByText('שלח טופס')).toBeInTheDocument();
    expect(within(nextStepsList).getByText('Schedule follow-up')).toBeInTheDocument();
  });

  it('projects every post-call display section in canonical order and appends Outcome when needed', () => {
    const completeContent: AISummaryContent = {
      conversationId: 'interaction-main-1',
      sections: {
        initialContactReason: 'Summary value',
        additionalContactReasons: 'Billing help',
        additionalContext: 'Positive',
        keyActionsTaken: 'Send invoice',
        nextSteps: 'Escalate adjustment',
      },
      resolution: 'Resolved after adjustment',
    };
    const projected = getDisplaySections(completeContent);

    expect(projected.map((section) => section.key)).toEqual([
      'initialContactReason',
      'additionalContactReasons',
      'additionalContext',
      'keyActionsTaken',
      'resolution',
      'nextSteps',
    ]);
    expect(projected.map((section) => section.value)).toContain('Resolved after adjustment');
    expect(getDisplaySections({...completeContent, resolution: undefined})).not.toContainEqual(
      expect.objectContaining({key: 'resolution'})
    );
    expect(
      getDisplaySections({
        conversationId: 'interaction-main-1',
        sections: {
          initialContactReason: 'Only summary',
          keyActionsTaken: 'Already before resolution',
        },
        resolution: 'Appended resolution',
      }).map((section) => section.key)
    ).toEqual(['initialContactReason', 'keyActionsTaken', 'resolution']);
    expect(
      getDisplaySections({
        conversationId: 'interaction-main-1',
        sections: {nextSteps: 'Last ordered section'},
        resolution: 'Inserted resolution',
      }).map((section) => section.key)
    ).toEqual(['resolution', 'nextSteps']);
  });

  it('renders injected labels and values as text without live-region announcements', () => {
    const maliciousContent: AISummaryContent = {
      conversationId: 'interaction-main-1',
      sections: {
        initialContactReason: '<script>alert("summary")</script>',
        nextSteps: '<b onclick=alert(2)>Follow up</b>',
      },
    };
    const {container} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={maliciousContent}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    expect(screen.queryByText('<img src=x onerror=alert(1)>:')).not.toBeInTheDocument();
    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason)).toBeInTheDocument();
    expect(screen.getByText('<script>alert("summary")</script>')).toBeInTheDocument();
    expect(screen.getByText('<b onclick=alert(2)>Follow up</b>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
  });

  it.each(['mid-call-initiator', 'post-call'] as const)(
    'opens a fresh plain summary editor only through Edit summary in %s',
    async (mode) => {
      const onEdit = jest.fn();
      render(<AISummary mode={mode} state="content" content={textContent} onEdit={onEdit} />);

      expect(screen.getByText(textContent.summaryText ?? '')).toBeInTheDocument();
      expect(document.querySelector('mdc-textarea')).not.toBeInTheDocument();
      fireEvent.click(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.editSummary}));

      const editor = await getSummaryEditor(AI_ASSISTANT_SUMMARY_MESSAGES.plainSummary);
      expect(editor).toHaveValue(textContent.summaryText);
      await expectEditorFocus(editor);
      fireEvent.input(editor, {target: {value: 'Updated summary'}, composed: true});
      expect(onEdit).toHaveBeenCalledWith('summaryText', 'Updated summary');
    }
  );

  it.each(['mid-call-initiator', 'post-call'] as const)(
    'renders and copies controlled plain edits in %s without replacing the SDK payload',
    async (mode) => {
      const content = Object.freeze({...textContent});
      const onCopy = jest.fn().mockReturnValue(true);
      const ControlledSummary = () => {
        const [editedSummary, setEditedSummary] = React.useState('Agent correction');
        const editableProps = {
          state: 'content' as const,
          content,
          editedSummary,
          onEdit: (key: 'summaryText' | keyof NonNullable<AISummaryContent['sections']>, value: string) => {
            expect(key).toBe('summaryText');
            setEditedSummary(value);
            return true;
          },
          onCopy,
          onFeedback: jest.fn(),
        };
        return mode === 'post-call' ? (
          <AISummary {...editableProps} mode="post-call" onRetry={jest.fn()} />
        ) : (
          <AISummary {...editableProps} mode="mid-call-initiator" />
        );
      };
      render(<ControlledSummary />);

      const editor = await getSummaryEditor(AI_ASSISTANT_SUMMARY_MESSAGES.plainSummary);
      expect(editor).toHaveValue('Agent correction');
      fireEvent.input(editor, {target: {value: 'Final agent correction'}, composed: true});
      await waitFor(() => expect(editor).toHaveValue('Final agent correction'));
      fireEvent.click(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}));

      await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Final agent correction');
      expect(content).toEqual(textContent);
    }
  );

  it('merges controlled section edits over the SDK sections and keeps SDK Outcome read-only', async () => {
    const content = Object.freeze({...sectionContent, sections: Object.freeze({...sectionContent.sections})});
    const onCopy = jest.fn().mockReturnValue(true);
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={content}
        editedSummary={{initialContactReason: 'Agent corrected the contact reason.'}}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn()}
      />
    );

    expect(await getSummaryEditor(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason)).toHaveValue(
      'Agent corrected the contact reason.'
    );
    expect(await getSummaryEditor(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.nextSteps)).toHaveValue(
      sectionContent.sections?.nextSteps
    );
    expect(screen.getByText(sectionContent.resolution ?? '')).toBeInTheDocument();
    expect(document.querySelector('mdc-textarea[label="Outcome"]')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}));

    await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason}: Agent corrected the contact reason.\n\n` +
        `${AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.resolution}: ${sectionContent.resolution}\n\n` +
        `${AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.nextSteps}: ${sectionContent.sections?.nextSteps}`
    );
    expect(content).toEqual(sectionContent);
  });

  it.each([
    ['plain', textContent, 'First agent correction', 'Second agent correction'],
    [
      'structured',
      sectionContent,
      {initialContactReason: 'First agent correction'},
      {initialContactReason: 'Second agent correction'},
    ],
  ] as const)(
    'ignores a pending clipboard completion after %s edits change on the same SDK payload',
    async (_kind, content, initialEdit, nextEdit) => {
      let finishCopy: () => void = () => undefined;
      clipboardWrite(
        () =>
          new Promise<void>((resolve) => {
            finishCopy = resolve;
          })
      );
      const onCopy = jest.fn().mockReturnValue(true);
      const renderSummary = (editedSummary: AISummaryResponse['summary']) => (
        <AISummary
          mode="post-call"
          state="content"
          content={content}
          editedSummary={editedSummary}
          onEdit={jest.fn()}
          onCopy={onCopy}
          onFeedback={jest.fn()}
          onRetry={jest.fn()}
        />
      );
      const {rerender} = render(renderSummary(initialEdit));
      fireEvent.click(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}));

      rerender(renderSummary(nextEdit));
      await act(async () => finishCopy());

      expect(onCopy).not.toHaveBeenCalled();
      expect(getCopyFeedback(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}))).toHaveTextContent(
        LITERAL_SUMMARY_COPY.copySummary
      );
    }
  );

  it('retains copied feedback for equivalent edit values and clears it when the displayed edit changes', async () => {
    const onCopy = jest.fn().mockReturnValue(true);
    const renderSummary = (value: string, selectedFeedback: 'none' | 'thumbs_up' = 'none') => (
      <AISummary
        mode="post-call"
        state="content"
        content={sectionContent}
        editedSummary={{initialContactReason: value}}
        selectedFeedback={selectedFeedback}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn()}
      />
    );
    const {rerender} = render(renderSummary('Agent correction'));
    fireEvent.click(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}));
    const copy = await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary});
    await waitFor(() => expect(getCopyFeedback(copy)).toHaveTextContent(LITERAL_SUMMARY_COPY.copied));

    rerender(renderSummary('Agent correction', 'thumbs_up'));
    expect(getCopyFeedback(copy)).toHaveTextContent(LITERAL_SUMMARY_COPY.copied);
    expect(onCopy).toHaveBeenCalledTimes(1);

    rerender(renderSummary('', 'thumbs_up'));
    expect(getCopyFeedback(copy)).toHaveTextContent(LITERAL_SUMMARY_COPY.copySummary);
    expect(screen.queryByText('Agent correction')).not.toBeInTheDocument();
    expect(screen.queryByText(sectionContent.sections?.initialContactReason ?? '')).not.toBeInTheDocument();
  });

  it('observes clipboard fulfillment before recording copy and reverts confirmed state at 1500 ms', async () => {
    jest.useFakeTimers();
    const onCopy = jest.fn().mockReturnValue(true);
    clipboardWrite(() => Promise.resolve());

    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(onCopy).not.toHaveBeenCalled();
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith());
    fireEvent.mouseEnter(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    fireEvent.mouseLeave(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(
      getCopyFeedback(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}))
    ).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.copiedSummary);

    act(() => {
      jest.advanceTimersByTime(COPIED_FEEDBACK_MS - 1);
    });
    expect(
      getCopyFeedback(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}))
    ).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.copiedSummary);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(
      getCopyFeedback(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}))
    ).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.copySummary);
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
  });

  it('resets confirmed copy on blur and clears the accepted timer', async () => {
    jest.useFakeTimers();
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        onEdit={jest.fn()}
        onCopy={jest.fn().mockReturnValue(true)}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    const copy = await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary});
    fireEvent.click(copy);
    await waitFor(() => expect(getCopyFeedback(copy)).toHaveTextContent(LITERAL_SUMMARY_COPY.copied));
    expect(jest.getTimerCount()).toBe(1);

    fireEvent.blur(copy, {relatedTarget: null});

    expect(getCopyFeedback(copy)).toHaveTextContent(LITERAL_SUMMARY_COPY.copySummary);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps a rejected copy recording from painting success', async () => {
    const falseRecorder = jest.fn().mockReturnValue(false);
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        onEdit={jest.fn()}
        onCopy={falseRecorder}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}));
    await waitFor(() => expect(falseRecorder).toHaveBeenCalledWith());
    expect(getCopyFeedback(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}))).toHaveTextContent(
      LITERAL_SUMMARY_COPY.copySummary
    );
  });

  it('contains synchronous clipboard getter and writer failures without state changes', async () => {
    const onCopy = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get: () => {
        throw new Error('clipboard getter failed');
      },
    });
    const {rerender} = render(
      <AISummary
        mode="mid-call-receiver"
        state="content"
        content={receiverContent}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );
    await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary});
    expect(() => fireEvent.click(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}))).not.toThrow();
    expect(onCopy).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn(() => {
          throw new Error('clipboard write failed');
        }),
      },
    });
    rerender(
      <AISummary
        mode="mid-call-receiver"
        state="content"
        content={receiverContent}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );
    await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary});
    expect(() => fireEvent.click(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}))).not.toThrow();
    expect(onCopy).not.toHaveBeenCalled();
    expect(getCopyFeedback(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}))).toHaveTextContent(
      LITERAL_SUMMARY_COPY.copySummary
    );
  });

  it('copies structured sections as exact label/value blocks with and without Outcome', async () => {
    const onCopy = jest.fn().mockReturnValue(true);
    const {rerender} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={sectionContent}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
        'Initial contact reason: Customer asked for invoice help.\n\nOutcome: Correction approved\n\nNext Steps: Send the updated invoice.'
      )
    );
    expect(onCopy).toHaveBeenCalledWith();

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={{...sectionContent, resolution: undefined}}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
        'Initial contact reason: Customer asked for invoice help.\n\nNext Steps: Send the updated invoice.'
      )
    );
    expect(onCopy).toHaveBeenCalledWith();
  });

  it('blocks empty plain, structured and receiver copy output before Clipboard access', async () => {
    const onCopy = jest.fn().mockReturnValue(true);
    const {rerender, unmount} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={{conversationId: 'interaction-main-1', summaryText: ' \n\t '}}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();
    expect(
      getCopyFeedback(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}))
    ).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.copySummary);

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={{
          conversationId: 'interaction-main-1',
          sections: {initialContactReason: ' '},
          resolution: '',
        }}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    fireEvent.click(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();

    unmount();
    render(
      <AISummary
        mode="mid-call-receiver"
        state="content"
        content={{
          ...receiverContent,
          adaptiveCard: {type: 'AdaptiveCard', version: '1.3', body: [{type: 'TextBlock', text: ' '}]},
        }}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );

    fireEvent.click(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();
  });

  it('resets confirmation on content replacement', async () => {
    jest.useFakeTimers();
    const onCopy = jest.fn().mockReturnValue(true);
    const {rerender} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() =>
      expect(
        getCopyFeedback(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}))
      ).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.copiedSummary)
    );

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={{conversationId: 'interaction-main-1', summaryText: 'Replacement summary'}}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    expect(
      getCopyFeedback(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}))
    ).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.copySummary);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('ignores a clipboard completion after the displayed SDK summary has been replaced', async () => {
    let finishCopy: () => void = () => undefined;
    clipboardWrite(
      () =>
        new Promise<void>((resolve) => {
          finishCopy = resolve;
        })
    );
    const onCopy = jest.fn().mockReturnValue(true);
    const renderSummary = (content: AISummaryContent) => (
      <AISummary
        mode="post-call"
        state="content"
        content={content}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn()}
      />
    );
    const {rerender} = render(renderSummary(textContent));
    fireEvent.click(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(textContent.summaryText);

    rerender(renderSummary({...textContent, summaryText: 'Replacement SDK summary'}));
    await act(async () => finishCopy());

    expect(onCopy).not.toHaveBeenCalled();
    expect(getCopyFeedback(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}))).toHaveTextContent(
      LITERAL_SUMMARY_COPY.copySummary
    );
  });

  it('swallows clipboard rejection without recorder calls or success paint', async () => {
    const onCopy = jest.fn().mockReturnValue(true);
    clipboardWrite(() => Promise.reject(new Error('denied')));
    render(
      <AISummary
        mode="mid-call-initiator"
        state="content"
        content={textContent}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );

    fireEvent.click(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    await flushUnhandledRejectionQueues();
    expect(onCopy).not.toHaveBeenCalled();
    expect(
      getCopyFeedback(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}))
    ).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.copySummary);
  });

  it('shows the selected post-call feedback through native button state', async () => {
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        selectedFeedback="thumbs_up"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    const like = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like});
    const dislike = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.dislike});
    await waitFor(() => {
      expect(like).toHaveAttribute('aria-pressed', 'true');
      expect(like.shadowRoot?.querySelector('mdc-icon')).toHaveAttribute('name', 'like-filled');
      expect(dislike).toHaveAttribute('aria-pressed', 'false');
      expect(dislike.shadowRoot?.querySelector('mdc-icon')).toHaveAttribute('name', 'dislike-regular');
    });
  });

  it('reports feedback clicks and paints only the selection provided by its container', async () => {
    const onFeedback = jest.fn().mockReturnValue(true);
    const renderSummary = (selectedFeedback?: 'thumbs_up' | 'thumbs_down' | 'none') => (
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        selectedFeedback={selectedFeedback}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={onFeedback}
        onRetry={jest.fn()}
      />
    );
    const {rerender} = render(renderSummary());
    const like = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like});
    const dislike = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.dislike});
    fireEvent.click(like);
    fireEvent.click(dislike);
    expect(onFeedback.mock.calls).toEqual([['thumbs_up'], ['thumbs_down']]);
    expect(like).toHaveAttribute('aria-pressed', 'false');

    rerender(renderSummary('thumbs_down'));
    await waitFor(() => {
      expect(like).toHaveAttribute('aria-pressed', 'false');
      expect(dislike).toHaveAttribute('aria-pressed', 'true');
      expect(like.shadowRoot?.querySelector('mdc-icon')).toHaveAttribute('name', 'like-regular');
      expect(dislike.shadowRoot?.querySelector('mdc-icon')).toHaveAttribute('name', 'dislike-filled');
    });
    fireEvent.click(dislike);
    expect(onFeedback).toHaveBeenLastCalledWith('none');
    expect(dislike).toHaveAttribute('aria-pressed', 'true');

    rerender(renderSummary('none'));
    await waitFor(() => {
      expect(like).toHaveAttribute('aria-pressed', 'false');
      expect(dislike).toHaveAttribute('aria-pressed', 'false');
      expect(dislike.shadowRoot?.querySelector('mdc-icon')).toHaveAttribute('name', 'dislike-regular');
    });
  });

  it('uses native Momentum tooltips with accessible action labels', async () => {
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        selectedFeedback="thumbs_up"
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
      />
    );

    const like = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like});
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).not.toHaveAttribute('title');
    expect(like).toHaveAccessibleName(AI_ASSISTANT_SUMMARY_MESSAGES.like);
    const feedbackTooltip = screen
      .getAllByRole('tooltip', {hidden: true})
      .find((tooltip) => tooltip.getAttribute('triggerid') === like.id)!;
    expect(feedbackTooltip.tagName).toBe('MDC-TOOLTIP');
    expect(feedbackTooltip).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.like);
    await waitFor(() => expect(feedbackTooltip).toHaveAttribute('trigger', 'mouseenter focusin'));
    expect(feedbackTooltip).toHaveAttribute('tooltip-type', 'none');

    fireEvent.mouseEnter(like);
    await waitFor(() => expect(feedbackTooltip).toHaveAttribute('visible'));
    fireEvent.mouseLeave(like);
    await waitFor(() => expect(feedbackTooltip).not.toHaveAttribute('visible'));

    const copy = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary});
    const copyTooltip = screen
      .getAllByRole('tooltip', {hidden: true})
      .find((tooltip) => tooltip.getAttribute('triggerid') === copy.id)!;
    expect(copyTooltip).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.copySummary);
    fireEvent.mouseEnter(copy);
    await waitFor(() => expect(copyTooltip).toHaveAttribute('visible'));
    fireEvent.mouseLeave(copy);
    await waitFor(() => expect(copyTooltip).not.toHaveAttribute('visible'));
  });

  it('keeps tooltip triggers unique and stable across summary instances', async () => {
    const renderSummaries = (content: AISummaryContent) => (
      <>
        <AISummary mode="post-call" state="content" content={content} onFeedback={jest.fn()} />
        <AISummary mode="post-call" state="content" content={textContent} onFeedback={jest.fn()} />
      </>
    );
    const {rerender} = render(renderSummaries(textContent));
    await screen.findAllByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like});
    const buttons = screen.getAllByRole('button');
    const ids = buttons.map((button) => button.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    const tooltipTriggers = screen
      .getAllByRole('tooltip', {hidden: true})
      .map((tooltip) => tooltip.getAttribute('triggerid'));
    expect(tooltipTriggers).toEqual(ids);

    rerender(renderSummaries({...textContent, summaryText: 'Updated summary'}));

    expect(screen.getAllByRole('button').map((button) => button.id)).toEqual(ids);
  });

  it('lets Momentum dismiss the tooltip with Escape without changing focus', async () => {
    render(
      <div>
        <button type="button">External control</button>
        <AISummary mode="post-call" state="content" content={textContent} onFeedback={jest.fn()} />
      </div>
    );
    const external = screen.getByRole('button', {name: 'External control'});
    act(() => external.focus());
    const like = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like});
    const tooltip = screen
      .getAllByRole('tooltip', {hidden: true})
      .find((element) => element.getAttribute('triggerid') === like.id)!;
    await waitFor(() => expect(tooltip).toHaveAttribute('trigger', 'mouseenter focusin'));
    fireEvent.mouseEnter(like);
    await waitFor(() => expect(tooltip).toHaveAttribute('visible'));
    fireEvent.keyDown(external, {key: 'Escape'});
    await waitFor(() => expect(tooltip).not.toHaveAttribute('visible'));
    expect(external).toHaveFocus();
  });

  it('routes Retry only from the generic-error surface and never renders it with retained content', async () => {
    const onRetry = jest.fn().mockResolvedValue({outcome: 'blocked'});
    const {rerender} = render(
      <AISummary
        mode="post-call"
        state="generic-error"
        content={textContent}
        selectedFeedback="none"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(false)}
        onRetry={onRetry}
      />
    );

    fireEvent.click(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.retry}));
    await flushSettledCallbacks();
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        selectedFeedback="none"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(false)}
        onRetry={onRetry}
      />
    );

    expect(screen.queryByRole('button', {name: LITERAL_SUMMARY_COPY.retry})).not.toBeInTheDocument();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('disables the shared Retry button while a request is pending', async () => {
    const onRetry = jest.fn().mockResolvedValue({outcome: 'blocked'});
    render(
      <AISummary
        mode="post-call"
        state="generic-error"
        controlsDisabled
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={onRetry}
      />
    );

    const retry = await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.retry});
    expect(retry.tagName).toBe('MDC-BUTTON');
    expect(retry).toBeDisabled();
    fireEvent.click(retry);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('renders one timestamp and compact feedback then copy inside the receiver card footer', async () => {
    const sdkContent = {
      ...receiverContent,
      timestamp: new Date(2026, 9, 26, 14, 7).getTime(),
      adaptiveCard: {
        type: 'AdaptiveCard',
        version: '1.3',
        body: [
          {type: 'TextBlock', text: 'סיכום Receiver details'},
          {
            type: 'RichTextBlock',
            id: 'source-timestamp-richTextBlock',
            inlines: [{type: 'TextRun', text: '${sourceTimestamp}'}],
          },
        ],
      },
    };
    const original = JSON.stringify(sdkContent);
    const callbacks = {onCopy: jest.fn(() => true), onFeedback: jest.fn()};
    const {rerender} = render(
      <AISummary mode="mid-call-receiver" state="content" content={sdkContent} {...callbacks} />
    );
    const footer = await screen.findByTestId('ai-summary:receiver-footer');
    const card = screen.getByTestId('ai-assistant:adaptive-card');
    expect(card).toContainElement(footer);
    expect(screen.queryByTestId('ai-summary:editor-surface')).not.toBeInTheDocument();
    expect(screen.getAllByText('14:07')).toHaveLength(1);
    expect(footer).toHaveAttribute('dir', 'ltr');
    const buttons = within(footer).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      LITERAL_SUMMARY_COPY.like,
      LITERAL_SUMMARY_COPY.dislike,
      LITERAL_SUMMARY_COPY.copySummary,
    ]);
    buttons.forEach((button) => expect(button).toHaveAttribute('size', '24'));

    rerender(
      <AISummary mode="mid-call-receiver" state="content" content={sdkContent} controlsDisabled {...callbacks} />
    );
    await waitFor(() => buttons.forEach((button) => expect(button).toBeDisabled()));
    buttons.forEach((button) => expect(button.isConnected).toBe(true));
    expect(JSON.stringify(sdkContent)).toBe(original);
  });

  it('renders a display-only receiver card and copies its visible text instead of the SDK text', async () => {
    const onCopy = jest.fn().mockReturnValue(true);
    render(
      <AISummary
        mode="mid-call-receiver"
        state="content"
        content={{
          ...receiverContent,
          summaryText: 'SDK text that is not displayed',
          adaptiveCard: {
            type: 'AdaptiveCard',
            version: '1.3',
            body: [
              {type: 'TextBlock', text: 'Visible card text'},
              {type: 'TextBlock', text: 'Hidden card text', isVisible: false},
              {
                type: 'RichTextBlock',
                id: 'source-subtitle-richTextBlock',
                inlines: [{type: 'TextRun', text: 'Source metadata'}],
              },
              {type: 'Input.Text', id: 'editor', value: 'Card-provided editor'},
            ],
            actions: [{type: 'Action.Submit', id: 'copyButton', title: 'Card-provided Copy'}],
          },
        }}
        onCopy={onCopy}
        onFeedback={jest.fn()}
      />
    );

    expect(await screen.findByText('Visible card text')).toBeInTheDocument();
    expect(screen.queryByText('SDK text that is not displayed')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Card-provided Copy'})).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    const copyButton = await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary});
    expect(screen.getByTestId('ai-assistant:adaptive-card')).toContainElement(copyButton);
    fireEvent.click(copyButton);
    await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Visible card text');
    expect(document.querySelector('mdc-textarea')).not.toBeInTheDocument();
  });

  it.each(['generating', 'unavailable', 'generic-error'] as const)('omits receiver actions for %s state', (state) => {
    render(<AISummary mode="mid-call-receiver" state={state} />);

    expect(screen.queryByTestId('ai-summary:actions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.dislike})).not.toBeInTheDocument();
  });

  it('retains focus on the active summary control across ordinary content updates', async () => {
    const {rerender} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    const like = await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.like});
    act(() => {
      like.focus();
    });
    expect(like).toHaveFocus();

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={{conversationId: 'interaction-main-1', summaryText: 'Updated while focus remains on Like.'}}
        selectedFeedback="thumbs_up"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.like})).toHaveFocus();
  });

  it('keeps external focus after a normal blur out of the summary', async () => {
    render(
      <div>
        <AISummary
          mode="post-call"
          state="content"
          content={sectionContent}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(true)}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        />
        <button type="button">External destination</button>
      </div>
    );

    fireEvent.click(await screen.findByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.editSummary}));
    const editor = await getSummaryEditor(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason);
    const external = screen.getByRole('button', {name: 'External destination'});
    act(() => {
      editor.focus();
    });

    fireEvent.blur(editor, {relatedTarget: external, composed: true});
    act(() => {
      external.focus();
    });

    await waitFor(() => expect(external).toHaveFocus());
  });
});
