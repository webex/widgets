import React, {useState} from 'react';
import {Button, Icon, Spinner, Text, Textarea, Tooltip} from '@momentum-design/components/dist/react';
import {
  AI_ASSISTANT_SUMMARY_ACTION_LABELS,
  AI_ASSISTANT_SUMMARY_BULLETED_SECTION_KEYS,
  AI_ASSISTANT_SUMMARY_FEEDBACK_BUTTONS,
  AI_ASSISTANT_SUMMARY_MESSAGES,
  AI_ASSISTANT_SUMMARY_MODES,
} from './ai-summary.constants';
import {getDisplaySections, useAISummaryInteractions} from './helper';
import AdaptiveCardRenderer from '../AdaptiveCardRenderer/adaptive-card-renderer';
import {extractAssistantTitle, formatSourceTimestamp} from '../AdaptiveCardRenderer/adaptive-card-renderer.utils';
import CiscoAIAssistantColorIcon from '../CiscoAIAssistantColorIcon';
import type {AISummaryProps} from './ai-summary.types';
import './ai-summary.styles.scss';

const renderReadonlyValue = (value: string, bulleted: boolean) => {
  const lines = value.split('\n').filter((line) => line.trim().length > 0);
  if (bulleted && lines.length > 1) {
    return (
      <ul className="ai-summary__readonly-list" dir="auto">
        {lines.map((line, index) => (
          <li key={`${line}-${index}`} dir="auto">
            {line.trim().replace(/^(?:\u2022|[-*])\s*/, '')}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Text tagname="span" type="body-midsize-regular" className="ai-summary__readonly-value" dir="auto">
      {value}
    </Text>
  );
};

const AISummary = (props: AISummaryProps): React.ReactElement => {
  const {
    rootRef,
    displayContent,
    copied,
    setCopied,
    summaryId,
    disabled,
    selectedFeedback,
    isEditing,
    startEditing,
    copyText,
    hiddenActionIds,
    handleRetry,
    handleCardAction,
    handleInput,
    handleCardUserAction,
    handleCardRendered,
    handleCopy,
    handleFeedback,
  } = useAISummaryInteractions(props);
  const isReceiver = props.mode === AI_ASSISTANT_SUMMARY_MODES.MID_CALL_RECEIVER;
  const [receiverCardReady, setReceiverCardReady] = useState(false);
  const state =
    props.state === 'content' && (!displayContent || (isReceiver && !displayContent.adaptiveCard))
      ? 'unavailable'
      : props.state;
  if (state !== 'content') {
    return (
      <section className="ai-summary" data-testid={`ai-summary:${props.mode}`} ref={rootRef}>
        <div className="ai-summary__status" data-testid={`ai-summary:${state === 'generic-error' ? 'error' : state}`}>
          {state === 'generic-error' && (
            <Icon
              name="error-legacy-regular"
              size={2.25}
              lengthUnit="rem"
              className="ai-summary__error-icon"
              aria-hidden="true"
            />
          )}
          {state !== 'unavailable' && (
            <Text tagname="h3" type={state === 'generating' ? 'body-large-bold' : 'body-midsize-bold'}>
              {state === 'generating'
                ? AI_ASSISTANT_SUMMARY_MESSAGES.generatingTitle
                : AI_ASSISTANT_SUMMARY_MESSAGES.generationError}
            </Text>
          )}
          <Text tagname="p" type="body-midsize-regular" className="ai-summary__description">
            {state === 'generating'
              ? AI_ASSISTANT_SUMMARY_MESSAGES.generatingDescription
              : state === 'unavailable'
                ? AI_ASSISTANT_SUMMARY_MESSAGES.unavailable
                : AI_ASSISTANT_SUMMARY_MESSAGES.generationErrorDescription}
          </Text>
          {state === 'generating' && <Spinner className="ai-summary__spinner" size="small" aria-hidden="true" />}
          {state === 'generic-error' && props.onRetry && (
            <Button
              className="ai-summary__retry-button"
              type="button"
              variant="secondary"
              size={28}
              prefix-icon="refresh-regular"
              disabled={disabled}
              onClick={handleRetry}
            >
              {AI_ASSISTANT_SUMMARY_MESSAGES.retry}
            </Button>
          )}
        </div>
      </section>
    );
  }

  const card = isReceiver ? undefined : isEditing ? props.content?.editAdaptiveCard : props.content?.adaptiveCard;
  if (card) {
    return (
      <section className="ai-summary" data-testid={`ai-summary:${props.mode}`} ref={rootRef}>
        <div className="ai-summary__native-card" data-testid="ai-summary:editor-surface">
          <AdaptiveCardRenderer
            key={isEditing ? 'edit' : 'view'}
            card={card}
            publishTimestamp={props.content?.timestamp}
            presentation="summary"
            contentIdentity={props.content}
            disabled={disabled}
            readOnlyInputs={!isEditing}
            hiddenActionIds={hiddenActionIds}
            actionLabels={AI_ASSISTANT_SUMMARY_ACTION_LABELS}
            feedback={
              selectedFeedback === 'thumbs_up' ? 'like' : selectedFeedback === 'thumbs_down' ? 'dislike' : 'none'
            }
            inputValues={
              props.content?.summaryText === undefined && props.editedSummary === '' ? undefined : props.editedSummary
            }
            onInputChange={handleInput}
            suggestionText={copyText}
            onAction={handleCardAction}
            onUserAction={handleCardUserAction}
            onRender={handleCardRendered}
            fallbackText={AI_ASSISTANT_SUMMARY_MESSAGES.unavailable}
          />
        </div>
      </section>
    );
  }
  const showCopy = Boolean(props.onCopy);
  const showFeedback = Boolean(props.onFeedback);
  const copyLabel = copied ? AI_ASSISTANT_SUMMARY_MESSAGES.copiedSummary : AI_ASSISTANT_SUMMARY_MESSAGES.copySummary;
  const renderCopyControl = () =>
    showCopy ? (
      <span className="ai-summary__action">
        <Button
          id={`ai-summary-${summaryId}-copy`}
          variant="tertiary"
          size={24}
          prefix-icon={copied ? 'check-bold' : 'copy-regular'}
          type="button"
          disabled={disabled}
          onBlur={() => setCopied(false)}
          onClick={() => void handleCopy()}
          aria-label={AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}
        />
        <Text tagname="span" type="body-midsize-regular" className="ai-summary__sr-only">
          {copyLabel}
        </Text>
        <Tooltip triggerID={`ai-summary-${summaryId}-copy`} placement="top" tooltipType="none">
          {AI_ASSISTANT_SUMMARY_MESSAGES.copySummary}
        </Tooltip>
      </span>
    ) : null;
  const renderFeedbackControls = () =>
    showFeedback ? (
      <span className="ai-summary__feedback-group">
        {AI_ASSISTANT_SUMMARY_FEEDBACK_BUTTONS.map(({feedback, icon, label: feedbackLabel}) => (
          <span className="ai-summary__action" key={feedback}>
            <Button
              id={`ai-summary-${summaryId}-${feedback}`}
              variant="tertiary"
              size={isReceiver ? 24 : 20}
              prefix-icon={`${icon}-regular`}
              active={selectedFeedback === feedback}
              type="button"
              disabled={disabled}
              onClick={() => handleFeedback(feedback)}
              aria-label={feedbackLabel}
            />
            <Tooltip triggerID={`ai-summary-${summaryId}-${feedback}`} placement="top" tooltipType="none">
              {feedbackLabel}
            </Tooltip>
          </span>
        ))}
      </span>
    ) : null;
  if (isReceiver && props.content?.adaptiveCard) {
    const assistantTitle = extractAssistantTitle(props.content.adaptiveCard);
    const timestamp = formatSourceTimestamp(props.content.timestamp);
    const footer =
      timestamp || showCopy || showFeedback ? (
        <div
          className="ai-summary__actions ai-summary__receiver-footer"
          data-testid="ai-summary:receiver-footer"
          dir="ltr"
        >
          {timestamp ? (
            <>
              <time className="ai-summary__receiver-timestamp">{timestamp}</time>
              {showCopy || showFeedback ? <span className="ai-summary__action-separator" aria-hidden="true" /> : null}
            </>
          ) : null}
          {showCopy || showFeedback ? (
            <div className="ai-summary__receiver-controls" data-testid="ai-summary:actions">
              {renderFeedbackControls()}
              {renderCopyControl()}
            </div>
          ) : null}
        </div>
      ) : undefined;
    return (
      <section
        className="ai-summary ai-summary--receiver"
        dir="ltr"
        data-testid={`ai-summary:${props.mode}`}
        ref={rootRef}
      >
        {assistantTitle ? (
          <div className="ai-assistant__assistant-header">
            <span className="ai-assistant__assistant-icon" aria-hidden="true">
              <CiscoAIAssistantColorIcon size={20} />
            </span>
            <Text tagname="h3" type="body-midsize-bold" className="ai-assistant__suggestion-title">
              {assistantTitle}
            </Text>
          </div>
        ) : null}
        <div dir="auto">
          <AdaptiveCardRenderer
            card={props.content.adaptiveCard}
            assistantTitle={assistantTitle}
            publishTimestamp={props.content.timestamp}
            displayOnly
            omitSourceTimestamp
            onRender={setReceiverCardReady}
            footer={receiverCardReady ? footer : undefined}
            fallbackText={AI_ASSISTANT_SUMMARY_MESSAGES.unavailable}
          />
        </div>
      </section>
    );
  }
  const fields = displayContent?.sections
    ? getDisplaySections(displayContent)
    : [{key: 'summaryText' as const, value: displayContent?.summaryText ?? ''}];
  const firstEditableKey = fields.find((field) => field.key !== 'resolution')?.key;
  const showEdit = Boolean(props.onEdit && !isEditing);
  const showActions = showCopy || showFeedback || showEdit;
  const showSummaryHeading = props.mode === AI_ASSISTANT_SUMMARY_MODES.POST_CALL;
  return (
    <section className="ai-summary" data-testid={`ai-summary:${props.mode}`} ref={rootRef}>
      {showSummaryHeading ? (
        <div className="ai-summary__summary-heading">
          <Icon
            name="sparkle-filled"
            size={1}
            lengthUnit="rem"
            className="ai-summary__summary-sparkle"
            aria-hidden="true"
          />
          <Text tagname="span" type="body-midsize-medium">
            {AI_ASSISTANT_SUMMARY_MESSAGES.postCall.summaryHeading}
          </Text>
          <Icon
            name="info-circle-filled"
            size={0.875}
            lengthUnit="rem"
            className="ai-summary__summary-info"
            aria-hidden="true"
          />
        </div>
      ) : null}
      <div className="ai-summary__editor-surface" data-testid="ai-summary:editor-surface">
        <div className="ai-summary__content" data-testid="ai-summary:content">
          {fields.map(({key, value}) => {
            const label = key === 'summaryText' ? undefined : AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels[key];
            const editable = isEditing && key !== 'resolution';
            if (key !== 'summaryText' && !value.trim() && !editable) return null;
            if (editable) {
              return (
                <Textarea
                  key={key}
                  className="ai-summary__textarea"
                  dir="auto"
                  label={label}
                  dataAriaLabel={label ? undefined : AI_ASSISTANT_SUMMARY_MESSAGES.plainSummary}
                  value={value}
                  rows={3}
                  autoFocusOnMount={key === firstEditableKey}
                  disabled={disabled}
                  onInput={(event) => handleInput(key, event.target.value)}
                />
              );
            }
            const readonlyValue = renderReadonlyValue(
              value,
              key !== 'summaryText' && AI_ASSISTANT_SUMMARY_BULLETED_SECTION_KEYS.has(key)
            );
            return label ? (
              <div className="ai-summary__readonly" key={key}>
                <Text tagname="span" type="body-midsize-bold" className="ai-summary__label" dir="auto">
                  {label}
                </Text>
                {readonlyValue}
              </div>
            ) : (
              <React.Fragment key={key}>{readonlyValue}</React.Fragment>
            );
          })}
        </div>
        {showActions ? (
          <div className="ai-summary__actions" data-testid="ai-summary:actions">
            {showEdit ? (
              <Button
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon="edit-regular"
                disabled={disabled}
                onClick={startEditing}
                aria-label={AI_ASSISTANT_SUMMARY_MESSAGES.editSummary}
              >
                {AI_ASSISTANT_SUMMARY_MESSAGES.editSummary}
              </Button>
            ) : null}
            {renderCopyControl()}
            <span className="ai-summary__actions-spacer" />
            <Text tagname="span" type="body-midsize-regular" className="ai-summary__attribution">
              {isEditing ? AI_ASSISTANT_SUMMARY_MESSAGES.editing : AI_ASSISTANT_SUMMARY_MESSAGES.attribution}
            </Text>
            <span className="ai-summary__action-separator" aria-hidden="true" />
            {renderFeedbackControls()}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default AISummary;
