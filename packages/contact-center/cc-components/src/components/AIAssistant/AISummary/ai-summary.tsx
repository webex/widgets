import React, {useLayoutEffect, useRef, useState} from 'react';
import {Button, Icon, Spinner, Tooltip} from '@momentum-design/components/dist/react';
import {
  AI_ASSISTANT_SUMMARY_BULLETED_SECTION_KEYS,
  AI_ASSISTANT_SUMMARY_FEEDBACK_BUTTONS,
  AI_ASSISTANT_SUMMARY_MESSAGES,
} from './ai-summary.constants';
import {getDisplaySections, useAISummaryInteractions} from './ai-summary.hooks';
import type {
  AISummaryDisplaySection,
  AISummaryEditorProps,
  AISummaryProps,
  AISummarySectionEditorProps,
  AISummaryTooltipControl,
} from './ai-summary.types';
import './ai-summary.styles.scss';

const renderReadonlyValue = (section: AISummaryDisplaySection, inline = false) => {
  const lines = section.value.split('\n').filter((line) => line.trim().length > 0);
  if (AI_ASSISTANT_SUMMARY_BULLETED_SECTION_KEYS.has(section.key) && lines.length > 1) {
    const List = inline ? 'span' : 'ul';
    const Item = inline ? 'span' : 'li';
    return (
      <List className="ai-summary__readonly-list" role={inline ? 'list' : undefined} dir="auto">
        {lines.map((line, index) => (
          <Item key={`${section.key}-${index}`} role={inline ? 'listitem' : undefined} dir="auto">
            {line.trim().replace(/^(?:\u2022|[-*])\s*/, '')}
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

// Display the structured document compactly; activate the original keyed native
// editor on click/keyboard activation. SDK values remain plain text and unchanged.
const SummarySectionEditor: React.FC<AISummarySectionEditorProps> = ({section, disabled, onChange, onEditorBlur}) => {
  const [editing, setEditing] = useState(false);
  const label = AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels[section.key];
  if (editing && !disabled) {
    return (
      <label className="ai-summary__section ai-summary__section--structured">
        <span className="ai-summary__label" dir="auto">
          {label}
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
    <Button
      type="button"
      variant="tertiary"
      size={28}
      className="ai-summary__section-preview"
      aria-label={AI_ASSISTANT_SUMMARY_MESSAGES.editSectionLabel(label)}
      aria-description={section.value}
      disabled={disabled}
      onClick={() => setEditing(true)}
    >
      <span className="ai-summary__label" dir="auto">
        {label}:
      </span>{' '}
      {renderReadonlyValue(section, true)}
    </Button>
  );
};

const AISummary = (props: AISummaryProps): React.ReactElement => {
  const {
    rootRef,
    displayContent,
    copied,
    setCopied,
    hoveredTooltip,
    setHoveredTooltip,
    summaryId,
    feedbackDescriptionId,
    disabled,
    selectedFeedback,
    handleLocalControlRemoval,
    handleFocusCapture,
    handleBlurCapture,
    handleCopy,
    handleFeedback,
    handleActionMouseEnter,
    handleActionMouseLeave,
  } = useAISummaryInteractions(props);

  const renderStatus = () => {
    if (props.state === 'generating') {
      return (
        <div className="ai-summary__status" data-testid="ai-summary:generating">
          <h3 className="ai-summary__status-title ai-summary__status-title--generating">
            {AI_ASSISTANT_SUMMARY_MESSAGES.generatingTitle}
          </h3>
          <p className="ai-summary__description">{AI_ASSISTANT_SUMMARY_MESSAGES.generatingDescription}</p>
          <Spinner className="ai-summary__spinner" size="small" aria-hidden="true" />
        </div>
      );
    }
    if (props.state === 'unavailable') {
      return (
        <div className="ai-summary__status" data-testid="ai-summary:unavailable">
          <p className="ai-summary__description">{AI_ASSISTANT_SUMMARY_MESSAGES.unavailable}</p>
        </div>
      );
    }
    if (props.state === 'generic-error') {
      return (
        <div className="ai-summary__status" data-testid="ai-summary:error">
          <Icon name="error-legacy-regular" className="ai-summary__error-icon" aria-hidden="true" />
          <h3 className="ai-summary__status-title ai-summary__status-title--error">
            {AI_ASSISTANT_SUMMARY_MESSAGES.generationError}
          </h3>
          <p className="ai-summary__description">{AI_ASSISTANT_SUMMARY_MESSAGES.generationErrorDescription}</p>
          {props.mode === 'post-call' ? (
            <Button
              className="ai-summary__retry-button"
              type="button"
              variant="secondary"
              size={28}
              prefix-icon="refresh-regular"
              disabled={disabled}
              onClick={disabled ? undefined : () => void props.onRetry()}
            >
              {AI_ASSISTANT_SUMMARY_MESSAGES.retry}
            </Button>
          ) : null}
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    if (props.state !== 'content' || props.mode === 'mid-call-receiver' || !displayContent) {
      return null;
    }
    if (!displayContent.sections) {
      return (
        <div className="ai-summary__content" data-testid="ai-summary:content">
          <label className="ai-summary__section">
            <span className="ai-summary__sr-only">{AI_ASSISTANT_SUMMARY_MESSAGES.plainSummary}</span>
            <SummaryEditor
              className="ai-summary__textarea"
              dir="auto"
              value={displayContent.summaryText ?? ''}
              disabled={disabled}
              onChange={(event) => props.onEdit('summaryText', event.currentTarget.value)}
            />
          </label>
        </div>
      );
    }
    return (
      <div className="ai-summary__content" data-testid="ai-summary:content">
        {getDisplaySections(displayContent).map((section) => {
          const {key} = section;
          return key !== 'resolution' ? (
            <SummarySectionEditor
              key={key}
              section={section}
              disabled={disabled}
              onChange={(value) => props.onEdit(key, value)}
              onEditorBlur={handleLocalControlRemoval}
            />
          ) : (
            <div className="ai-summary__section ai-summary__section--structured" key={section.key}>
              <div className="ai-summary__readonly">
                <span className="ai-summary__label" dir="auto">
                  {AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels[section.key]}
                </span>
                {renderReadonlyValue(section)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Post-call feedback is only submitted with the final response after wrap-up.
  const feedbackDescription =
    props.mode === 'post-call' && selectedFeedback !== 'none'
      ? AI_ASSISTANT_SUMMARY_MESSAGES.feedback.pendingSubmission
      : undefined;

  const showActions = props.state === 'content';
  const showSummaryHeading = props.mode === 'post-call' && props.state === 'content';
  const copyLabel = copied ? AI_ASSISTANT_SUMMARY_MESSAGES.copiedSummary : AI_ASSISTANT_SUMMARY_MESSAGES.copySummary;
  // Keep visibility controlled so Escape dismisses the tooltip before the panel.
  // Existing button labels and the pending-feedback description remain authoritative.
  const renderTooltip = (control: AISummaryTooltipControl, label: string) =>
    hoveredTooltip === control ? (
      <Tooltip
        triggerID={`ai-summary-${summaryId}-${control}`}
        offset={0}
        placement="top"
        tooltipType="none"
        trigger="manual"
        visible
      >
        {label}
      </Tooltip>
    ) : null;
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
          <span>{AI_ASSISTANT_SUMMARY_MESSAGES.postCall.summaryHeading}</span>
          <Icon name="info-circle-filled" className="ai-summary__summary-info" aria-hidden="true" />
        </div>
      ) : null}
      <div className={showActions ? 'ai-summary__editor-surface' : undefined} data-testid="ai-summary:editor-surface">
        {renderContent()}
        {showActions ? (
          <div className="ai-summary__actions" data-testid="ai-summary:actions">
            <span
              className="ai-summary__action"
              onMouseEnter={() => handleActionMouseEnter('copy')}
              onMouseLeave={() => handleActionMouseLeave('copy')}
            >
              <button
                id={`ai-summary-${summaryId}-copy`}
                className={`ai-summary__button ai-summary__copy-button${
                  copied ? ' ai-summary__copy-button--confirmed' : ''
                }`}
                type="button"
                disabled={disabled}
                onFocus={() => setHoveredTooltip('copy')}
                onBlur={() => {
                  setHoveredTooltip(null);
                  setCopied(false);
                }}
                onClick={() => void handleCopy()}
                aria-label={AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}
              >
                <Icon name={copied ? 'check-bold' : 'copy-regular'} aria-hidden="true" />
                <span className="ai-summary__sr-only">{copyLabel}</span>
              </button>
              {renderTooltip('copy', AI_ASSISTANT_SUMMARY_MESSAGES.copySummary)}
            </span>
            {props.mode !== 'mid-call-receiver' ? (
              <>
                <span className="ai-summary__actions-spacer" />
                <span className="ai-summary__attribution">{AI_ASSISTANT_SUMMARY_MESSAGES.attribution}</span>
                <span className="ai-summary__action-separator" aria-hidden="true" />
              </>
            ) : null}
            <span className="ai-summary__feedback-group">
              {AI_ASSISTANT_SUMMARY_FEEDBACK_BUTTONS.map(({feedback, icon, label: feedbackLabel}) => {
                const selected = selectedFeedback === feedback;

                return (
                  <span
                    className="ai-summary__action ai-summary__feedback-action"
                    key={feedback}
                    onMouseEnter={() => handleActionMouseEnter(feedback)}
                    onMouseLeave={() => handleActionMouseLeave(feedback)}
                  >
                    <button
                      id={`ai-summary-${summaryId}-${feedback}`}
                      className={`ai-summary__button ai-summary__feedback-button${
                        selected ? ' ai-summary__feedback-button--selected' : ''
                      }`}
                      type="button"
                      disabled={disabled}
                      onFocus={() => setHoveredTooltip(feedback)}
                      onBlur={() => setHoveredTooltip(null)}
                      onClick={() => handleFeedback(feedback)}
                      aria-label={feedbackLabel}
                      aria-pressed={selected}
                      aria-describedby={feedbackDescription ? feedbackDescriptionId : undefined}
                    >
                      <Icon name={`${icon}-${selected ? 'filled' : 'regular'}`} aria-hidden="true" />
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
    </section>
  );
};

export default AISummary;
