import React, {useLayoutEffect, useRef, useState} from 'react';
import {Button, Icon, Spinner, Text, Textarea, Tooltip} from '@momentum-design/components/dist/react';
import {
  AI_ASSISTANT_SUMMARY_BULLETED_SECTION_KEYS,
  AI_ASSISTANT_SUMMARY_FEEDBACK_BUTTONS,
  AI_ASSISTANT_SUMMARY_MESSAGES,
  AI_ASSISTANT_SUMMARY_MODES,
} from './ai-summary.constants';
import {getDisplaySections, useAISummaryInteractions} from './helper';
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
    <Text tagname="span" className="ai-summary__readonly-value" dir="auto">
      {section.value}
    </Text>
  );
};

// Keep keyed, controlled edits inside one visual surface. Never parse edited labels
// back into SDK keys or introduce a second scrollbar inside the containing panel.
const SummaryEditor: React.FC<AISummaryEditorProps> = ({value, onChange, ...props}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(1);
  useLayoutEffect(() => {
    const measurement = ref.current;
    if (!measurement) return;
    const resize = () => {
      if (!measurement.isConnected) return;
      const lineHeight = Number.parseFloat(getComputedStyle(measurement).lineHeight);
      if (lineHeight > 0) {
        setRows(Math.max(1, Math.round(measurement.getBoundingClientRect().height / lineHeight)));
      }
    };
    resize();
    void document.fonts?.ready.then(resize, () => undefined);
    document.fonts?.addEventListener('loadingdone', resize);
    let width = measurement.clientWidth;
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(() => {
            if (measurement.clientWidth !== width) {
              width = measurement.clientWidth;
              resize();
            }
          });
    observer?.observe(measurement);
    return () => {
      observer?.disconnect();
      document.fonts?.removeEventListener('loadingdone', resize);
    };
  }, [value]);
  return (
    <div className="ai-summary__editor">
      <Textarea {...props} rows={rows} value={value} onInput={(event) => onChange(event.target.value)} />
      <div className="ai-summary__editor-measurement" dir="auto" aria-hidden="true" ref={ref}>
        {value}
        {'\u200b'}
      </div>
    </div>
  );
};

// Display the structured document compactly; activate the original keyed
// editor on click/keyboard activation. SDK values remain plain text and unchanged.
const SummarySectionEditor: React.FC<AISummarySectionEditorProps> = ({section, disabled, onChange, onEditorClosed}) => {
  const [editing, setEditing] = useState(false);
  useLayoutEffect(() => {
    if (!editing) onEditorClosed();
  }, [editing, onEditorClosed]);
  const label = AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels[section.key];
  if (editing && !disabled) {
    return (
      <div className="ai-summary__section ai-summary__section--structured">
        <SummaryEditor
          className="ai-summary__textarea"
          dir="auto"
          label={label}
          value={section.value}
          autoFocusOnMount
          onChange={onChange}
          onBlur={() => setEditing(false)}
        />
      </div>
    );
  }
  // Keep a cleared editor mounted until blur, then omit the empty preview row.
  if (!section.value.trim()) {
    return null;
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
      <Text tagname="span" className="ai-summary__label" dir="auto">
        {label}:
      </Text>{' '}
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
    restoreFocus,
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
          <Text tagname="h3" className="ai-summary__status-title ai-summary__status-title--generating">
            {AI_ASSISTANT_SUMMARY_MESSAGES.generatingTitle}
          </Text>
          <Text tagname="p" className="ai-summary__description">
            {AI_ASSISTANT_SUMMARY_MESSAGES.generatingDescription}
          </Text>
          <Spinner className="ai-summary__spinner" size="small" aria-hidden="true" />
        </div>
      );
    }
    if (props.state === 'unavailable' || (props.state === 'content' && !displayContent)) {
      return (
        <div className="ai-summary__status" data-testid="ai-summary:unavailable">
          <Text tagname="p" className="ai-summary__description">
            {AI_ASSISTANT_SUMMARY_MESSAGES.unavailable}
          </Text>
        </div>
      );
    }
    if (props.state === 'generic-error') {
      return (
        <div className="ai-summary__status" data-testid="ai-summary:error">
          <Icon name="error-legacy-regular" className="ai-summary__error-icon" aria-hidden="true" />
          <Text tagname="h3" className="ai-summary__status-title ai-summary__status-title--error">
            {AI_ASSISTANT_SUMMARY_MESSAGES.generationError}
          </Text>
          <Text tagname="p" className="ai-summary__description">
            {AI_ASSISTANT_SUMMARY_MESSAGES.generationErrorDescription}
          </Text>
          {props.mode === AI_ASSISTANT_SUMMARY_MODES.POST_CALL && props.onRetry ? (
            <Button
              className="ai-summary__retry-button"
              type="button"
              variant="secondary"
              size={28}
              prefix-icon="refresh-regular"
              disabled={disabled}
              onClick={disabled ? undefined : () => void props.onRetry?.()}
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
    if (props.state !== 'content' || props.mode === AI_ASSISTANT_SUMMARY_MODES.MID_CALL_RECEIVER || !displayContent) {
      return null;
    }
    if (!displayContent.sections) {
      return (
        <div className="ai-summary__content" data-testid="ai-summary:content">
          <div className="ai-summary__section">
            {props.onEdit ? (
              <SummaryEditor
                className="ai-summary__textarea"
                dir="auto"
                dataAriaLabel={AI_ASSISTANT_SUMMARY_MESSAGES.plainSummary}
                value={displayContent.summaryText ?? ''}
                disabled={disabled}
                onChange={(value) => props.onEdit?.('summaryText', value)}
              />
            ) : (
              <Text tagname="span" className="ai-summary__readonly-value" dir="auto">
                {displayContent.summaryText}
              </Text>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="ai-summary__content" data-testid="ai-summary:content">
        {getDisplaySections(displayContent).map((section) => {
          const {key} = section;
          if (!props.onEdit && !section.value.trim()) return null;
          return key !== 'resolution' && props.onEdit ? (
            <SummarySectionEditor
              key={key}
              section={section}
              disabled={disabled}
              onChange={(value) => props.onEdit?.(key, value)}
              onEditorClosed={restoreFocus}
            />
          ) : (
            <div className="ai-summary__section ai-summary__section--structured" key={section.key}>
              <div className="ai-summary__readonly">
                <Text tagname="span" className="ai-summary__label" dir="auto">
                  {AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels[section.key]}
                </Text>
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
    props.mode === AI_ASSISTANT_SUMMARY_MODES.POST_CALL && selectedFeedback !== 'none'
      ? AI_ASSISTANT_SUMMARY_MESSAGES.feedback.pendingSubmission
      : undefined;

  const hasContent = props.state === 'content' && Boolean(displayContent);
  const showCopy = Boolean(
    props.onCopy && (props.mode !== AI_ASSISTANT_SUMMARY_MODES.MID_CALL_RECEIVER || props.getReceiverCopyText)
  );
  const showFeedback = Boolean(props.onFeedback);
  const showActions = hasContent && (showCopy || showFeedback);
  const showSummaryHeading = props.mode === AI_ASSISTANT_SUMMARY_MODES.POST_CALL && hasContent;
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
          <Text tagname="span">{AI_ASSISTANT_SUMMARY_MESSAGES.postCall.summaryHeading}</Text>
          <Icon name="info-circle-filled" className="ai-summary__summary-info" aria-hidden="true" />
        </div>
      ) : null}
      <div className={hasContent ? 'ai-summary__editor-surface' : undefined} data-testid="ai-summary:editor-surface">
        {renderContent()}
        {showActions ? (
          <div className="ai-summary__actions" data-testid="ai-summary:actions">
            {showCopy ? (
              <span
                className="ai-summary__action"
                onMouseEnter={() => handleActionMouseEnter('copy')}
                onMouseLeave={() => handleActionMouseLeave('copy')}
              >
                <Button
                  id={`ai-summary-${summaryId}-copy`}
                  variant="tertiary"
                  size={24}
                  prefix-icon={copied ? 'check-bold' : 'copy-regular'}
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
                />
                <Text tagname="span" className="ai-summary__sr-only">
                  {copyLabel}
                </Text>
                {renderTooltip('copy', AI_ASSISTANT_SUMMARY_MESSAGES.copySummary)}
              </span>
            ) : null}
            {props.mode !== AI_ASSISTANT_SUMMARY_MODES.MID_CALL_RECEIVER ? (
              <>
                <span className="ai-summary__actions-spacer" />
                <Text tagname="span" className="ai-summary__attribution">
                  {AI_ASSISTANT_SUMMARY_MESSAGES.attribution}
                </Text>
                <span className="ai-summary__action-separator" aria-hidden="true" />
              </>
            ) : null}
            {showFeedback ? (
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
                      <Button
                        id={`ai-summary-${summaryId}-${feedback}`}
                        variant="tertiary"
                        size={20}
                        prefix-icon={`${icon}-${selected ? 'filled' : 'regular'}`}
                        active={selected}
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
                      />
                      {renderTooltip(feedback, feedbackLabel)}
                    </span>
                  );
                })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {feedbackDescription ? (
        <Text tagname="p" className="ai-summary__feedback-status" id={feedbackDescriptionId}>
          {feedbackDescription}
        </Text>
      ) : null}
    </section>
  );
};

export default AISummary;
