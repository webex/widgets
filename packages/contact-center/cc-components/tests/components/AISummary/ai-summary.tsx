import React from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import type {AISummaryContent} from '@webex/cc-store';
import AISummaryComponent, {
  AI_SUMMARY_MESSAGES,
  COPIED_FEEDBACK_MS,
  POST_CALL_DISPLAY_SECTION_ORDER,
  projectPostCallDisplaySections,
} from '../../../src/components/AISummary';

const sectionContent: AISummaryContent = {
  type: 'sections',
  sections: [
    {key: 'initialContactReason', value: 'Customer asked for invoice help.', editable: true},
    {key: 'nextSteps', value: 'Send the updated invoice.', editable: true},
  ],
  resolution: 'Correction approved',
};

const textContent: AISummaryContent = {
  type: 'text',
  summaryText: 'Customer asked for invoice help.',
};

const COMPLETE_WRAP_UP_LABEL = 'Complete Wrap-Up';
const POST_CALL_DISPLAY_SECTION_KEYS = [
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
  submissionNotConfirmed: 'Submission not confirmed',
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

const createDeferredClipboardWrite = () => {
  let resolveWrite: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    resolveWrite = resolve;
  });
  return {
    promise,
    resolve: resolveWrite,
  };
};

const createDeferred = <T,>() => {
  let resolveDeferred: (value: T) => void = () => undefined;
  let rejectDeferred: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolveDeferred = resolve;
    rejectDeferred = reject;
  });
  return {
    promise,
    resolve: resolveDeferred,
    reject: rejectDeferred,
  };
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

// Native Promise rejections are owned by Jest's runner and fail the test there.
// A listener on the sandbox's process object cannot prove their absence. Browser
// rejection observability is exercised separately with a real native rejection.
const trackWindowFailures = () => {
  const errors: ErrorEvent[] = [];
  const error = (event: ErrorEvent) => {
    if (!event.error && !event.message) {
      return;
    }
    event.preventDefault();
    errors.push(event);
  };
  window.addEventListener('error', error);
  return {
    assertNone: () => {
      expect(errors).toHaveLength(0);
    },
    cleanup: () => {
      window.removeEventListener('error', error);
    },
  };
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
  actionType: 'TRANSFER',
  content: textContent,
  getReceiverCopyText: () => 'Receiver text',
  onCopy: () => true,
  onFeedback: async () => ({outcome: 'confirmed'}),
  containingPanelFocusTarget: typeOnlyPanelRef,
};
const receiverCardContentIsRejected: React.ComponentProps<typeof AISummaryComponent> = {
  mode: 'mid-call-receiver',
  state: 'content',
  contentRevision: 1,
  actionType: 'TRANSFER',
  // @ts-expect-error Receiver card content must not be accepted by the shared presentation component props.
  content: {type: 'card', adaptiveCard: {type: 'AdaptiveCard'}},
  getReceiverCopyText: () => 'Receiver text',
  onCopy: () => true,
  onFeedback: async () => ({outcome: 'confirmed'}),
  containingPanelFocusTarget: typeOnlyPanelRef,
};
const receiverChildrenAreRejected: React.ComponentProps<typeof AISummaryComponent> = {
  mode: 'mid-call-receiver',
  state: 'content',
  contentRevision: 1,
  actionType: 'TRANSFER',
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
  onCopyVisualStateChange: jest.fn(),
  containingPanelFocusTarget: typeOnlyPanelRef,
};
const initiatorReceiverCopyIsRejected: React.ComponentProps<typeof AISummaryComponent> = {
  mode: 'mid-call-initiator',
  state: 'content',
  content: textContent,
  contentRevision: 1,
  actionType: 'CONSULT',
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

  it('exports a unique display ordinal and inserts Outcome without reordering SDK sections', () => {
    expect(AI_SUMMARY_MESSAGES.postCall.completeAction).toBe(COMPLETE_WRAP_UP_LABEL);
    expect(POST_CALL_DISPLAY_SECTION_ORDER).toEqual(POST_CALL_DISPLAY_SECTION_KEYS);
    expect([...new Set(POST_CALL_DISPLAY_SECTION_ORDER)]).toEqual(POST_CALL_DISPLAY_SECTION_ORDER);
    const projected = projectPostCallDisplaySections(sectionContent);
    expect(projected.map((section) => section.key)).toEqual(['initialContactReason', 'resolution', 'nextSteps']);
    expect(projected.find((section) => section.key === 'resolution')).toMatchObject({
      value: 'Correction approved',
      editable: false,
    });

    expect(
      projectPostCallDisplaySections({...sectionContent, resolution: undefined}).map((section) => section.key)
    ).toEqual(['initialContactReason', 'nextSteps']);
    expect(projectPostCallDisplaySections({...sectionContent, resolution: ''}).map((section) => section.key)).toEqual([
      'initialContactReason',
      'nextSteps',
    ]);
  });

  it('renders exact generating and error copy without underscore or percent artifacts', () => {
    render(
      <AISummary
        mode="post-call"
        state="generating"
        content={textContent}
        contentRevision={1}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );

    expect(screen.getByText(AI_SUMMARY_MESSAGES.generatingDescription)).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: AI_SUMMARY_MESSAGES.generatingTitle})).toHaveClass(
      'ai-summary__status-title--generating'
    );
    expect(AI_SUMMARY_MESSAGES.generatingDescription).toContain('—');
    expect(AI_SUMMARY_MESSAGES.generatingDescription).not.toContain('_');
    expect(document.body).not.toHaveTextContent(/%[^%]+%/);

    render(
      <AISummary
        mode="post-call"
        state="generic-error"
        content={textContent}
        contentRevision={1}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );

    expect(screen.getByText(AI_SUMMARY_MESSAGES.generationError)).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: AI_SUMMARY_MESSAGES.generationError})).toHaveClass(
      'ai-summary__status-title--error'
    );
    expect(screen.getByText(AI_SUMMARY_MESSAGES.generationErrorDescription)).toBeInTheDocument();
  });

  it('renders literal en-US labels and state copy without importing expected strings from the component constants', () => {
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
        onCopyVisualStateChange={jest.fn()}
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
        onCopyVisualStateChange={jest.fn()}
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
        onCopyVisualStateChange={jest.fn()}
      />
    );
    expect(screen.getByRole('heading', {name: LITERAL_SUMMARY_COPY.generationError})).toBeInTheDocument();
    expect(screen.getByText(LITERAL_SUMMARY_COPY.generationErrorDescription)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.retry})).toBeInTheDocument();

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
        onCopyVisualStateChange={jest.fn()}
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
        onCopyVisualStateChange={jest.fn()}
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
        onCopyVisualStateChange={jest.fn()}
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
        onCopyVisualStateChange={jest.fn()}
      />
    );
    expect(screen.getByText(AI_SUMMARY_MESSAGES.unavailable)).toBeInTheDocument();

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
        onCopyVisualStateChange={jest.fn()}
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
  ] as const)('renders a discriminating %s %s state', (mode, state) => {
    const sharedCallbacks = {
      onEdit: jest.fn(),
      onCopy: jest.fn(),
      onFeedback: jest.fn().mockResolvedValue({outcome: 'confirmed'}),
      onRetry: jest.fn().mockResolvedValue({outcome: 'blocked'}),
      onCopyVisualStateChange: jest.fn(),
    };

    if (mode === 'mid-call-receiver' && state !== 'content') {
      render(<AISummary mode={mode} state={state} />);
    } else if (mode === 'mid-call-receiver') {
      render(
        <AISummary
          mode={mode}
          state={state}
          contentRevision={41}
          actionType="TRANSFER"
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
          actionType="CONSULT"
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
          onCopyVisualStateChange={sharedCallbacks.onCopyVisualStateChange}
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
        expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.retry})).toBeInTheDocument();
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
          onCopyVisualStateChange={jest.fn()}
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
        onCopyVisualStateChange={jest.fn()}
      />
    );

    const surface = screen.getByTestId('ai-summary:editor-surface');
    expect(surface).toContainElement(
      screen.getByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    );
    expect(surface).toContainElement(
      screen.getByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.nextSteps),
      })
    );
    expect(surface).toContainElement(screen.getByTestId('ai-summary:actions'));
    expect(screen.queryByRole('textbox', {name: AI_SUMMARY_MESSAGES.sectionLabels.resolution})).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}).querySelector('mdc-icon')
    ).toHaveProperty('name', 'copy-regular');
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}).querySelector('mdc-icon')).toHaveProperty(
      'name',
      'like-regular'
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    );
    expect(screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason})).toHaveFocus();
    fireEvent.change(screen.getByDisplayValue('Customer asked for invoice help.'), {target: {value: ''}});
    expect(onEdit).toHaveBeenCalledWith({key: 'initialContactReason', value: ''}, 7);
    fireEvent.blur(screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason}));
    expect(
      screen.getByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    ).toBeInTheDocument();
    expect(screen.getByText(AI_SUMMARY_MESSAGES.sectionLabels.resolution)).toBeInTheDocument();
    expect(screen.getByText(AI_SUMMARY_MESSAGES.attribution)).toBeInTheDocument();
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
        onCopyVisualStateChange={jest.fn()}
      />
    );
    expect(
      screen.getByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    ).toBeDisabled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Customer asked for invoice help.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.resolution),
      })
    ).not.toBeInTheDocument();
  });

  it('applies automatic direction to mixed-direction structured summary text boundaries', () => {
    const bidiContent: AISummaryContent = {
      type: 'sections',
      sections: [
        {key: 'initialContactReason', value: 'שלום ticket 42', editable: true},
        {
          key: 'keyActionsTaken',
          value: '• اتصل بالعميل\n- Send invoice INV-42',
          editable: true,
        },
        {
          key: 'nextSteps',
          value: '• שלח טופס\n* Schedule follow-up',
          editable: true,
        },
      ],
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
        onCopyVisualStateChange={jest.fn()}
      />
    );

    const summaryPreview = screen.getByRole('button', {
      name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
    });
    expect(
      within(summaryPreview).getByText(`${AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason}:`)
    ).toHaveAttribute('dir', 'auto');
    expect(within(summaryPreview).getByText('שלום ticket 42')).toHaveAttribute('dir', 'auto');

    const actionPreview = screen.getByRole('button', {
      name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.keyActionsTaken),
    });
    expect(within(actionPreview).getByText(`${AI_SUMMARY_MESSAGES.sectionLabels.keyActionsTaken}:`)).toHaveAttribute(
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
      name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.nextSteps),
    });
    expect(within(nextStepsPreview).getByText(`${AI_SUMMARY_MESSAGES.sectionLabels.nextSteps}:`)).toHaveAttribute(
      'dir',
      'auto'
    );
  });

  it('projects every post-call display section in canonical order and appends Outcome when needed', () => {
    const completeContent: AISummaryContent = {
      type: 'sections',
      sections: [
        {key: 'initialContactReason', value: 'Summary value', editable: true},
        {key: 'additionalContactReasons', value: 'Billing help', editable: true},
        {key: 'additionalContext', value: 'Positive', editable: true},
        {key: 'keyActionsTaken', value: 'Send invoice', editable: true},
        {key: 'nextSteps', value: 'Escalate adjustment', editable: true},
      ],
      resolution: 'Resolved after adjustment',
    };
    const projected = projectPostCallDisplaySections(completeContent);

    expect(projected.map((section) => section.key)).toEqual([
      'initialContactReason',
      'additionalContactReasons',
      'additionalContext',
      'keyActionsTaken',
      'resolution',
      'nextSteps',
    ]);
    expect(projected.map((section) => section.value)).toContain('Resolved after adjustment');
    expect(projectPostCallDisplaySections({...completeContent, resolution: undefined})).not.toContainEqual(
      expect.objectContaining({key: 'resolution'})
    );
    expect(
      projectPostCallDisplaySections({
        type: 'sections',
        sections: [
          {key: 'initialContactReason', value: 'Only summary', editable: true},
          {key: 'keyActionsTaken', value: 'Already before resolution', editable: true},
        ],
        resolution: 'Appended resolution',
      }).map((section) => section.key)
    ).toEqual(['initialContactReason', 'keyActionsTaken', 'resolution']);
    expect(
      projectPostCallDisplaySections({
        type: 'sections',
        sections: [{key: 'nextSteps', value: 'Last ordered section', editable: true}],
        resolution: 'Inserted resolution',
      }).map((section) => section.key)
    ).toEqual(['resolution', 'nextSteps']);
  });

  it('renders injected labels and values as text without live-region announcements', () => {
    const maliciousContent: AISummaryContent = {
      type: 'sections',
      sections: [
        {
          key: 'initialContactReason',
          value: '<script>alert("summary")</script>',
          editable: true,
        },
        {
          key: 'nextSteps',
          value: '<b onclick=alert(2)>Follow up</b>',
          editable: true,
        },
      ],
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
        onCopyVisualStateChange={jest.fn()}
      />
    );

    expect(screen.queryByText('<img src=x onerror=alert(1)>:')).not.toBeInTheDocument();
    expect(screen.getByText(`${AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason}:`)).toBeInTheDocument();
    expect(screen.getByText('<script>alert("summary")</script>')).toBeInTheDocument();
    expect(screen.getByText('<b onclick=alert(2)>Follow up</b>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
  });

  it('observes clipboard fulfillment before recording copy and reverts confirmed state at 1500 ms', async () => {
    jest.useFakeTimers();
    const onCopy = jest.fn().mockReturnValue(true);
    const onCopyVisualStateChange = jest.fn();
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
        onCopyVisualStateChange={onCopyVisualStateChange}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(onCopy).not.toHaveBeenCalled();
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith(3));
    fireEvent.mouseEnter(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    fireEvent.mouseLeave(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_SUMMARY_MESSAGES.copiedSummary
    );

    act(() => {
      jest.advanceTimersByTime(COPIED_FEEDBACK_MS - 1);
    });
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_SUMMARY_MESSAGES.copiedSummary
    );
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_SUMMARY_MESSAGES.copySummary
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(onCopyVisualStateChange).toHaveBeenCalledWith('confirmed');
    expect(onCopyVisualStateChange).toHaveBeenLastCalledWith('idle');
  });

  it('resets confirmed copy on blur and clears the accepted timer', async () => {
    jest.useFakeTimers();
    const onCopyVisualStateChange = jest.fn();
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
        onCopyVisualStateChange={onCopyVisualStateChange}
      />
    );

    const copy = screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary});
    fireEvent.click(copy);
    await waitFor(() => expect(copy).toHaveTextContent(LITERAL_SUMMARY_COPY.copied));
    expect(jest.getTimerCount()).toBe(1);

    fireEvent.blur(copy, {relatedTarget: null});

    expect(copy).toHaveTextContent(LITERAL_SUMMARY_COPY.copySummary);
    expect(jest.getTimerCount()).toBe(0);
    expect(onCopyVisualStateChange.mock.calls).toEqual([['confirmed'], ['idle']]);
  });

  it('resets a confirmed copy on the second gesture and starts a new timer only after fulfillment', async () => {
    jest.useFakeTimers();
    const firstWrite = createDeferredClipboardWrite();
    const secondWrite = createDeferred<void>();
    clipboardWrite(jest.fn().mockReturnValueOnce(firstWrite.promise).mockReturnValueOnce(secondWrite.promise));
    const onCopy = jest.fn().mockReturnValue(true);

    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={43}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );

    const copy = screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary});
    fireEvent.click(copy);
    await act(async () => {
      firstWrite.resolve();
      await firstWrite.promise;
    });
    await waitFor(() => expect(copy).toHaveTextContent(LITERAL_SUMMARY_COPY.copied));
    expect(jest.getTimerCount()).toBe(1);

    fireEvent.click(copy);
    expect(copy).toHaveTextContent(LITERAL_SUMMARY_COPY.copySummary);
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);

    await act(async () => {
      secondWrite.resolve();
      await secondWrite.promise;
    });
    await waitFor(() => expect(copy).toHaveTextContent(LITERAL_SUMMARY_COPY.copied));
    expect(onCopy).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(1);
  });

  it('leaves a rejected second copy idle without recording or retaining a timer', async () => {
    jest.useFakeTimers();
    const secondWrite = createDeferred<void>();
    clipboardWrite(jest.fn().mockResolvedValueOnce(undefined).mockReturnValueOnce(secondWrite.promise));
    const onCopy = jest.fn().mockReturnValue(true);
    const onCopyVisualStateChange = jest.fn();

    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={44}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={onCopyVisualStateChange}
      />
    );

    const copy = screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary});
    fireEvent.click(copy);
    await waitFor(() => expect(copy).toHaveTextContent(LITERAL_SUMMARY_COPY.copied));
    fireEvent.click(copy);
    expect(copy).toHaveTextContent(LITERAL_SUMMARY_COPY.copySummary);

    await act(async () => {
      secondWrite.reject(new Error('denied'));
      await secondWrite.promise.catch(() => undefined);
    });

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(copy).toHaveTextContent(LITERAL_SUMMARY_COPY.copySummary);
    expect(jest.getTimerCount()).toBe(0);
    expect(onCopyVisualStateChange.mock.calls).toEqual([['confirmed'], ['idle']]);
  });

  it('keeps stale or throwing copy recorders from painting success', async () => {
    const falseRecorder = jest.fn().mockReturnValue(false);
    const throwingRecorder = jest.fn(() => {
      throw new Error('stale recorder');
    });
    const {rerender} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={45}
        onEdit={jest.fn()}
        onCopy={falseRecorder}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}));
    await waitFor(() => expect(falseRecorder).toHaveBeenCalledWith(45));
    expect(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary})).toHaveTextContent(
      LITERAL_SUMMARY_COPY.copySummary
    );

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={46}
        onEdit={jest.fn()}
        onCopy={throwingRecorder}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.copySummary}));
    await waitFor(() => expect(throwingRecorder).toHaveBeenCalledWith(46));
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
        actionType="TRANSFER"
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
        actionType="TRANSFER"
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
        actionType="TRANSFER"
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
        onCopyVisualStateChange={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
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
        onCopyVisualStateChange={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
        'Initial contact reason: Customer asked for invoice help.\n\nNext Steps: Send the updated invoice.'
      )
    );
    expect(onCopy).toHaveBeenCalledWith(17);
  });

  it('blocks empty plain, structured and receiver copy output before Clipboard access', () => {
    const onCopy = jest.fn().mockReturnValue(true);
    const onCopyVisualStateChange = jest.fn();
    const {rerender, unmount} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={{type: 'text', summaryText: ' \n\t '}}
        contentRevision={18}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={onCopyVisualStateChange}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();
    expect(onCopyVisualStateChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_SUMMARY_MESSAGES.copySummary
    );

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={{
          type: 'sections',
          sections: [{key: 'initialContactReason', value: ' ', editable: true}],
          resolution: '',
        }}
        contentRevision={19}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={onCopyVisualStateChange}
      />
    );
    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();
    expect(onCopyVisualStateChange).not.toHaveBeenCalled();

    unmount();
    render(
      <AISummary
        mode="mid-call-receiver"
        state="content"
        contentRevision={20}
        actionType="TRANSFER"
        getReceiverCopyText={jest.fn().mockReturnValue('')}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();
  });

  it('drops delayed clipboard fulfillment after unmount without recording or scheduling timers', async () => {
    jest.useFakeTimers();
    const firstWrite = createDeferredClipboardWrite();
    clipboardWrite(() => firstWrite.promise);
    const onCopy = jest.fn().mockReturnValue(true);
    const onCopyVisualStateChange = jest.fn();
    const {unmount} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={20}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={onCopyVisualStateChange}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    unmount();
    await act(async () => {
      firstWrite.resolve();
      await firstWrite.promise;
    });

    expect(onCopy).not.toHaveBeenCalled();
    expect(onCopyVisualStateChange).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('resets confirmation on content replacement without an initial idle callback', async () => {
    jest.useFakeTimers();
    const onCopy = jest.fn().mockReturnValue(true);
    const onCopyVisualStateChange = jest.fn();
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
        onCopyVisualStateChange={onCopyVisualStateChange}
      />
    );
    expect(onCopyVisualStateChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() => expect(onCopyVisualStateChange).toHaveBeenCalledWith('confirmed'));
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_SUMMARY_MESSAGES.copiedSummary
    );

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={{type: 'text', summaryText: 'Replacement summary'}}
        contentRevision={22}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={onCopyVisualStateChange}
      />
    );

    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_SUMMARY_MESSAGES.copySummary
    );
    expect(onCopyVisualStateChange.mock.calls).toEqual([['confirmed'], ['idle']]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('ignores superseded clipboard attempts and confirms only the current one', async () => {
    jest.useFakeTimers();
    const firstWrite = createDeferredClipboardWrite();
    const secondWrite = createDeferredClipboardWrite();
    clipboardWrite(jest.fn().mockReturnValueOnce(firstWrite.promise).mockReturnValueOnce(secondWrite.promise));
    const onCopy = jest.fn().mockReturnValue(true);

    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={23}
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    await act(async () => {
      firstWrite.resolve();
      await firstWrite.promise;
    });
    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_SUMMARY_MESSAGES.copySummary
    );

    await act(async () => {
      secondWrite.resolve();
      await secondWrite.promise;
    });
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledWith(23);
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_SUMMARY_MESSAGES.copiedSummary
    );
  });

  it('clears the accepted copy timer on unmount without reporting idle', async () => {
    jest.useFakeTimers();
    const onCopyVisualStateChange = jest.fn();
    const {unmount} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={24}
        onEdit={jest.fn()}
        onCopy={jest.fn().mockReturnValue(true)}
        onFeedback={jest.fn()}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={onCopyVisualStateChange}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() => expect(onCopyVisualStateChange).toHaveBeenCalledWith('confirmed'));
    expect(jest.getTimerCount()).toBe(1);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
    act(() => {
      jest.advanceTimersByTime(COPIED_FEEDBACK_MS);
    });
    expect(onCopyVisualStateChange.mock.calls).toEqual([['confirmed']]);
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
        actionType="CONSULT"
        onEdit={jest.fn()}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    await flushUnhandledRejectionQueues();
    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toHaveTextContent(
      AI_SUMMARY_MESSAGES.copySummary
    );
  });

  it('paints post-call feedback immediately with pending/not-confirmed descriptions and removes them on success', () => {
    const {rerender} = render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={5}
        feedbackStatus="pending"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}));
    const like = screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like});
    const dislike = screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike});
    const pendingDescription = screen.getByText(AI_SUMMARY_MESSAGES.feedback.pendingSubmission);
    const pendingDescriptionId = pendingDescription.id;
    expect(like).toHaveClass('ai-summary__feedback-button--selected');
    expect(pendingDescriptionId).toMatch(/^ai-summary-feedback-/);
    expect(like).toHaveAttribute('aria-describedby', pendingDescriptionId);
    expect(dislike).toHaveAttribute('aria-describedby', pendingDescriptionId);
    expect(like).toHaveAccessibleDescription(LITERAL_SUMMARY_COPY.pendingSubmission);
    expect(dislike).toHaveAccessibleDescription(LITERAL_SUMMARY_COPY.pendingSubmission);

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={5}
        feedbackStatus="not-confirmed"
        selectedFeedback="like"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );
    expect(screen.getByText(AI_SUMMARY_MESSAGES.feedback.submissionNotConfirmed)).toBeInTheDocument();
    expect(screen.getByText(AI_SUMMARY_MESSAGES.feedback.submissionNotConfirmed)).toHaveAttribute(
      'id',
      pendingDescriptionId
    );
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).toHaveAttribute(
      'aria-describedby',
      pendingDescriptionId
    );

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={5}
        selectedFeedback="like"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );
    expect(screen.queryByText(AI_SUMMARY_MESSAGES.feedback.pendingSubmission)).not.toBeInTheDocument();
    expect(screen.queryByText(AI_SUMMARY_MESSAGES.feedback.submissionNotConfirmed)).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).not.toHaveAttribute('aria-describedby');

    rerender(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={5}
        selectedFeedback="like"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );
    expect(screen.queryByText(AI_SUMMARY_MESSAGES.feedback.pendingSubmission)).not.toBeInTheDocument();
    expect(screen.queryByText(AI_SUMMARY_MESSAGES.feedback.submissionNotConfirmed)).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).not.toHaveAttribute('aria-describedby');
  });

  it('keeps post-call feedback selected on repeat clicks and switches to the opposite choice', () => {
    const onFeedback = jest.fn().mockReturnValue(true);
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={5}
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={onFeedback}
        onRetry={jest.fn()}
        onCopyVisualStateChange={jest.fn()}
      />
    );
    const like = screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like});
    const dislike = screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike});
    fireEvent.click(like);
    fireEvent.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(dislike).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(dislike);
    fireEvent.click(dislike);
    expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(dislike).toHaveAttribute('aria-pressed', 'true');
    expect(onFeedback.mock.calls).toEqual([
      ['like', 5],
      ['like', 5],
      ['dislike', 5],
      ['dislike', 5],
    ]);
  });

  it('exposes exact accessible feedback labels and visible hover tooltips', () => {
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={6}
        selectedFeedback="like"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );

    const like = screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like});
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).not.toHaveAttribute('title');
    fireEvent.mouseEnter(getActionWrapper(like));
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('tooltip', {name: AI_SUMMARY_MESSAGES.like})).toBeVisible();
    fireEvent.mouseLeave(getActionWrapper(like));
    expect(screen.queryByRole('tooltip', {name: AI_SUMMARY_MESSAGES.like})).not.toBeInTheDocument();

    const copy = screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary});
    const dislike = screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike});
    expect(copy).not.toHaveAttribute('title');
    expect(dislike).not.toHaveAttribute('title');
    fireEvent.mouseEnter(getActionWrapper(copy));
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('tooltip', {name: AI_SUMMARY_MESSAGES.copySummary})).toBeVisible();
  });

  it('keeps action tooltips open while moving from trigger to tooltip wrapper', () => {
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={6}
        selectedFeedback="like"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
      />
    );

    const like = screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like});
    const action = getActionWrapper(like);
    fireEvent.mouseEnter(action);
    const tooltip = screen.getByRole('tooltip', {name: AI_SUMMARY_MESSAGES.like});
    fireEvent.mouseLeave(like, {relatedTarget: tooltip});
    expect(tooltip).toBeVisible();
    fireEvent.mouseEnter(tooltip);
    expect(screen.getByRole('tooltip', {name: AI_SUMMARY_MESSAGES.like})).toBeVisible();
    fireEvent.mouseLeave(action);
    expect(screen.queryByRole('tooltip', {name: AI_SUMMARY_MESSAGES.like})).not.toBeInTheDocument();
  });

  it('dismisses action tooltips with Escape without moving focus', () => {
    const parentEscape = jest.fn();
    render(
      <div onKeyDown={parentEscape}>
        <AISummary
          mode="post-call"
          state="content"
          content={textContent}
          contentRevision={6}
          selectedFeedback="like"
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(true)}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
          onCopyVisualStateChange={jest.fn()}
        />
      </div>
    );

    const like = screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like});
    act(() => {
      like.focus();
    });
    expect(like).toHaveFocus();
    expect(screen.getByRole('tooltip', {name: AI_SUMMARY_MESSAGES.like})).toBeVisible();

    fireEvent.keyDown(like, {key: 'Escape'});
    expect(screen.queryByRole('tooltip', {name: AI_SUMMARY_MESSAGES.like})).not.toBeInTheDocument();
    expect(like).toHaveFocus();
    expect(parentEscape).not.toHaveBeenCalled();
  });

  it('dismisses hover tooltips with Escape while focus remains outside the summary', () => {
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
          onCopyVisualStateChange={jest.fn()}
        />
      </div>
    );
    const external = screen.getByRole('button', {name: 'External control'});
    act(() => external.focus());
    fireEvent.mouseEnter(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}));
    expect(screen.getByRole('tooltip')).toBeVisible();
    fireEvent.keyDown(external, {key: 'Escape'});
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(external).toHaveFocus();
    expect(parentEscape).not.toHaveBeenCalled();

    fireEvent.keyDown(external, {key: 'Escape'});
    expect(parentEscape).toHaveBeenCalledTimes(1);
    fireEvent.mouseEnter(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}));
    unmount();
    expect(fireEvent.keyDown(document.body, {key: 'Escape'})).toBe(true);
  });

  it('gates mid-call selected feedback on confirmed async result and preserves selection on failure', async () => {
    const onFeedback = jest
      .fn()
      .mockResolvedValueOnce({outcome: 'failed'})
      .mockResolvedValueOnce({outcome: 'confirmed'});
    render(
      <AISummary
        mode="mid-call-initiator"
        state="content"
        content={textContent}
        contentRevision={9}
        selectedFeedback="none"
        actionType="TRANSFER"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={onFeedback}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike}));
    await waitFor(() => expect(onFeedback).toHaveBeenCalledWith('dislike', 'TRANSFER', 9));
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike})).not.toHaveClass(
      'ai-summary__feedback-button--selected'
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike}));
    await waitFor(() =>
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike})).toHaveClass(
        'ai-summary__feedback-button--selected'
      )
    );
  });

  it('contains synchronous feedback and Retry throws without changing selection', async () => {
    const failures = trackWindowFailures();
    try {
      const {unmount} = render(
        <AISummary
          mode="post-call"
          state="content"
          content={textContent}
          contentRevision={25}
          selectedFeedback="dislike"
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn(() => {
            throw new Error('post-call feedback failed');
          })}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
          onCopyVisualStateChange={jest.fn()}
        />
      );

      expect(() => fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}))).not.toThrow();
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).not.toHaveClass(
        'ai-summary__feedback-button--selected'
      );
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike})).toHaveClass(
        'ai-summary__feedback-button--selected'
      );
      unmount();

      const midCall = render(
        <AISummary
          mode="mid-call-initiator"
          state="content"
          content={textContent}
          contentRevision={26}
          selectedFeedback="dislike"
          actionType="TRANSFER"
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn(() => {
            throw new Error('mid-call feedback failed');
          })}
        />
      );

      expect(() => fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}))).not.toThrow();
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).not.toHaveClass(
        'ai-summary__feedback-button--selected'
      );
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike})).toHaveClass(
        'ai-summary__feedback-button--selected'
      );
      midCall.unmount();

      render(
        <AISummary
          mode="post-call"
          state="generic-error"
          content={textContent}
          contentRevision={27}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(false)}
          onRetry={jest.fn(() => {
            throw new Error('retry failed');
          })}
          onCopyVisualStateChange={jest.fn()}
        />
      );

      expect(() => fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.retry}))).not.toThrow();
      await flushSettledCallbacks();
      failures.assertNone();
    } finally {
      failures.cleanup();
    }
  });

  it('normalizes non-thenable feedback and Retry returns', async () => {
    const failures = trackWindowFailures();
    try {
      const {unmount} = render(
        <AISummary
          mode="mid-call-initiator"
          state="content"
          content={textContent}
          contentRevision={28}
          selectedFeedback="none"
          actionType="CONSULT"
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue({outcome: 'confirmed'})}
        />
      );

      fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}));
      await waitFor(() =>
        expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).toHaveClass(
          'ai-summary__feedback-button--selected'
        )
      );
      unmount();

      render(
        <AISummary
          mode="post-call"
          state="generic-error"
          content={textContent}
          contentRevision={29}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(false)}
          onRetry={jest.fn().mockReturnValue({outcome: 'blocked'})}
          onCopyVisualStateChange={jest.fn()}
        />
      );

      expect(() => fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.retry}))).not.toThrow();
      await flushSettledCallbacks();
      failures.assertNone();
    } finally {
      failures.cleanup();
    }
  });

  it('settles rejected Retry callbacks without a window error or selection churn', async () => {
    const failures = trackWindowFailures();
    try {
      const onRetry = jest.fn().mockRejectedValue(new Error('retry rejected'));
      render(
        <AISummary
          mode="post-call"
          state="generic-error"
          content={textContent}
          contentRevision={50}
          selectedFeedback="dislike"
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(false)}
          onRetry={onRetry}
          onCopyVisualStateChange={jest.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.retry}));
      await flushSettledCallbacks();

      expect(onRetry).toHaveBeenCalledTimes(1);
      failures.assertNone();
    } finally {
      failures.cleanup();
    }
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
        onCopyVisualStateChange={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: LITERAL_SUMMARY_COPY.retry}));
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
        onCopyVisualStateChange={jest.fn()}
      />
    );

    expect(screen.queryByRole('button', {name: LITERAL_SUMMARY_COPY.retry})).not.toBeInTheDocument();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('preserves feedback selection for rejected and malformed callback results', async () => {
    const failures = trackWindowFailures();
    try {
      const {unmount} = render(
        <AISummary
          mode="post-call"
          state="content"
          content={textContent}
          contentRevision={30}
          selectedFeedback="dislike"
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockImplementation(() => Promise.reject(new Error('post-call rejected')))}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
          onCopyVisualStateChange={jest.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}));
      await flushSettledCallbacks();
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).not.toHaveClass(
        'ai-summary__feedback-button--selected'
      );
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike})).toHaveClass(
        'ai-summary__feedback-button--selected'
      );
      unmount();

      const rejectedMidCall = render(
        <AISummary
          mode="mid-call-initiator"
          state="content"
          content={textContent}
          contentRevision={31}
          selectedFeedback="dislike"
          actionType="TRANSFER"
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockRejectedValue(new Error('mid-call rejected'))}
        />
      );

      fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}));
      await flushSettledCallbacks();
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).not.toHaveClass(
        'ai-summary__feedback-button--selected'
      );
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike})).toHaveClass(
        'ai-summary__feedback-button--selected'
      );
      rejectedMidCall.unmount();

      render(
        <AISummary
          mode="mid-call-initiator"
          state="content"
          content={textContent}
          contentRevision={32}
          selectedFeedback="dislike"
          actionType="TRANSFER"
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockResolvedValue(undefined)}
        />
      );

      fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}));
      await flushSettledCallbacks();
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).not.toHaveClass(
        'ai-summary__feedback-button--selected'
      );
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike})).toHaveClass(
        'ai-summary__feedback-button--selected'
      );
      failures.assertNone();
    } finally {
      failures.cleanup();
    }
  });

  it('ignores stale mid-call feedback confirmations after content replacement', async () => {
    const feedback = createDeferred<{outcome: 'confirmed'}>();
    const onFeedback = jest.fn().mockReturnValue(feedback.promise);
    const {rerender} = render(
      <AISummary
        mode="mid-call-initiator"
        state="content"
        content={textContent}
        contentRevision={33}
        selectedFeedback="none"
        actionType="TRANSFER"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={onFeedback}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}));
    expect(onFeedback).toHaveBeenCalledWith('like', 'TRANSFER', 33);

    rerender(
      <AISummary
        mode="mid-call-initiator"
        state="content"
        content={{type: 'text', summaryText: 'Replacement summary'}}
        contentRevision={34}
        selectedFeedback="none"
        actionType="TRANSFER"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={onFeedback}
      />
    );

    await act(async () => {
      feedback.resolve({outcome: 'confirmed'});
      await feedback.promise;
    });
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).not.toHaveClass(
      'ai-summary__feedback-button--selected'
    );
  });

  it('allows only the latest mid-call feedback attempt to paint', async () => {
    const firstFeedback = createDeferred<{outcome: 'confirmed'}>();
    const secondFeedback = createDeferred<{outcome: 'confirmed'}>();
    const onFeedback = jest.fn().mockReturnValueOnce(firstFeedback.promise).mockReturnValueOnce(secondFeedback.promise);
    render(
      <AISummary
        mode="mid-call-initiator"
        state="content"
        content={textContent}
        contentRevision={35}
        selectedFeedback="none"
        actionType="TRANSFER"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={onFeedback}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}));
    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike}));

    await act(async () => {
      firstFeedback.resolve({outcome: 'confirmed'});
      await firstFeedback.promise;
    });
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).not.toHaveClass(
      'ai-summary__feedback-button--selected'
    );
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike})).not.toHaveClass(
      'ai-summary__feedback-button--selected'
    );

    await act(async () => {
      secondFeedback.resolve({outcome: 'confirmed'});
      await secondFeedback.promise;
    });
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.dislike})).toHaveClass(
      'ai-summary__feedback-button--selected'
    );
  });

  it('settles mid-call feedback confirmation after unmount without a window error', async () => {
    const failures = trackWindowFailures();
    try {
      const feedback = createDeferred<{outcome: 'confirmed'}>();
      const {unmount} = render(
        <AISummary
          mode="mid-call-initiator"
          state="content"
          content={textContent}
          contentRevision={36}
          selectedFeedback="none"
          actionType="TRANSFER"
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(feedback.promise)}
        />
      );

      fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like}));
      unmount();
      await act(async () => {
        feedback.resolve({outcome: 'confirmed'});
        await feedback.promise;
      });
      failures.assertNone();
    } finally {
      failures.cleanup();
    }
  });

  it('uses synchronous receiver copy text without card JSON or editable content props', async () => {
    const getReceiverCopyText = jest.fn().mockReturnValue('Visible card text');
    const onCopy = jest.fn().mockReturnValue(true);
    render(
      <AISummary
        mode="mid-call-receiver"
        state="content"
        contentRevision={10}
        actionType="TRANSFER"
        getReceiverCopyText={getReceiverCopyText}
        onCopy={onCopy}
        onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith(10));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Visible card text');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it.each(['generating', 'unavailable', 'generic-error'] as const)('omits receiver actions for %s state', (state) => {
    render(<AISummary mode="mid-call-receiver" state={state} />);

    expect(screen.queryByTestId('ai-summary:actions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: AI_SUMMARY_MESSAGES.like})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: AI_SUMMARY_MESSAGES.dislike})).not.toBeInTheDocument();
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
          actionType="TRANSFER"
          containingPanelFocusTarget={panelRef}
          getReceiverCopyText={() => 'Visible card text'}
          onCopy={jest.fn().mockReturnValue(true)}
          onFeedback={jest.fn().mockResolvedValue({outcome: 'confirmed'})}
        />
      </div>
    );

    act(() => {
      screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}).focus();
    });
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toHaveFocus();

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
      type: 'sections',
      sections: [
        {key: 'initialContactReason', value: 'Summary value', editable: true},
        {key: 'nextSteps', value: 'Follow-up value', editable: true},
      ],
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
          onCopyVisualStateChange={jest.fn()}
        />
      </div>
    );

    const summaryPreview = screen.getByRole('button', {
      name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
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
            type: 'sections',
            sections: [{key: 'nextSteps', value: 'Follow-up value', editable: true}],
          }}
          contentRevision={52}
          containingPanelFocusTarget={panelRef}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(true)}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
          onCopyVisualStateChange={jest.fn()}
        />
      </div>
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.nextSteps),
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
            type: 'sections',
            sections: [{key: 'nextSteps', value: 'Follow-up value', editable: true}],
          }}
          contentRevision={53}
          containingPanelFocusTarget={panelRef}
          onEdit={jest.fn()}
          onCopy={jest.fn()}
          onFeedback={jest.fn().mockReturnValue(true)}
          onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
          onCopyVisualStateChange={jest.fn()}
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
        onCopyVisualStateChange={jest.fn()}
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
        content={{type: 'text', summaryText: 'Updated while focus remains on Like.'}}
        contentRevision={55}
        selectedFeedback="like"
        onEdit={jest.fn()}
        onCopy={jest.fn()}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onCopyVisualStateChange={jest.fn()}
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
        onCopyVisualStateChange={jest.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    );
    const editor = screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason});
    act(() => {
      editor.focus();
    });
    expect(editor).toHaveFocus();

    fireEvent.blur(editor, {relatedTarget: null});

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.nextSteps),
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
          onCopyVisualStateChange={jest.fn()}
        />
        <button type="button">External destination</button>
      </div>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    );
    const editor = screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason});
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
              actionType="TRANSFER"
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
      screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}).focus();
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

  it('keeps Complete Wrap-Up label stable across copy states', async () => {
    render(
      <AISummary
        mode="post-call"
        state="content"
        content={textContent}
        contentRevision={12}
        onEdit={jest.fn()}
        onCopy={jest.fn().mockReturnValue(true)}
        onFeedback={jest.fn().mockReturnValue(true)}
        onRetry={jest.fn().mockResolvedValue({outcome: 'blocked'})}
        onComplete={jest.fn()}
        onCopyVisualStateChange={jest.fn()}
      />
    );

    const complete = screen.getByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    expect(complete).toHaveTextContent(COMPLETE_WRAP_UP_LABEL);
    expect(complete).toHaveAttribute('title', COMPLETE_WRAP_UP_LABEL);
    fireEvent.mouseEnter(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    expect(complete).toHaveTextContent(COMPLETE_WRAP_UP_LABEL);
    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary}));
    await waitFor(() =>
      expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toBeInTheDocument()
    );
    expect(complete).toHaveTextContent(COMPLETE_WRAP_UP_LABEL);
  });
});
