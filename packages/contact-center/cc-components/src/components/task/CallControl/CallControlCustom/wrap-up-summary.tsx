import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {RadioGroupNext as RadioGroup, TextInput} from '@momentum-ui/react-collaboration';
import {Icon} from '@momentum-design/components/dist/react';
import AISummary, {AI_SUMMARY_MESSAGES} from '../../../AISummary';
import {useSummaryViewed} from '../../../AISummary/use-summary-viewed';
import {CLEAR_SEARCH} from '../../constants';
import {WrapUpSummaryProps, WrapUpSummaryReason} from './wrap-up-summary.types';
import './wrap-up-summary.styles.scss';

const nextSelectionRevision = (current: number): number => current + 1;
const useReactId = (React as typeof React & {useId: () => string}).useId;

const reasonMatchesQuery = (reason: WrapUpSummaryReason, query: string): boolean =>
  reason.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());

type ReasonSelection = {
  reason: WrapUpSummaryReason;
  revision: number;
};

const getReasonById = (
  reasons: readonly WrapUpSummaryReason[],
  reasonId: string | undefined
): WrapUpSummaryReason | undefined => reasons.find((reason) => reason.id === reasonId);

const getReasonIdFromInteractionTarget = (target: EventTarget | null): string | null => {
  if (!(target instanceof Element)) {
    return null;
  }
  const radio =
    target instanceof HTMLInputElement && target.type === 'radio'
      ? target
      : (target.closest('label')?.querySelector<HTMLInputElement>('input[type="radio"]') ?? null);
  return radio?.value ?? null;
};

const WrapUpSummary: React.FC<WrapUpSummaryProps> = ({
  reasons,
  summary,
  initialReasonId,
  completionPending = false,
  completionEscape = false,
  onReasonChange,
  onReasonCommit,
  onComplete,
}) => {
  const headingId = useReactId();
  const editSummary = useSummaryViewed(summary);
  const reasonListId = `${headingId}-reasons`;
  const [query, setQuery] = useState('');
  const [reasonListExpanded, setReasonListExpanded] = useState(false);
  const [selectedReasonId, setSelectedReasonId] = useState(() => getReasonById(reasons, initialReasonId)?.id ?? '');
  const [localCompletionPending, setLocalCompletionPending] = useState(false);
  const wrapUpPanelRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const collapsedReasonTriggerRef = useRef<HTMLButtonElement | null>(null);
  const completionPromiseRef = useRef<Promise<unknown> | null>(null);
  const pendingReasonFocusRef = useRef<'search' | 'collapsed-reason' | null>(null);
  const summaryBodyRef = useRef<HTMLDivElement | null>(null);
  const summaryFocusedControlRef = useRef<HTMLElement | null>(null);
  const previousSummaryVisibleRef = useRef(false);
  const lastCommittedRevisionRef = useRef<number | null>(null);
  const selectionRef = useRef({reasonId: selectedReasonId, revision: 0});
  const reasonNavigationChangeRef = useRef(false);
  const selectedReason = getReasonById(reasons, selectedReasonId);
  const filteredReasons = useMemo(
    () => reasons.filter((reason) => reasonMatchesQuery(reason, query)),
    [query, reasons]
  );
  const showReasonList = !summary || summary.state !== 'content' || summary.content.type === 'text';
  const reasonListVisible = showReasonList || reasonListExpanded;
  const summaryVisible = Boolean(summary && summary.state !== 'omitted');
  const summaryControlsDisabled = Boolean(summary?.controlsDisabled);
  const completionInProgress = completionPending || localCompletionPending || completionPromiseRef.current !== null;
  const reasonControlsDisabled = completionInProgress || summaryControlsDisabled;
  const requestPending = summary?.requestPending === true;
  const reasonInteractionDisabled = reasonControlsDisabled || requestPending;
  const areReasonControlsDisabled = () =>
    completionPending || localCompletionPending || completionPromiseRef.current !== null || summaryControlsDisabled;
  const areReasonInteractionsBlocked = () =>
    completionPending ||
    localCompletionPending ||
    completionPromiseRef.current !== null ||
    summaryControlsDisabled ||
    summary?.requestPending === true;

  const clearSummaryFocusSnapshot = () => {
    summaryFocusedControlRef.current = null;
  };

  const restoreSummaryRemovalFocus = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body && activeElement.isConnected) {
      clearSummaryFocusSnapshot();
      return;
    }
    const focusedSummaryControl = summaryFocusedControlRef.current;
    if (focusedSummaryControl && !focusedSummaryControl.isConnected) {
      wrapUpPanelRef.current?.focus();
    }
    clearSummaryFocusSnapshot();
  };

  useLayoutEffect(() => {
    const previousSummaryVisible = previousSummaryVisibleRef.current;
    previousSummaryVisibleRef.current = summaryVisible;
    if (previousSummaryVisible && !summaryVisible) {
      restoreSummaryRemovalFocus();
    }
  }, [summaryVisible]);

  useLayoutEffect(() => {
    const pendingTarget = pendingReasonFocusRef.current;
    if (!pendingTarget) {
      return;
    }
    pendingReasonFocusRef.current = null;
    const target = pendingTarget === 'search' ? searchInputRef.current : collapsedReasonTriggerRef.current;
    if (target?.isConnected) {
      target.focus();
    }
  }, [reasonListVisible]);

  useLayoutEffect(() => {
    if (!selectedReasonId || getReasonById(reasons, selectedReasonId)) {
      return;
    }
    selectionRef.current = {...selectionRef.current, reasonId: ''};
    lastCommittedRevisionRef.current = null;
    setSelectedReasonId('');
  }, [reasons, selectedReasonId]);

  const handleSummaryFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement) {
      summaryFocusedControlRef.current = target;
    }
  };

  const selectReason = (reasonId: string): ReasonSelection | null => {
    if (areReasonInteractionsBlocked()) {
      return null;
    }
    const reason = getReasonById(reasons, reasonId);
    if (!reason) {
      return null;
    }
    const currentSelection = selectionRef.current;
    if (currentSelection.reasonId === reason.id) {
      return {reason, revision: currentSelection.revision};
    }
    const nextRevision = nextSelectionRevision(currentSelection.revision);
    selectionRef.current = {reasonId: reason.id, revision: nextRevision};
    setSelectedReasonId(reason.id);
    onReasonChange?.(reason, nextRevision);
    return {reason, revision: nextRevision};
  };

  const getCurrentSelection = (): ReasonSelection | null => {
    const {reasonId, revision} = selectionRef.current;
    const reason = getReasonById(reasons, reasonId);
    return reason ? {reason, revision} : null;
  };

  const commitReason = (selection = getCurrentSelection(), restoreFocusAfterCollapse = false) => {
    if (areReasonInteractionsBlocked() || !selection || lastCommittedRevisionRef.current === selection.revision) {
      return;
    }
    lastCommittedRevisionRef.current = selection.revision;
    onReasonCommit(selection.reason, selection.revision);
    if (!showReasonList) {
      if (restoreFocusAfterCollapse) {
        pendingReasonFocusRef.current = 'collapsed-reason';
      }
      setReasonListExpanded(false);
    }
  };

  const handleReasonActivationKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const isActivationKey = event.key === 'Enter' || event.key === ' ';
    const isNavigationKey =
      event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowLeft';
    if (!isActivationKey && !isNavigationKey) {
      return;
    }
    const reasonId = getReasonIdFromInteractionTarget(event.target);
    if (!reasonId) {
      return;
    }
    if (isNavigationKey && !areReasonInteractionsBlocked()) {
      reasonNavigationChangeRef.current = true;
      return;
    }
    if (areReasonInteractionsBlocked()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    const selection = selectReason(reasonId);
    if (selection) {
      commitReason(selection, true);
    }
  };

  const handleReasonPointerDownCapture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!areReasonInteractionsBlocked() || !getReasonIdFromInteractionTarget(event.target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const handleReasonClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const reasonId = getReasonIdFromInteractionTarget(event.target);
    if (!reasonId || areReasonInteractionsBlocked()) {
      return;
    }
    const selection = selectReason(reasonId);
    if (selection) {
      commitReason(selection, true);
    }
  };

  const handleComplete = () => {
    if (!selectedReason || areReasonControlsDisabled()) {
      return;
    }
    let completion: Promise<unknown>;
    let shouldPaintPending = false;
    try {
      const completionResult = onComplete(selectedReason);
      shouldPaintPending =
        (typeof completionResult === 'object' || typeof completionResult === 'function') &&
        completionResult !== null &&
        typeof (completionResult as PromiseLike<unknown>).then === 'function';
      completion = Promise.resolve(completionResult);
    } catch (error) {
      completion = Promise.reject(error);
    }
    completionPromiseRef.current = completion;
    if (shouldPaintPending) {
      setLocalCompletionPending(true);
    }
    void completion.then(
      () => {
        if (completionPromiseRef.current === completion) {
          completionPromiseRef.current = null;
          if (shouldPaintPending) {
            setLocalCompletionPending(false);
          }
        }
      },
      () => {
        if (completionPromiseRef.current === completion) {
          completionPromiseRef.current = null;
          if (shouldPaintPending) {
            setLocalCompletionPending(false);
          }
        }
      }
    );
  };

  const summaryCompletionEscape = Boolean(summary?.completionEscape ?? completionEscape);
  const initialGenerationPending = summary?.state === 'generating' && summary.requestPending === true;
  const completeDisabled =
    !selectedReason ||
    completionInProgress ||
    summaryControlsDisabled ||
    Boolean(initialGenerationPending && !summaryCompletionEscape);

  return (
    <section
      className="wrap-up-summary agent-popover-content"
      data-testid="wrap-up-summary"
      ref={wrapUpPanelRef}
      tabIndex={-1}
    >
      <div className="wrap-up-summary__scroll-content" data-testid="wrap-up-summary:scroll-content">
        <header className="wrap-up-summary__header">
          <h2 className="wrap-up-summary__eyebrow">{AI_SUMMARY_MESSAGES.postCall.eyebrow}</h2>
          <p className="wrap-up-summary__intro">{AI_SUMMARY_MESSAGES.postCall.instructions}</p>
        </header>
        <h3 className="wrap-up-summary__title" id={headingId}>
          {AI_SUMMARY_MESSAGES.postCall.chooseReason}
        </h3>
        {reasonListVisible ? (
          <>
            <div className="wrap-up-summary__search-field wrap-up-summary__search-field--with-icon">
              <Icon name="search-regular" className="wrap-up-summary__search-field-icon" aria-hidden="true" />
              <TextInput
                aria-label={AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel}
                className="wrap-up-summary__search-control"
                inputClassName="wrap-up-summary__search"
                placeholder={AI_SUMMARY_MESSAGES.postCall.searchPlaceholder}
                ref={searchInputRef}
                value={query}
                isDisabled={reasonControlsDisabled}
                clearAriaLabel={CLEAR_SEARCH}
                onChange={setQuery}
              />
            </div>
            <div
              className="wrap-up-summary__reason-group"
              aria-disabled={reasonInteractionDisabled ? 'true' : undefined}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  commitReason();
                }
              }}
              onClickCapture={handleReasonClick}
              onKeyDownCapture={handleReasonActivationKeyDown}
              onPointerDownCapture={handleReasonPointerDownCapture}
            >
              <RadioGroup
                aria-labelledby={headingId}
                className="wrap-up-summary__reasons"
                id={reasonListId}
                isDisabled={reasonControlsDisabled}
                onChange={(reasonId) => {
                  const selection = selectReason(reasonId);
                  if (!reasonNavigationChangeRef.current && selection) {
                    commitReason(selection, true);
                  }
                  reasonNavigationChangeRef.current = false;
                }}
                options={filteredReasons.map((reason) => ({
                  className: 'wrap-up-summary__reason',
                  label: reason.name,
                  value: reason.id,
                }))}
                value={selectedReasonId}
              />
              {filteredReasons.length === 0 ? (
                <p className="wrap-up-summary__empty">{AI_SUMMARY_MESSAGES.postCall.noReasonMatches}</p>
              ) : null}
            </div>
          </>
        ) : (
          <button
            type="button"
            className="wrap-up-summary__selected-reason"
            aria-label={AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel}
            aria-controls={reasonListId}
            aria-expanded={reasonListExpanded}
            ref={collapsedReasonTriggerRef}
            disabled={reasonControlsDisabled}
            onClick={() => {
              if (areReasonControlsDisabled()) {
                return;
              }
              pendingReasonFocusRef.current = 'search';
              setReasonListExpanded(true);
            }}
          >
            <span className="wrap-up-summary__selected-reason-label">
              <Icon name="search-regular" className="wrap-up-summary__search-icon" aria-hidden="true" />
              <span>{AI_SUMMARY_MESSAGES.postCall.searchPlaceholder}</span>
            </span>
            <Icon name="arrow-down-regular" className="wrap-up-summary__selected-reason-arrow" aria-hidden="true" />
          </button>
        )}
        {summary && summary.state !== 'omitted' ? (
          <div
            className={`wrap-up-summary__body${summary.state === 'content' ? ' wrap-up-summary__body--content' : ''}`}
            data-testid="wrap-up-summary:body"
            onFocusCapture={handleSummaryFocusCapture}
            ref={summaryBodyRef}
          >
            <AISummary
              mode="post-call"
              state={summary.state}
              content={summary.content}
              contentRevision={summary.contentRevision}
              feedbackStatus={summary.feedbackStatus}
              selectedFeedback={summary.selectedFeedback}
              requestPending={summary.requestPending}
              controlsDisabled={summary.controlsDisabled}
              onEdit={editSummary}
              onCopy={summary.onCopy}
              onFeedback={summary.onFeedback}
              onRetry={summary.onRetry}
              onCopyVisualStateChange={summary.onCopyVisualStateChange}
              containingPanelFocusTarget={wrapUpPanelRef}
            />
          </div>
        ) : null}
      </div>
      <div className="wrap-up-summary__actions">
        <button
          type="button"
          className="wrap-up-summary__complete"
          disabled={completeDisabled}
          aria-label={AI_SUMMARY_MESSAGES.postCall.completeAction}
          title={AI_SUMMARY_MESSAGES.postCall.completeAction}
          onClick={handleComplete}
        >
          {AI_SUMMARY_MESSAGES.postCall.completeAction}
        </button>
      </div>
    </section>
  );
};

export default WrapUpSummary;
