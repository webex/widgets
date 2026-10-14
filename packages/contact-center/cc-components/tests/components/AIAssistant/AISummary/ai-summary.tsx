import React from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import type {AISummaryEntry} from '@webex/cc-store';
import AISummaryComponent, {
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

const COMPLETE_WRAP_UP_LABEL = 'Complete Wrap-Up';
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
  pendingSubmission: 'Pending submission',
  completeWrapUp: 'Complete Wrap-Up',
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

const getActionWrapper = (button: HTMLElement): HTMLElement => {
  const wrapper = button.closest('.ai-summary__action');
  expect(wrapper).not.toBeNull();
  return wrapper as HTMLElement;
};

type WithOptionalFocusTarget<Props> = Props extends {
  containingPanelFocusTarget: React.RefObject<HTMLElement | null>;
}
  ? Omit<Props, 'containingPanelFocusTarget'> & {
      containingPanelFocusTarget?: React.RefObject<HTMLElement | null>;
    }
  : never;

type AISummaryTestProps = WithOptionalFocusTarget<React.ComponentProps<typeof AISummaryComponent>>;

const AISummary: React.FC<AISummaryTestProps> = ({containingPanelFocusTarget, ...props}) => {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const fallbackRef = containingPanelFocusTarget ?? panelRef;

  return (
    <>
      {containingPanelFocusTarget ? null : <div data-testid="ai-summary:test-panel" ref={panelRef} tabIndex={-1} />}
      <AISummaryComponent {...props} containingPanelFocusTarget={fallbackRef} />
    </>
  );
};

const typeOnlyPanelRef: React.RefObject<HTMLElement | null> = {current: null};
const omittedStateIsRejected: React.ComponentProps<typeof AISummaryComponent> = {
  mode: 'mid-call-receiver',
  // @ts-expect-error Omission is container-owned and must be narrowed before AISummary is mounted.
  state: 'omitted',
  containingPanelFocusTarget: typeOnlyPanelRef,
};
// @ts-expect-error Receiver content is rendered by the AI Assistant card branch, not the shared action surface.
const receiverContentIsRejected: React.ComponentProps<typeof AISummaryComponent> = {
  mode: 'mid-call-receiver',
  state: 'content',
  contentRevision: 1,
  content: textContent,
  getReceiverCopyText: () => 'Receiver text',
  onCopy: () => true,
  onFeedback: async () => ({outcome: 'confirmed'}),
  containingPanelFocusTarget: typeOnlyPanelRef,
};
// @ts-expect-error Receiver card content must not be accepted by the shared presentation component props.
const receiverCardContentIsRejected: React.ComponentProps<typeof AISummaryComponent> = {
  mode: 'mid-call-receiver',
  state: 'content',
  contentRevision: 1,
  content: {conversationId: 'interaction-main-1', adaptiveCard: {type: 'AdaptiveCard'}},
  getReceiverCopyText: () => 'Receiver text',
  onCopy: () => true,
  onFeedback: async () => ({outcome: 'confirmed'}),
  containingPanelFocusTarget: typeOnlyPanelRef,
};
const receiverChildrenAreRejected: React.ComponentProps<typeof AISummaryComponent> = {
  mode: 'mid-call-receiver',
  state: 'content',
  contentRevision: 1,
  getReceiverCopyText: () => 'Receiver text',
  onCopy: () => true,
  onFeedback: async () => ({outcome: 'confirmed'}),
  containingPanelFocusTarget: typeOnlyPanelRef,
  // @ts-expect-error AISummary intentionally exposes no children surface.
  children: 'Receiver child',
};
const postCallActionTypeIsRejected: React.ComponentProps<typeof AISummaryComponent> = {
  mode: 'post-call',
  state: 'content',
  content: textContent,
  contentRevision: 1,
  // @ts-expect-error Post-call summaries cannot carry a mid-call action type.
  actionType: 'TRANSFER',
  onEdit: jest.fn(),
  onCopy: jest.fn(),
  onFeedback: jest.fn(),
  onRetry: jest.fn(),
  containingPanelFocusTarget: typeOnlyPanelRef,
};
const initiatorReceiverCopyIsRejected: React.ComponentProps<typeof AISummaryComponent> = {
  mode: 'mid-call-initiator',
  state: 'content',
  content: textContent,
  contentRevision: 1,
  onEdit: jest.fn(),
  onCopy: jest.fn(),
  onFeedback: jest.fn(),
  containingPanelFocusTarget: typeOnlyPanelRef,
  // @ts-expect-error Receiver-only copy extraction is not an initiator prop.
  getReceiverCopyText: () => 'Receiver text',
};

void omittedStateIsRejected;
void receiverContentIsRejected;
void receiverCardContentIsRejected;
void receiverChildrenAreRejected;
void postCallActionTypeIsRejected;
void initiatorReceiverCopyIsRejected;

describe('AISummary', () => {
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

  it('renders exact generating and error copy without underscore or percent artifacts', () => {
    render(
      <AISummary
        mode="post-call"
        state="generating"
        contentRevision={1}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    const spinner = screen.getByTestId('ai-summary:generating').querySelector('mdc-spinner');
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.generatingDescription)).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: AI_ASSISTANT_SUMMARY_MESSAGES.generatingTitle})).toHaveClass(
      'ai-summary__status-title--generating'
    );
    expect(AI_ASSISTANT_SUMMARY_MESSAGES.generatingDescription).toContain('—');
    expect(AI_ASSISTANT_SUMMARY_MESSAGES.generatingDescription).not.toContain('_');
    expect(document.body).not.toHaveTextContent(/%[^%]+%/);

    render(
      <AISummary
        mode="post-call"
        state="generic-error"
        contentRevision={1}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.generationError)).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: AI_ASSISTANT_SUMMARY_MESSAGES.generationError})).toHaveClass(
      'ai-summary__status-title--error'
    );
    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.generationErrorDescription)).toBeInTheDocument();
  });

  it('renders literal en-US labels and state copy without importing expected strings from the component constants', async () => {
    const {rerender} = render(
      <AISummary
        mode="post-call"
        state="generating"
        content={textContent}
        contentRevision={1}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    expect(screen.getByRole('heading', {name: LITERAL_SUMMARY_COPY.generatingTitle})).toBeInTheDocument();
    expect(screen.getByText(LITERAL_SUMMARY_COPY.generatingDescription)).toBeInTheDocument();

    rerender(
      <AISummary
        mode="post-call"
        state="unavailable"
        content={textContent}
        contentRevision={1}
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
        contentRevision={1}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    expect(screen.getByRole('heading', {name: LITERAL_SUMMARY_COPY.generationError})).toBeInTheDocument();
    expect(screen.getByText(LITERAL_SUMMARY_COPY.generationErrorDescription)).toBeInTheDocument();
    expect(await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.retry})).toBeInTheDocument();

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={1}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.like})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.dislike})).toBeInTheDocument();
    expect(screen.getByText(LITERAL_SUMMARY_COPY.attribution)).toBeInTheDocument();
  });

  it('renders visible output for every public presentation state', () => {
    const {rerender} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={2}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    expect(screen.getByTestId('ai-summary:content')).toBeInTheDocument();

    rerender(
      <AISummary
        mode="post-call"
        state="generating"
        content={textContent}
        contentRevision={2}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    expect(screen.getByTestId('ai-summary:generating')).toBeInTheDocument();

    rerender(
      <AISummary
        mode="post-call"
        state="unavailable"
        content={textContent}
        contentRevision={2}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.unavailable)).toBeInTheDocument();

    rerender(
      <AISummary
        mode="post-call"
        state="generic-error"
        content={textContent}
        contentRevision={2}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    expect(screen.getByTestId('ai-summary:error')).toBeInTheDocument();
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
          contentRevision={41}
          getReceiverCopyText={() => 'Visible receiver copy'}
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
          contentRevision={41}
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
          contentRevision={41}
          onEdit={sharedCallbacks.onEdit}
          onCopy={sharedCallbacks.onCopy}
          onFeedback={jest.fn().mockReturnValue(true)}
          onRetry={sharedCallbacks.onRetry}
        />
      );
    }

    if (state === 'content') {
      expect(screen.getByTestId(`ai-summary:${mode}`)).toBeInTheDocument();
      expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary})).toBeInTheDocument();
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
          contentRevision={56}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn()}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        />
      );

      expect(container.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
    }
  );

  it('edits exact section keys and keeps cleared keys present', () => {
    const onEdit = jest.fn().mockReturnValue(true);
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={sectionContent}
        contentRevision={7}
        onEdit={onEdit}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    const surface = screen.getByTestId('ai-summary:editor-surface');
    expect(surface).toContainElement(
      screen.getByRole('button', {
        name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    );
    expect(surface).toContainElement(
      screen.getByRole('button', {
        name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.nextSteps),
      })
    );
    expect(surface).toContainElement(screen.getByTestId('ai-summary:actions'));
    expect(screen.queryByRole('textbox', {name: AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.resolution})).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}).querySelector('mdc-icon')
    ).toHaveProperty('name', 'copy-regular');
    expect(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like}).querySelector('mdc-icon')).toHaveProperty(
      'name',
      'like-regular'
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    );
    expect(screen.getByRole('textbox', {name: AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason})).toHaveFocus();
    fireEvent.change(screen.getByDisplayValue('Customer asked for invoice help.'), {target: {value: ''}});
    expect(onEdit).toHaveBeenCalledWith('initialContactReason', '', 7);
    fireEvent.blur(screen.getByRole('textbox', {name: AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason}));
    expect(
      screen.getByRole('button', {
        name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    ).toBeInTheDocument();
    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.resolution)).toBeInTheDocument();
    expect(screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.attribution)).toBeInTheDocument();
  });

  it('keeps structured previews compact, text-only and read-only while controls are disabled', () => {
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={sectionContent}
        contentRevision={7}
        controlsDisabled
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn()}
      />
    );
    expect(
      screen.getByRole('button', {
        name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    ).toBeDisabled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Customer asked for invoice help.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.resolution),
      })
    ).not.toBeInTheDocument();
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
        contentRevision={13}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    const summaryPreview = screen.getByRole('button', {
      name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
    });
    expect(
      within(summaryPreview).getByText(`${AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason}:`)
    ).toHaveAttribute('dir', 'auto');
    expect(within(summaryPreview).getByText('שלום ticket 42')).toHaveAttribute('dir', 'auto');

    const actionPreview = screen.getByRole('button', {
      name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.keyActionsTaken),
    });
    expect(within(actionPreview).getByText(`${AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.keyActionsTaken}:`)).toHaveAttribute(
      'dir',
      'auto'
    );
    const inlineList = within(actionPreview).getByRole('list');
    expect(inlineList).toHaveAttribute('dir', 'auto');
    within(inlineList)
      .getAllByRole('listitem')
      .forEach((item) => expect(item).toHaveAttribute('dir', 'auto'));
    expect(within(inlineList).getByText('اتصل بالعميل')).toBeInTheDocument();
    expect(within(inlineList).getByText('Send invoice INV-42')).toBeInTheDocument();

    const nextStepsPreview = screen.getByRole('button', {
      name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.nextSteps),
    });
    expect(within(nextStepsPreview).getByText(`${AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.nextSteps}:`)).toHaveAttribute(
      'dir',
      'auto'
    );
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
        contentRevision={40}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    expect(screen.queryByText('<img src=x onerror=alert(1)>:')).not.toBeInTheDocument();
    expect(screen.getByText(`${AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason}:`)).toBeInTheDocument();
    expect(screen.getByText('<script>alert("summary")</script>')).toBeInTheDocument();
    expect(screen.getByText('<b onclick=alert(2)>Follow up</b>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
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
        contentRevision={3}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(onCopy).not.toHaveBeenCalled();
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith(3));
    fireEvent.mouseEnter(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    fireEvent.mouseLeave(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_ASSISTANT_SUMMARY_MESSAGES.copiedSummary
    );

    act(() => {
      jest.advanceTimersByTime(COPIED_FEEDBACK_MS - 1);
    });
    expect(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_ASSISTANT_SUMMARY_MESSAGES.copiedSummary
    );
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_ASSISTANT_SUMMARY_MESSAGES.copySummary
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
  });

  it('resets confirmed copy on blur and clears the accepted timer', async () => {
    jest.useFakeTimers();
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={42}
        onEdit={jest.fn()}
        onCopy={jest.fn().mockReturnValue(true)}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    const copy = screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary});
    fireEvent.click(copy);
    await waitFor(() => expect(copy).toHaveTextContent(LITERAL_SUMMARY_COPY.copied));
    expect(jest.getTimerCount()).toBe(1);

    fireEvent.blur(copy, {relatedTarget: null});

    expect(copy).toHaveTextContent(LITERAL_SUMMARY_COPY.copySummary);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps a copy the store rejects as stale from painting success', async () => {
    const falseRecorder = jest.fn().mockReturnValue(false);
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={45}
        onEdit={jest.fn()}
        onCopy={falseRecorder}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}));
    await waitFor(() => expect(falseRecorder).toHaveBeenCalledWith(45));
    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary})).toHaveTextContent(
      LITERAL_SUMMARY_COPY.copySummary
    );
  });

  it('contains synchronous receiver getter and clipboard writer failures without state changes', () => {
    const onCopy = jest.fn().mockReturnValue(true);
    const {rerender} = render(
      <AISummary
        mode="mid-call-receiver"
        state="content"
        contentRevision={47}
        getReceiverCopyText={() => {
          throw new Error('no rendered receiver text');
        }}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );

    expect(() => fireEvent.click(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}))).not.toThrow();
    expect(onCopy).not.toHaveBeenCalled();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary})).toHaveTextContent(
      LITERAL_SUMMARY_COPY.copySummary
    );

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get: () => {
        throw new Error('clipboard getter failed');
      },
    });
    rerender(
      <AISummary
        mode="mid-call-receiver"
        state="content"
        contentRevision={48}
        getReceiverCopyText={() => 'Visible receiver copy'}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );
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
        contentRevision={49}
        getReceiverCopyText={() => 'Visible receiver copy'}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );
    expect(() => fireEvent.click(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}))).not.toThrow();
    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary})).toHaveTextContent(
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
        contentRevision={16}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
        'Initial contact reason: Customer asked for invoice help.\n\nOutcome: Correction approved\n\nNext Steps: Send the updated invoice.'
      )
    );
    expect(onCopy).toHaveBeenCalledWith(16);

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={{...sectionContent, resolution: undefined}}
        contentRevision={17}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
        'Initial contact reason: Customer asked for invoice help.\n\nNext Steps: Send the updated invoice.'
      )
    );
    expect(onCopy).toHaveBeenCalledWith(17);
  });

  it('blocks empty plain, structured and receiver copy output before Clipboard access', () => {
    const onCopy = jest.fn().mockReturnValue(true);
    const {rerender, unmount} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={{conversationId: 'interaction-main-1', summaryText: ' \n\t '}}
        contentRevision={18}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_ASSISTANT_SUMMARY_MESSAGES.copySummary
    );

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={{
          conversationId: 'interaction-main-1',
          sections: {initialContactReason: ' '},
          resolution: '',
        }}
        contentRevision={19}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );
    fireEvent.click(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();

    unmount();
    render(
      <AISummary
        mode="mid-call-receiver"
        state="content"
        contentRevision={20}
        getReceiverCopyText={jest.fn().mockReturnValue('')}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
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
        contentRevision={21}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() =>
      expect(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
        AI_ASSISTANT_SUMMARY_MESSAGES.copiedSummary
      )
    );

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={{conversationId: 'interaction-main-1', summaryText: 'Replacement summary'}}
        contentRevision={22}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    expect(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_ASSISTANT_SUMMARY_MESSAGES.copySummary
    );
    expect(jest.getTimerCount()).toBe(0);
  });

  it('swallows clipboard rejection without recorder calls or success paint', async () => {
    const onCopy = jest.fn().mockReturnValue(true);
    clipboardWrite(() => Promise.reject(new Error('denied')));
    render(
      <AISummary
        mode="mid-call-initiator"
        state="content"
        content={textContent}
        contentRevision={4}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    await flushUnhandledRejectionQueues();
    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_ASSISTANT_SUMMARY_MESSAGES.copySummary
    );
  });

  it('shows the selected post-call feedback with the pending description', () => {
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={5}
        selectedFeedback="thumbs_up"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    const like = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like});
    const dislike = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.dislike});
    const pendingDescription = screen.getByText(AI_ASSISTANT_SUMMARY_MESSAGES.feedback.pendingSubmission);
    const pendingDescriptionId = pendingDescription.id;
    expect(like).toHaveClass('ai-summary__feedback-button--selected');
    expect(pendingDescriptionId).toMatch(/^ai-summary-feedback-/);
    expect(like).toHaveAttribute('aria-describedby', pendingDescriptionId);
    expect(dislike).toHaveAttribute('aria-describedby', pendingDescriptionId);
    expect(like).toHaveAccessibleDescription(LITERAL_SUMMARY_COPY.pendingSubmission);
    expect(dislike).toHaveAccessibleDescription(LITERAL_SUMMARY_COPY.pendingSubmission);
  });

  it('reports feedback clicks with the shown revision and paints the selection the store keeps', () => {
    const onFeedback = jest.fn().mockReturnValue(true);
    const renderSummary = (selectedFeedback?: 'thumbs_up' | 'thumbs_down') => (
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={5}
        selectedFeedback={selectedFeedback}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={onFeedback}
        onRetry={jest.fn()}
      />
    );
    const {rerender} = render(renderSummary());
    const like = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like});
    const dislike = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.dislike});
    fireEvent.click(like);
    fireEvent.click(dislike);
    expect(onFeedback.mock.calls).toEqual([
      ['thumbs_up', 5],
      ['thumbs_down', 5],
    ]);
    expect(like).toHaveAttribute('aria-pressed', 'false');

    rerender(renderSummary('thumbs_down'));
    expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(dislike).toHaveAttribute('aria-pressed', 'true');
  });

  it('exposes exact accessible feedback labels and visible hover tooltips', async () => {
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={6}
        selectedFeedback="thumbs_up"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    const like = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like});
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).not.toHaveAttribute('title');
    fireEvent.mouseEnter(getActionWrapper(like));
    await waitFor(() => expect(screen.getByRole('tooltip', {hidden: true})).toHaveAttribute('visible'));
    const feedbackTooltip = screen.getByRole('tooltip', {hidden: true});
    expect(feedbackTooltip.tagName).toBe('MDC-TOOLTIP');
    expect(feedbackTooltip).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.like);
    expect(feedbackTooltip).toHaveAttribute('trigger', 'manual');
    expect(feedbackTooltip).toHaveAttribute('triggerid', like.id);
    expect(feedbackTooltip).toHaveAttribute('offset', '0');
    expect(feedbackTooltip).toHaveAttribute('tooltip-type', 'none');
    expect(like).toHaveAccessibleDescription(AI_ASSISTANT_SUMMARY_MESSAGES.feedback.pendingSubmission);
    fireEvent.mouseLeave(getActionWrapper(like));
    expect(screen.queryByRole('tooltip', {hidden: true})).not.toBeInTheDocument();

    const copy = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary});
    const dislike = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.dislike});
    expect(copy).not.toHaveAttribute('title');
    expect(dislike).not.toHaveAttribute('title');
    fireEvent.mouseEnter(getActionWrapper(copy));
    await waitFor(() => expect(screen.getByRole('tooltip', {hidden: true})).toHaveAttribute('visible'));
    expect(screen.getAllByRole('tooltip', {hidden: true})).toHaveLength(1);
    expect(screen.getByRole('tooltip', {hidden: true})).toHaveTextContent(AI_ASSISTANT_SUMMARY_MESSAGES.copySummary);
    expect(screen.getByRole('tooltip', {hidden: true})).toHaveAttribute('triggerid', copy.id);
  });

  it('keeps action tooltips open while moving from trigger to tooltip wrapper', async () => {
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={6}
        selectedFeedback="thumbs_up"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    const like = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like});
    const action = getActionWrapper(like);
    fireEvent.mouseEnter(action);
    const tooltip = await screen.findByRole('tooltip', {hidden: true});
    fireEvent.mouseLeave(like, {relatedTarget: tooltip});
    await waitFor(() => expect(tooltip).toHaveAttribute('visible'));
    fireEvent.mouseEnter(tooltip);
    await waitFor(() => expect(screen.getByRole('tooltip', {hidden: true})).toHaveAttribute('visible'));
    fireEvent.mouseLeave(action);
    expect(screen.queryByRole('tooltip', {hidden: true})).not.toBeInTheDocument();
  });

  it('dismisses action tooltips with Escape without moving focus', async () => {
    const parentEscape = jest.fn();
    render(
      <div onKeyDown={parentEscape}>
        <AISummary
          mode="post-call"
          state="content"
          content={textContent}
          contentRevision={6}
          selectedFeedback="thumbs_up"
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(true)}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        />
      </div>
    );

    const like = screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like});
    act(() => {
      like.focus();
    });
    expect(like).toHaveFocus();
    await waitFor(() => expect(screen.getByRole('tooltip', {hidden: true})).toHaveAttribute('visible'));

    fireEvent.keyDown(like, {key: 'Escape'});
    expect(screen.queryByRole('tooltip', {hidden: true})).not.toBeInTheDocument();
    expect(like).toHaveFocus();
    expect(parentEscape).not.toHaveBeenCalled();
  });

  it('dismisses hover tooltips with Escape while focus remains outside the summary', async () => {
    const parentEscape = jest.fn();
    const {unmount} = render(
      <div onKeyDown={parentEscape}>
        <button type="button">External control</button>
        <AISummary
          mode="post-call"
          state="content"
          content={textContent}
          contentRevision={6}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn()}
          onRetry={jest.fn()}
        />
      </div>
    );
    const external = screen.getByRole('button', {name: 'External control'});
    act(() => external.focus());
    fireEvent.mouseEnter(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like}));
    await waitFor(() => expect(screen.getByRole('tooltip', {hidden: true})).toHaveAttribute('visible'));
    fireEvent.keyDown(external, {key: 'Escape'});
    expect(screen.queryByRole('tooltip', {hidden: true})).not.toBeInTheDocument();
    expect(external).toHaveFocus();
    expect(parentEscape).not.toHaveBeenCalled();

    fireEvent.keyDown(external, {key: 'Escape'});
    expect(parentEscape).toHaveBeenCalledTimes(1);
    fireEvent.mouseEnter(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like}));
    unmount();
    expect(fireEvent.keyDown(document.body, {key: 'Escape'})).toBe(true);
  });

  it('routes Retry only from the generic-error surface and never renders it with retained content', async () => {
    const onRetry = jest.fn().mockResolvedValue({outcome: 'blocked'});
    const {rerender} = render(
      <AISummary
        mode="post-call"
        state="generic-error"
        content={textContent}
        contentRevision={51}
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
        contentRevision={52}
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
        contentRevision={51}
        requestPending
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

  it('recovers panel focus when the shared Retry button is removed', async () => {
    const props = {
      mode: 'post-call',
      contentRevision: 51,
      onEdit: jest.fn(),
      onCopy: jest.fn(),
      onFeedback: jest.fn(),
      onRetry: jest.fn().mockResolvedValue({outcome: 'blocked'}),
    } as const;
    const {rerender} = render(<AISummary {...props} state="generic-error" />);
    const retry = await screen.findByRole('button', {name: LITERAL_SUMMARY_COPY.retry});
    act(() => retry.focus());
    expect(retry).toHaveFocus();

    rerender(<AISummary {...props} state="generating" />);
    expect(screen.getByTestId('ai-summary:test-panel')).toHaveFocus();
  });

  it('uses synchronous receiver copy text without card JSON or editable content props', async () => {
    const getReceiverCopyText = jest.fn().mockReturnValue('Visible card text');
    const onCopy = jest.fn().mockReturnValue(true);
    render(
      <AISummary
        mode="mid-call-receiver"
        state="content"
        contentRevision={10}
        getReceiverCopyText={getReceiverCopyText}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith(10));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Visible card text');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it.each(['generating', 'unavailable', 'generic-error'] as const)('omits receiver actions for %s state', (state) => {
    render(<AISummary mode="mid-call-receiver" state={state} />);

    expect(screen.queryByTestId('ai-summary:actions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.like})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.dislike})).not.toBeInTheDocument();
  });

  it('recovers focus to the containing panel when receiver actions are removed', async () => {
    const panelRef = React.createRef<HTMLDivElement>();
    const {rerender} = render(
      <div>
        <div ref={panelRef} data-testid="receiver-panel" tabIndex={-1} />
        <AISummary
          mode="mid-call-receiver"
          state="content"
          contentRevision={11}
          containingPanelFocusTarget={panelRef}
          getReceiverCopyText={() => 'Visible card text'}
          onCopy={jest.fn().mockReturnValue(true)}
          onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
        />
      </div>
    );

    act(() => {
      screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}).focus();
    });
    expect(screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary})).toHaveFocus();

    rerender(
      <div>
        <div ref={panelRef} data-testid="receiver-panel" tabIndex={-1} />
        <AISummary mode="mid-call-receiver" state="unavailable" containingPanelFocusTarget={panelRef} />
      </div>
    );

    await waitFor(() => expect(screen.getByTestId('receiver-panel')).toHaveFocus());
    expect(screen.queryByTestId('ai-summary:actions')).not.toBeInTheDocument();
  });

  it('moves focus to a successor when one focused control is removed, then falls back to the panel', async () => {
    const panelRef = React.createRef<HTMLDivElement>();
    const firstContent: AISummaryContent = {
      conversationId: 'interaction-main-1',
      sections: {
        initialContactReason: 'Summary value',
        nextSteps: 'Follow-up value',
      },
    };
    const {rerender} = render(
      <div>
        <div ref={panelRef} data-testid="post-call-panel" tabIndex={-1} />
        <AISummary
          mode="post-call"
          state="content"
          content={firstContent}
          contentRevision={51}
          containingPanelFocusTarget={panelRef}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(true)}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        />
      </div>
    );

    const summaryPreview = screen.getByRole('button', {
      name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
    });
    act(() => {
      summaryPreview.focus();
    });
    expect(summaryPreview).toHaveFocus();

    rerender(
      <div>
        <div ref={panelRef} data-testid="post-call-panel" tabIndex={-1} />
        <AISummary
          mode="post-call"
          state="content"
          content={{
            conversationId: 'interaction-main-1',
            sections: {nextSteps: 'Follow-up value'},
          }}
          contentRevision={52}
          containingPanelFocusTarget={panelRef}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(true)}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        />
      </div>
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.nextSteps),
        })
      ).toHaveFocus()
    );

    const copy = screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary});
    act(() => {
      copy.focus();
    });
    expect(copy).toHaveFocus();

    rerender(
      <div>
        <div ref={panelRef} data-testid="post-call-panel" tabIndex={-1} />
        <AISummary
          mode="post-call"
          state="unavailable"
          content={{
            conversationId: 'interaction-main-1',
            sections: {nextSteps: 'Follow-up value'},
          }}
          contentRevision={53}
          containingPanelFocusTarget={panelRef}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(true)}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        />
      </div>
    );

    await waitFor(() => expect(screen.getByTestId('post-call-panel')).toHaveFocus());
  });

  it('retains focus on the active summary control across ordinary content updates', () => {
    const {rerender} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={54}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    const like = screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.like});
    act(() => {
      like.focus();
    });
    expect(like).toHaveFocus();

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={{conversationId: 'interaction-main-1', summaryText: 'Updated while focus remains on Like.'}}
        contentRevision={55}
        selectedFeedback="thumbs_up"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.like})).toHaveFocus();
  });

  it('moves focus to the next summary control when a focused editor is removed', async () => {
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={sectionContent}
        contentRevision={13}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    );
    const editor = screen.getByRole('textbox', {name: AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason});
    act(() => {
      editor.focus();
    });
    expect(editor).toHaveFocus();

    fireEvent.blur(editor, {relatedTarget: null});

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.nextSteps),
        })
      ).toHaveFocus()
    );
  });

  it('keeps external focus after a normal blur out of the summary', async () => {
    render(
      <div>
        <AISummary
          mode="post-call"
          state="content"
          content={sectionContent}
          contentRevision={14}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(true)}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        />
        <button type="button">External destination</button>
      </div>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    );
    const editor = screen.getByRole('textbox', {name: AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels.initialContactReason});
    const external = screen.getByRole('button', {name: 'External destination'});
    act(() => {
      editor.focus();
    });

    fireEvent.blur(editor, {relatedTarget: external});
    act(() => {
      external.focus();
    });

    await waitFor(() => expect(external).toHaveFocus());
  });

  it('consumes a panel fallback once and does not steal focus on later renders', async () => {
    let setState: React.Dispatch<React.SetStateAction<'content' | 'unavailable'>> = () => undefined;
    let forceRender = () => undefined;
    const Harness = () => {
      const panelRef = React.useRef<HTMLDivElement | null>(null);
      const [state, setHarnessState] = React.useState<'content' | 'unavailable'>('content');
      const [, setRenderCount] = React.useState(0);
      setState = setHarnessState;
      forceRender = () => setRenderCount((count) => count + 1);

      return (
        <div>
          <button type="button">External destination</button>
          <div ref={panelRef} data-testid="receiver-panel" tabIndex={-1} />
          {state === 'content' ? (
            <AISummary
              mode="mid-call-receiver"
              state="content"
              contentRevision={15}
              containingPanelFocusTarget={panelRef}
              getReceiverCopyText={() => 'Visible card text'}
              onCopy={jest.fn().mockReturnValue(true)}
              onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
            />
          ) : (
            <AISummary mode="mid-call-receiver" state="unavailable" containingPanelFocusTarget={panelRef} />
          )}
        </div>
      );
    };
    render(<Harness />);

    act(() => {
      screen.getByRole('button', {name: AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}).focus();
    });
    act(() => {
      setState('unavailable');
    });
    await waitFor(() => expect(screen.getByTestId('receiver-panel')).toHaveFocus());

    const external = screen.getByRole('button', {name: 'External destination'});
    act(() => {
      external.focus();
    });
    act(() => {
      forceRender();
    });

    expect(external).toHaveFocus();
  });
});
