import React, {useLayoutEffect, useRef, useState} from 'react';
import {RadioGroupNext as RadioGroup, TextInput} from '@momentum-ui/react-collaboration';
import {Button, Icon} from '@momentum-design/components/dist/react';
import AISummary, {AI_ASSISTANT_SUMMARY_MESSAGES as AI_SUMMARY_MESSAGES} from '../../../AIAssistant/AISummary';
import {CLEAR_SEARCH, WRAP_UP_INTERACTION} from '../../constants';
import type {WrapUpSummaryProps} from '../../task.types';
import './wrap-up-summary.styles.scss';

const useReactId = (React as typeof React & {useId: () => string}).useId;

const WrapUpSummary: React.FC<WrapUpSummaryProps> = ({
  reasons,
  summary,
  selectedReasonId,
  completionPending = false,
  onReasonChange,
  onComplete,
}) => {
  const headingId = useReactId();
  const [query, setQuery] = useState('');
  const wrapUpPanelRef = useRef<HTMLElement | null>(null);
  const summaryFocusedControlRef = useRef<HTMLElement | null>(null);
  const selectedReason = reasons.find((reason) => reason.id === selectedReasonId);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredReasons = reasons.filter((reason) => reason.name.toLocaleLowerCase().includes(normalizedQuery));

  useLayoutEffect(() => {
    const focusedSummaryControl = summaryFocusedControlRef.current;
    if (!focusedSummaryControl || focusedSummaryControl.isConnected) return;

    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement) || activeElement === document.body || !activeElement.isConnected) {
      wrapUpPanelRef.current?.focus();
    }
    summaryFocusedControlRef.current = null;
  });

  const handleSummaryFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement) {
      summaryFocusedControlRef.current = target;
    }
  };

  return (
    <section
      className="wrap-up-summary agent-popover-content"
      data-testid="wrap-up-summary"
      ref={wrapUpPanelRef}
      tabIndex={-1}
    >
      <div className="wrap-up-summary__scroll-content" data-testid="wrap-up-summary:scroll-content">
        <header className="wrap-up-summary__header">
          <h2 className="wrap-up-summary__eyebrow">{WRAP_UP_INTERACTION}</h2>
          <p className="wrap-up-summary__intro">{AI_SUMMARY_MESSAGES.postCall.instructions}</p>
        </header>
        <h3 className="wrap-up-summary__title" id={headingId}>
          {AI_SUMMARY_MESSAGES.postCall.chooseReason}
        </h3>
        <div className="wrap-up-summary__search-field">
          <Icon name="search-regular" className="wrap-up-summary__search-field-icon" aria-hidden="true" />
          <TextInput
            aria-label={AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel}
            className="wrap-up-summary__search-control"
            inputClassName="wrap-up-summary__search"
            placeholder={AI_SUMMARY_MESSAGES.postCall.searchPlaceholder}
            value={query}
            isDisabled={completionPending}
            clearAriaLabel={CLEAR_SEARCH}
            onChange={setQuery}
          />
        </div>
        <div className="wrap-up-summary__reason-group" aria-disabled={completionPending ? 'true' : undefined}>
          <RadioGroup
            aria-labelledby={headingId}
            className="wrap-up-summary__reasons"
            isDisabled={completionPending}
            onChange={(reasonId) => {
              const reason = reasons.find((candidate) => candidate.id === reasonId);
              if (reason) {
                onReasonChange(reason);
              }
            }}
            options={filteredReasons.map((reason) => ({
              className: 'wrap-up-summary__reason',
              label: reason.name,
              value: reason.id,
            }))}
            value={selectedReason?.id ?? ''}
          />
          {filteredReasons.length === 0 ? (
            <p className="wrap-up-summary__empty">{AI_SUMMARY_MESSAGES.postCall.noReasonMatches}</p>
          ) : null}
        </div>
        {summary && summary.state !== 'omitted' ? (
          <div
            className={`wrap-up-summary__body${summary.state === 'content' ? ' wrap-up-summary__body--content' : ''}`}
            data-testid="wrap-up-summary:body"
            onFocusCapture={handleSummaryFocusCapture}
            onBlurCapture={(event) => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof HTMLElement && nextTarget !== document.body && nextTarget.isConnected) {
                summaryFocusedControlRef.current = null;
              }
            }}
          >
            <AISummary
              {...summary}
              mode="post-call"
              state={summary.state}
              // The final response is taken when completion starts, so later edits would not be submitted.
              controlsDisabled={completionPending}
              containingPanelFocusTarget={wrapUpPanelRef}
            />
          </div>
        ) : null}
      </div>
      <div className="wrap-up-summary__actions">
        {/* As in Agent Desktop, a summary that is still generating does not hold back wrap-up. */}
        <Button
          type="button"
          variant="primary"
          size={32}
          disabled={!selectedReason || completionPending}
          aria-label={AI_SUMMARY_MESSAGES.postCall.completeAction}
          title={AI_SUMMARY_MESSAGES.postCall.completeAction}
          onClick={selectedReason && !completionPending ? () => onComplete(selectedReason) : undefined}
        >
          {AI_SUMMARY_MESSAGES.postCall.completeAction}
        </Button>
      </div>
    </section>
  );
};

export default WrapUpSummary;
