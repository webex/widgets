import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Icon} from '@momentum-design/components/dist/react';
import type {
  AISummaryContent,
  AISummaryDisplaySection,
  AISummaryDisplaySectionKey,
  AISummaryEditableField,
  AISummaryFeedback,
  AISummarySectionKey,
} from '@webex/cc-store';
import {
  AI_SUMMARY_MESSAGES,
  COPIED_FEEDBACK_MS,
  MID_CALL_SECTION_DEFINITIONS,
  POST_CALL_DISPLAY_SECTION_ORDER,
  POST_CALL_SECTION_DEFINITIONS,
} from './ai-summary.constants';
import type {
  AISummaryCopyVisualState,
  AISummaryEditorProps,
  AISummaryProps,
  AISummarySectionEditorProps,
} from './ai-summary.types';
import './ai-summary.styles.scss';

type AISummaryTooltipControl = 'copy' | 'like' | 'dislike';

const useReactId = (React as typeof React & {useId: () => string}).useId;

const postCallOrdinal = new Map<AISummaryDisplaySectionKey, number>(
  POST_CALL_DISPLAY_SECTION_ORDER.map((key, index) => [key, index])
);

const BULLETED_SECTION_KEYS = new Set<AISummaryDisplaySectionKey>([
  'additionalContactReasons',
  'keyActionsTaken',
  'nextSteps',
]);

const isSelectableFeedback = (value: AISummaryFeedback): value is Exclude<AISummaryFeedback, 'none'> =>
  value === 'like' || value === 'dislike';

const isConfirmedFeedbackResult = (result: unknown): boolean =>
  typeof result === 'object' && result !== null && (result as {outcome?: unknown}).outcome === 'confirmed';

const settleCallbackResult = (result: unknown, onFulfilled: (value: unknown) => void): void => {
  void Promise.resolve(result)
    .then(onFulfilled)
    .catch(() => undefined);
};

const getSectionOrdinal = (key: AISummaryDisplaySectionKey): number =>
  postCallOrdinal.get(key) ?? Number.MAX_SAFE_INTEGER;

const SECTION_LABELS = new Map<AISummaryDisplaySectionKey, string>([
  ...MID_CALL_SECTION_DEFINITIONS.map((definition) => [definition.key, definition.label] as const),
  ...POST_CALL_SECTION_DEFINITIONS.map((definition) => [definition.key, definition.label] as const),
  ['resolution', AI_SUMMARY_MESSAGES.sectionLabels.resolution],
]);

const getAISummarySectionLabel = (section: Pick<AISummaryDisplaySection, 'key'>): string =>
  SECTION_LABELS.get(section.key) ?? section.key;

export const projectPostCallDisplaySections = (content: AISummaryContent): AISummaryDisplaySection[] => {
  if (content.type !== 'sections') {
    return [];
  }
  const sections = [...content.sections];
  const resolution = content.resolution;
  if (typeof resolution !== 'string' || resolution.trim().length === 0) {
    return sections;
  }
  const outcome: AISummaryDisplaySection = {
    key: 'resolution',
    value: resolution,
    editable: false,
  };
  const outcomeOrdinal = getSectionOrdinal('resolution');
  const insertionIndex = sections.findIndex((section) => getSectionOrdinal(section.key) > outcomeOrdinal);
  if (insertionIndex < 0) {
    return [...sections, outcome];
  }
  return [...sections.slice(0, insertionIndex), outcome, ...sections.slice(insertionIndex)];
};

const flattenContentForCopy = (content: AISummaryContent): string => {
  if (content.type === 'text') {
    return content.summaryText;
  }
  if (content.type === 'card') {
    return '';
  }
  return projectPostCallDisplaySections(content)
    .filter((section) => section.value.trim().length > 0)
    .map((section) => `${getAISummarySectionLabel(section)}: ${section.value}`)
    .join('\n\n');
};

const splitDisplayLines = (value: string): string[] => value.split('\n').filter((line) => line.trim().length > 0);

const stripBulletMarker = (line: string): string => line.trim().replace(/^(?:\u2022|[-*])\s*/, '');

const renderReadonlyValue = (section: AISummaryDisplaySection, inline = false) => {
  const lines = splitDisplayLines(section.value);
  if (BULLETED_SECTION_KEYS.has(section.key) && lines.length > 1) {
    const List = inline ? 'span' : 'ul';
    const Item = inline ? 'span' : 'li';
    return (
      <List className="ai-summary__readonly-list" role={inline ? 'list' : undefined} dir="auto">
        {lines.map((line, index) => (
          <Item key={`${section.key}-${index}`} role={inline ? 'listitem' : undefined} dir="auto">
            {stripBulletMarker(line)}
          </Item>
        ))}
      </List>
    );
  }

  return (
    <span className="ai-summary__readonly-value" dir="auto">
      {section.value}
    </span>
  );
};

// Keep keyed, controlled edits inside one visual surface. Never parse edited labels
// back into SDK keys or introduce a second scrollbar inside the containing panel.
const SummaryEditor: React.FC<AISummaryEditorProps> = ({value, ...props}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const editor = ref.current;
    if (!editor) return;
    const resize = () => {
      if (!editor.isConnected) return;
      editor.style.height = 'auto';
      editor.style.height = `${editor.scrollHeight}px`;
    };
    resize();
    void document.fonts?.ready.then(resize, () => undefined);
    document.fonts?.addEventListener('loadingdone', resize);
    let width = editor.clientWidth;
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(() => {
            if (editor.clientWidth !== width) {
              width = editor.clientWidth;
              resize();
            }
          });
    observer?.observe(editor);
    return () => {
      observer?.disconnect();
      document.fonts?.removeEventListener('loadingdone', resize);
    };
  }, [value]);
  return <textarea {...props} ref={ref} rows={1} value={value} />;
};

const getEnabledControls = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]')).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-disabled') !== 'true' &&
      element.tabIndex >= 0 &&
      element.isConnected
  );

// Display the structured document compactly; activate the original keyed native
// editor on click/keyboard activation. SDK values remain plain text and unchanged.
const SummarySectionEditor: React.FC<AISummarySectionEditorProps> = ({section, disabled, onChange, onEditorBlur}) => {
  const [editing, setEditing] = useState(false);
  const sectionLabel = getAISummarySectionLabel(section);
  if (editing && !disabled) {
    return (
      <label className="ai-summary__section ai-summary__section--structured">
        <span className="ai-summary__label" dir="auto">
          {sectionLabel}
        </span>
        <SummaryEditor
          className="ai-summary__textarea"
          dir="auto"
          value={section.value}
          autoFocus
          onChange={(event) => onChange(event.currentTarget.value)}
          onBlur={() => {
            setEditing(false);
            onEditorBlur();
          }}
        />
      </label>
    );
  }
  return (
    <button
      type="button"
      className="ai-summary__section-preview"
      aria-label={AI_SUMMARY_MESSAGES.editSectionLabel(sectionLabel)}
      aria-description={section.value}
      disabled={disabled}
      onClick={() => setEditing(true)}
    >
      <span className="ai-summary__label" dir="auto">
        {sectionLabel}:
      </span>{' '}
      {renderReadonlyValue(section, true)}
    </button>
  );
};

const AISummary = (props: AISummaryProps): React.ReactElement => {
  const rootRef = useRef<HTMLDivElement>(null);
  const focusedControlRef = useRef<HTMLElement | null>(null);
  const successorRef = useRef<HTMLElement | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const copyAttemptRef = useRef(0);
  const feedbackAttemptRef = useRef(0);
  const contentRevisionRef = useRef<number | undefined>(undefined);
  const resetRevisionRef = useRef<number | undefined>(undefined);
  const resetRevisionInitializedRef = useRef(false);
  const [copyVisualState, setCopyVisualState] = useState<AISummaryCopyVisualState>('idle');
  const copyVisualStateRef = useRef<AISummaryCopyVisualState>('idle');
  const [hoveredTooltip, setHoveredTooltip] = useState<AISummaryTooltipControl | null>(null);
  const [localFeedback, setLocalFeedback] = useState<AISummaryFeedback>(props.selectedFeedback ?? 'none');
  const [, scheduleFocusRestoration] = useState(0);
  const feedbackDescriptionId = `ai-summary-feedback-${useReactId()}`;

  const contentRevision = 'contentRevision' in props ? props.contentRevision : undefined;
  contentRevisionRef.current = contentRevision;
  copyVisualStateRef.current = copyVisualState;
  const disabled = Boolean(props.controlsDisabled || props.requestPending);
  const feedbackStatus = props.mode === 'post-call' ? props.feedbackStatus : undefined;

  const setCopyState = (state: AISummaryCopyVisualState) => {
    copyVisualStateRef.current = state;
    setCopyVisualState(state);
    if (props.mode === 'post-call') {
      props.onCopyVisualStateChange(state);
    }
  };

  const clearCopiedTimer = () => {
    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = null;
    }
  };

  const resetCopiedState = () => {
    clearCopiedTimer();
    if (copyVisualStateRef.current === 'idle') {
      return;
    }
    setCopyState('idle');
  };

  const isCurrentCopyAttempt = (attempt: number, revision: number): boolean =>
    mountedRef.current && copyAttemptRef.current === attempt && contentRevisionRef.current === revision;

  const isCurrentFeedbackAttempt = (attempt: number, revision: number): boolean =>
    mountedRef.current && feedbackAttemptRef.current === attempt && contentRevisionRef.current === revision;

  const clearFocusSnapshot = () => {
    focusedControlRef.current = null;
    successorRef.current = null;
  };

  const handleLocalControlRemoval = () => {
    scheduleFocusRestoration((revision) => revision + 1);
  };

  useEffect(() => {
    setLocalFeedback(props.selectedFeedback ?? 'none');
  }, [props.selectedFeedback, contentRevision]);

  useEffect(() => {
    if (hoveredTooltip === null) {
      return undefined;
    }
    const dismissTooltip = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setHoveredTooltip(null);
      }
    };
    // Hover does not move focus into the summary. Capture Escape at the document
    // while a tooltip is visible so the same dismissal works from any focus target.
    document.addEventListener('keydown', dismissTooltip, true);
    return () => document.removeEventListener('keydown', dismissTooltip, true);
  }, [hoveredTooltip]);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      copyAttemptRef.current += 1;
      feedbackAttemptRef.current += 1;
      clearCopiedTimer();
    };
  }, []);

  useLayoutEffect(() => {
    if (!resetRevisionInitializedRef.current) {
      resetRevisionInitializedRef.current = true;
      resetRevisionRef.current = contentRevision;
      return;
    }
    if (resetRevisionRef.current === contentRevision) {
      return;
    }
    resetRevisionRef.current = contentRevision;
    copyAttemptRef.current += 1;
    feedbackAttemptRef.current += 1;
    resetCopiedState();
  }, [contentRevision]);

  useLayoutEffect(() => {
    const focused = focusedControlRef.current;
    if (!focused || focused.isConnected) {
      return;
    }
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body && activeElement.isConnected) {
      clearFocusSnapshot();
      return;
    }
    const successor = successorRef.current;
    if (successor?.isConnected) {
      successor.focus();
      clearFocusSnapshot();
      return;
    }
    props.containingPanelFocusTarget.current?.focus();
    clearFocusSnapshot();
  });

  const renderedSections = useMemo(() => {
    if (!('content' in props) || !props.content || props.content.type !== 'sections') {
      return [];
    }
    return props.mode === 'post-call' ? projectPostCallDisplaySections(props.content) : props.content.sections;
  }, [props]);

  const copyText = () => {
    if (props.mode === 'mid-call-receiver' && props.state === 'content') {
      return props.getReceiverCopyText();
    }
    if (props.mode === 'mid-call-receiver') {
      return '';
    }
    return flattenContentForCopy(props.content);
  };

  const getCopyTextForClipboard = (): string | undefined => {
    try {
      const text = copyText();
      return text.trim().length === 0 ? undefined : text;
    } catch {
      return undefined;
    }
  };

  const handleFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const controls = rootRef.current ? getEnabledControls(rootRef.current) : [];
    const index = controls.indexOf(target);
    focusedControlRef.current = target;
    successorRef.current =
      index >= 0 ? (controls.slice(index + 1).find((control) => control !== target) ?? null) : null;
  };

  const handleBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    const root = rootRef.current;
    if (
      relatedTarget instanceof HTMLElement &&
      relatedTarget !== document.body &&
      relatedTarget.isConnected &&
      root &&
      !root.contains(relatedTarget)
    ) {
      clearFocusSnapshot();
    }
  };

  const handleCopy = () => {
    if (disabled || contentRevision === undefined) {
      return;
    }
    const text = getCopyTextForClipboard();
    if (text === undefined) {
      return;
    }
    let writeResult: unknown;
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard?.writeText) {
        return;
      }
      writeResult = clipboard.writeText(text);
    } catch {
      return;
    }
    const copyRevision = contentRevision;
    const copyAttempt = copyAttemptRef.current + 1;
    copyAttemptRef.current = copyAttempt;
    setHoveredTooltip(null);
    resetCopiedState();
    Promise.resolve(writeResult).then(
      () => {
        if (!isCurrentCopyAttempt(copyAttempt, copyRevision)) {
          return;
        }
        let accepted = false;
        try {
          accepted = props.onCopy(copyRevision);
        } catch {
          accepted = false;
        }
        if (!accepted || !isCurrentCopyAttempt(copyAttempt, copyRevision)) {
          return;
        }
        setCopyState('confirmed');
        clearCopiedTimer();
        copiedTimerRef.current = setTimeout(() => {
          if (!isCurrentCopyAttempt(copyAttempt, copyRevision)) {
            return;
          }
          copiedTimerRef.current = null;
          resetCopiedState();
        }, COPIED_FEEDBACK_MS);
      },
      () => undefined
    );
  };

  const handleFeedback = (feedback: Exclude<AISummaryFeedback, 'none'>) => {
    if (disabled || contentRevision === undefined) {
      return;
    }
    const feedbackRevision = contentRevision;
    const feedbackAttempt = feedbackAttemptRef.current + 1;
    feedbackAttemptRef.current = feedbackAttempt;
    if (props.mode === 'post-call') {
      let accepted: unknown;
      try {
        accepted = props.onFeedback(feedback, feedbackRevision);
      } catch {
        return;
      }
      if (accepted === true) {
        setLocalFeedback(feedback);
        return;
      }
      settleCallbackResult(accepted, (settledAccepted) => {
        if (settledAccepted === true && isCurrentFeedbackAttempt(feedbackAttempt, feedbackRevision)) {
          setLocalFeedback(feedback);
        }
      });
      return;
    }
    if (props.mode === 'mid-call-receiver' && props.state !== 'content') {
      return;
    }
    let feedbackResult: unknown;
    try {
      feedbackResult = props.onFeedback(feedback, props.actionType, feedbackRevision);
    } catch {
      return;
    }
    settleCallbackResult(feedbackResult, (result) => {
      if (isCurrentFeedbackAttempt(feedbackAttempt, feedbackRevision) && isConfirmedFeedbackResult(result)) {
        setLocalFeedback(feedback);
      }
    });
  };

  const handleRetry = () => {
    if (props.mode !== 'post-call' || disabled) {
      return;
    }
    let retryResult: unknown;
    try {
      retryResult = props.onRetry();
    } catch {
      return;
    }
    settleCallbackResult(retryResult, () => undefined);
  };

  const renderStatus = () => {
    if (props.state === 'generating') {
      return (
        <div className="ai-summary__status" data-testid="ai-summary:generating">
          <h3 className="ai-summary__status-title ai-summary__status-title--generating">
            {AI_SUMMARY_MESSAGES.generatingTitle}
          </h3>
          <p className="ai-summary__description">{AI_SUMMARY_MESSAGES.generatingDescription}</p>
          <span className="ai-summary__spinner" aria-hidden="true" />
        </div>
      );
    }
    if (props.state === 'unavailable') {
      return (
        <div className="ai-summary__status" data-testid="ai-summary:unavailable">
          <p className="ai-summary__description">{AI_SUMMARY_MESSAGES.unavailable}</p>
        </div>
      );
    }
    if (props.state === 'generic-error') {
      return (
        <div className="ai-summary__status" data-testid="ai-summary:error">
          <Icon name="error-legacy-regular" className="ai-summary__error-icon" aria-hidden="true" />
          <h3 className="ai-summary__status-title ai-summary__status-title--error">
            {AI_SUMMARY_MESSAGES.generationError}
          </h3>
          <p className="ai-summary__description">{AI_SUMMARY_MESSAGES.generationErrorDescription}</p>
          {props.mode === 'post-call' ? (
            <button className="ai-summary__button" type="button" disabled={disabled} onClick={handleRetry}>
              <Icon name="refresh-regular" aria-hidden="true" />
              {AI_SUMMARY_MESSAGES.retry}
            </button>
          ) : null}
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    if (props.state !== 'content' || props.mode === 'mid-call-receiver') {
      return null;
    }
    if (props.content.type === 'text') {
      return (
        <div className="ai-summary__content" data-testid="ai-summary:content">
          <label className="ai-summary__section">
            <span className="ai-summary__sr-only">{AI_SUMMARY_MESSAGES.plainSummary}</span>
            <SummaryEditor
              className="ai-summary__textarea"
              dir="auto"
              value={props.content.summaryText}
              disabled={disabled}
              onChange={(event) =>
                props.onEdit(
                  {key: 'summaryText', value: event.currentTarget.value} satisfies AISummaryEditableField,
                  props.contentRevision
                )
              }
            />
          </label>
        </div>
      );
    }
    return (
      <div className="ai-summary__content" data-testid="ai-summary:content">
        {renderedSections.map((section) =>
          section.editable ? (
            <SummarySectionEditor
              key={section.key}
              section={section}
              disabled={disabled}
              onChange={(value) =>
                props.onEdit({key: section.key as AISummarySectionKey, value}, props.contentRevision)
              }
              onEditorBlur={handleLocalControlRemoval}
            />
          ) : (
            <div className="ai-summary__section ai-summary__section--structured" key={section.key}>
              <div className="ai-summary__readonly">
                <span className="ai-summary__label" dir="auto">
                  {getAISummarySectionLabel(section)}
                </span>
                {renderReadonlyValue(section)}
              </div>
            </div>
          )
        )}
      </div>
    );
  };

  const feedbackDescription =
    props.mode === 'post-call' && feedbackStatus === 'pending'
      ? AI_SUMMARY_MESSAGES.feedback.pendingSubmission
      : props.mode === 'post-call' && feedbackStatus === 'not-confirmed'
        ? AI_SUMMARY_MESSAGES.feedback.submissionNotConfirmed
        : undefined;

  const showActions = props.state === 'content';
  const showSummaryHeading = props.mode === 'post-call' && props.state === 'content';
  const copyLabel =
    copyVisualState === 'confirmed' ? AI_SUMMARY_MESSAGES.copiedSummary : AI_SUMMARY_MESSAGES.copySummary;
  const renderTooltip = (control: AISummaryTooltipControl, label: string) =>
    hoveredTooltip === control ? (
      <span className="ai-summary__tooltip" role="tooltip">
        {label}
      </span>
    ) : null;
  const getActionClassName = (control: AISummaryTooltipControl, extraClassName?: string) =>
    ['ai-summary__action', hoveredTooltip === control ? 'ai-summary__action--tooltip-open' : undefined, extraClassName]
      .filter(Boolean)
      .join(' ');
  const handleCopyActionMouseEnter = () => {
    // Confirmation changes the button width and can retrigger pointer entry.
    // Hover must not erase a successful copy.
    if (disabled || copyVisualState === 'confirmed') {
      return;
    }
    setCopyState('hover');
    setHoveredTooltip('copy');
  };
  const handleCopyActionMouseLeave = () => {
    if (copyVisualState === 'hover') {
      setCopyState('idle');
    }
    if (hoveredTooltip === 'copy') {
      setHoveredTooltip(null);
    }
  };
  const handleFeedbackActionMouseEnter = (feedback: Exclude<AISummaryTooltipControl, 'copy'>) => {
    if (disabled || feedbackStatus === 'not-confirmed') {
      return;
    }
    setHoveredTooltip(feedback);
  };
  const handleActionMouseLeave = (control: AISummaryTooltipControl) => {
    if (hoveredTooltip === control) {
      setHoveredTooltip(null);
    }
  };

  return (
    <section
      className="ai-summary"
      data-testid={`ai-summary:${props.mode}`}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      ref={rootRef}
    >
      {renderStatus()}
      {showSummaryHeading ? (
        <div className="ai-summary__summary-heading">
          <Icon name="sparkle-filled" className="ai-summary__summary-sparkle" aria-hidden="true" />
          <span>{AI_SUMMARY_MESSAGES.postCall.summaryHeading}</span>
          <Icon name="info-circle-filled" className="ai-summary__summary-info" aria-hidden="true" />
        </div>
      ) : null}
      <div className={showActions ? 'ai-summary__editor-surface' : undefined} data-testid="ai-summary:editor-surface">
        {renderContent()}
        {showActions ? (
          <div className="ai-summary__actions" data-testid="ai-summary:actions">
            <span
              className={getActionClassName('copy')}
              onMouseEnter={handleCopyActionMouseEnter}
              onMouseLeave={handleCopyActionMouseLeave}
            >
              <button
                className={`ai-summary__button ai-summary__copy-button${
                  copyVisualState === 'confirmed' ? ' ai-summary__copy-button--confirmed' : ''
                }`}
                type="button"
                disabled={disabled}
                onFocus={() => setHoveredTooltip('copy')}
                onBlur={() => {
                  setHoveredTooltip(null);
                  if (copyVisualState === 'confirmed') {
                    resetCopiedState();
                  }
                }}
                onClick={handleCopy}
                aria-label={AI_SUMMARY_MESSAGES.copySummary}
              >
                <Icon name={copyVisualState === 'confirmed' ? 'check-bold' : 'copy-regular'} aria-hidden="true" />
                <span className="ai-summary__sr-only">{copyLabel}</span>
              </button>
              {renderTooltip('copy', AI_SUMMARY_MESSAGES.copySummary)}
            </span>
            {props.mode !== 'mid-call-receiver' ? (
              <>
                <span className="ai-summary__actions-spacer" />
                <span className="ai-summary__attribution">{AI_SUMMARY_MESSAGES.attribution}</span>
                <span className="ai-summary__action-separator" aria-hidden="true" />
              </>
            ) : null}
            <span className="ai-summary__feedback-group">
              {(['like', 'dislike'] as const).map((feedback) => {
                const feedbackLabel = feedback === 'like' ? AI_SUMMARY_MESSAGES.like : AI_SUMMARY_MESSAGES.dislike;
                const selected = isSelectableFeedback(localFeedback) && localFeedback === feedback;

                return (
                  <span
                    className={getActionClassName(feedback, 'ai-summary__feedback-action')}
                    key={feedback}
                    onMouseEnter={() => handleFeedbackActionMouseEnter(feedback)}
                    onMouseLeave={() => handleActionMouseLeave(feedback)}
                  >
                    <button
                      className={`ai-summary__button ai-summary__feedback-button${
                        selected ? ' ai-summary__feedback-button--selected' : ''
                      }`}
                      type="button"
                      disabled={disabled || feedbackStatus === 'not-confirmed'}
                      onFocus={() => setHoveredTooltip(feedback)}
                      onBlur={() => setHoveredTooltip(null)}
                      onClick={() => handleFeedback(feedback)}
                      aria-label={feedbackLabel}
                      aria-pressed={selected}
                      aria-describedby={feedbackDescription ? feedbackDescriptionId : undefined}
                    >
                      <Icon name={`${feedback}-${selected ? 'filled' : 'regular'}`} aria-hidden="true" />
                    </button>
                    {renderTooltip(feedback, feedbackLabel)}
                  </span>
                );
              })}
            </span>
          </div>
        ) : null}
      </div>
      {feedbackDescription ? (
        <p className="ai-summary__feedback-status" id={feedbackDescriptionId}>
          {feedbackDescription}
        </p>
      ) : null}
      {props.mode === 'post-call' && props.onComplete ? (
        <div className="ai-summary__primary">
          <button
            className="ai-summary__button"
            type="button"
            disabled={disabled}
            onClick={props.onComplete}
            aria-label={AI_SUMMARY_MESSAGES.postCall.completeAction}
            title={AI_SUMMARY_MESSAGES.postCall.completeAction}
          >
            {AI_SUMMARY_MESSAGES.postCall.completeAction}
          </button>
        </div>
      ) : null}
    </section>
  );
};

export default AISummary;
