import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Button, Text, Tooltip} from '@momentum-design/components/dist/react';
import {withMetrics} from '@webex/cc-ui-logging';
import RealTimeAssist from './RealTimeAssist/real-time-assist';
import AISummary, {AI_ASSISTANT_SUMMARY_MESSAGES} from './AISummary';
import AIAssistantLanding from './ai-assistant-landing';
import CiscoAIAssistantColorIcon from './CiscoAIAssistantColorIcon';
import WellnessBreakError from './WellnessBreak/wellness-break-error';
import WellnessBreakHistory from './WellnessBreak/wellness-break-history';
import WellnessBreakModal from './WellnessBreak/wellness-break-modal';
import WellnessBreakOfferCard from './WellnessBreak/wellness-break-offer-card';
import WellnessBreakOfferToast from './WellnessBreak/wellness-break-offer-toast';
import WellnessBreakRequestCard from './WellnessBreak/wellness-break-request-card';
import {AIAssistantComponentProps, WellnessBreakModalProps, WellnessBreakViewModel} from './ai-assistant.types';
import {extractCardText} from './AdaptiveCardRenderer/adaptive-card-renderer.utils';
import AdaptiveCardRenderer from './AdaptiveCardRenderer/adaptive-card-renderer';
import {AI_ASSISTANT_TITLE, DISCLAIMER_TEXT} from './constants';
import './ai-assistant.styles.scss';
import './WellnessBreak/wellness-break.styles.scss';

const isWellnessOverlayPhase = (phase: WellnessBreakViewModel['phase']): phase is WellnessBreakModalProps['phase'] =>
  phase === 'starting' || phase === 'playing' || phase === 'ending';

let assistantHeaderSequence = 0;

const FOCUSABLE_SELECTOR = 'button, [href], input, textarea, select, [tabindex], [role="button"], mdc-button';

const getEnabledFocusTargets = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true' && element.tabIndex >= 0
  );

const AIAssistantComponent: React.FC<AIAssistantComponentProps> = ({
  chrome,
  isFullScreen,
  requestStatus,
  errorMessage,
  contextDraft,
  isRequesting,
  chatEntries,
  isFeatureEnabled,
  hasActiveInteraction,
  agentName,
  hasInitialRequestSucceeded,
  open,
  close,
  minimize,
  restore,
  toggleFullScreen,
  clearContent = () => undefined,
  hasClearableContent = false,
  requestRealTimeAssist,
  setContextDraft,
  submitContext,
  onRealTimeAssistAction,
  receiverSummary,
  logger,
  className,
  wellnessBreakOverlayTarget,
  wellness,
  loadWellnessAnimation,
}) => {
  const [headerActionId] = useState(() => {
    assistantHeaderSequence += 1;
    return `ai-assistant-header-${assistantHeaderSequence}`;
  });
  // The receiver summary branch the agent opened; real-time assist shows otherwise.
  const [viewingReceiverKey, setViewingReceiverKey] = useState<string | null>(null);
  const [receiverCardReady, setReceiverCardReady] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const receiverBranchRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const lastFocusSuccessorRef = useRef<HTMLElement | null>(null);
  const pendingReceiverActivationFocusRef = useRef(false);
  // Fullscreen is consumer-owned: we emit onFullScreenToggle; the host owns layout.
  const wellnessOverlayPhase = wellness && isWellnessOverlayPhase(wellness.phase) ? wellness.phase : undefined;
  const rootClass = [
    'ai-assistant',
    wellnessOverlayPhase && wellnessBreakOverlayTarget === 'assistant' && 'ai-assistant--wellness-overlay',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const panelClass = ['ai-assistant__panel', isFullScreen ? 'ai-assistant__panel--full-screen' : '']
    .filter(Boolean)
    .join(' ');
  const canViewReceiverSummary = Boolean(receiverSummary && hasActiveInteraction);
  const showReceiverSummary = Boolean(
    receiverSummary && hasActiveInteraction && viewingReceiverKey === receiverSummary.branchKey
  );
  const showLanding = !showReceiverSummary && (!hasActiveInteraction || !isFeatureEnabled);
  const receiverBranchKey = receiverSummary?.branchKey;
  const receiverCardAvailable = Boolean(
    receiverSummary?.surface === 'content' && receiverSummary.content.adaptiveCard
  );
  const receiverActionsVisible = Boolean(
    showReceiverSummary && receiverCardAvailable && receiverCardReady
  );

  const wellnessHistory = wellness?.history ?? [];
  const hasWellnessHistory = Boolean(wellness?.enabled && !wellness.contentCleared && wellnessHistory.length > 0);
  // Desktop treats the suggested CTA as an empty-state action. It is only
  // eligible when normal assistant content is not active; once eligible, the
  // wellness experience owns the body instead of stacking above the landing.
  const showWellnessSuggestion = Boolean(
    wellness?.enabled &&
      !wellness.contentCleared &&
      showLanding &&
      wellness.phase === 'idle' &&
      wellness.requestAvailable &&
      !wellness.notice
  );
  // Keep prior messages in the view model, but let a newly eligible Desktop-style
  // suggestion temporarily own the complete assistant body.
  const showWellnessHistory = hasWellnessHistory && !showWellnessSuggestion;
  const showWellnessRequestState = Boolean(
    wellness?.enabled && !wellness.contentCleared && (wellness.phase === 'request-pending' || wellness.notice)
  );
  const showWellnessOffer = Boolean(
    wellness?.enabled && !wellness.contentCleared && wellness.phase === 'offer-pending'
  );
  const showWellnessStatus = Boolean(
    wellness?.enabled &&
      !wellness.contentCleared &&
      ['changing-to-break', 'waiting-for-safe-state', 'restoring'].includes(wellness.phase)
  );
  const showWellnessError = Boolean(wellness?.enabled && !wellness.contentCleared && wellness.phase === 'error');
  const showWellnessOverlay = Boolean(wellnessOverlayPhase);
  const showWellnessContent = Boolean(
    showWellnessSuggestion ||
      showWellnessHistory ||
      showWellnessRequestState ||
      showWellnessOffer ||
      showWellnessStatus ||
      showWellnessError ||
      showWellnessOverlay
  );
  const showFooter = showWellnessContent
    ? Boolean(!showWellnessSuggestion && !showWellnessOverlay && isFeatureEnabled)
    : !showLanding;

  useEffect(() => {
    if (viewingReceiverKey !== receiverBranchKey) {
      setViewingReceiverKey(null);
      pendingReceiverActivationFocusRef.current = false;
    }
  }, [viewingReceiverKey, receiverBranchKey]);

  const focusTarget = (target: HTMLElement | null | undefined): boolean => {
    if (
      !target ||
      !target.isConnected ||
      target.hasAttribute('disabled') ||
      target.getAttribute('aria-disabled') === 'true'
    ) {
      return false;
    }
    // Momentum reflects its default tab stop asynchronously after connection.
    // A newly rendered launcher must already be focusable during layout repair.
    if (target.tagName === 'MDC-BUTTON' && !target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '0');
    }
    target.focus();
    HTMLElement.prototype.focus.call(target);
    return document.activeElement === target;
  };

  const clearReceiverFocusSnapshot = () => {
    lastFocusedElementRef.current = null;
    lastFocusSuccessorRef.current = null;
  };

  const recoverReceiverFocus = (preferHeader: boolean) => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body && activeElement.isConnected) {
      clearReceiverFocusSnapshot();
      return;
    }
    const lastFocusedElement = lastFocusedElementRef.current;
    if (lastFocusedElement?.isConnected && lastFocusedElement !== document.body) {
      clearReceiverFocusSnapshot();
      return;
    }

    if (focusTarget(lastFocusSuccessorRef.current)) {
      clearReceiverFocusSnapshot();
      return;
    }

    if (preferHeader) {
      const headerMinimize = panelRef.current?.querySelector<HTMLElement>(
        '[data-testid="ai-assistant:header-minimize"]'
      );
      if (focusTarget(headerMinimize)) {
        clearReceiverFocusSnapshot();
        return;
      }
    }

    focusTarget(panelRef.current);
    clearReceiverFocusSnapshot();
  };

  // Recover only when the previously focused control was removed. Connected
  // controls and focus outside the assistant keep their current focus.
  useLayoutEffect(() => {
    if (pendingReceiverActivationFocusRef.current && chrome === 'open' && showReceiverSummary) {
      pendingReceiverActivationFocusRef.current = false;
      recoverReceiverFocus(true);
      return;
    }
    const focused = lastFocusedElementRef.current;
    if (!focused || focused.isConnected) {
      return;
    }
    if (chrome === 'open') {
      recoverReceiverFocus(false);
      return;
    }
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body && activeElement.isConnected) {
      clearReceiverFocusSnapshot();
      return;
    }
    const fallbackSelector =
      chrome === 'closed' ? '[data-testid="ai-assistant:launcher"]' : '[data-testid="ai-assistant:minimized-restore"]';
    if (!focusTarget(lastFocusSuccessorRef.current)) {
      focusTarget(rootRef.current?.querySelector<HTMLElement>(fallbackSelector));
    }
    clearReceiverFocusSnapshot();
  });

  const handleRootFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const controls = rootRef.current ? getEnabledFocusTargets(rootRef.current) : [];
    const index = controls.indexOf(target);
    lastFocusedElementRef.current = target;
    lastFocusSuccessorRef.current = index >= 0 ? (controls[index + 1] ?? null) : null;
  };

  const openRealTimeAssist = () => {
    setViewingReceiverKey(null);
    open();
  };

  const restoreRealTimeAssist = () => {
    setViewingReceiverKey(null);
    restore();
  };

  const openReceiverSummary = () => {
    if (!receiverSummary) {
      return;
    }
    setViewingReceiverKey(receiverSummary.branchKey);
    pendingReceiverActivationFocusRef.current = true;
    if (chrome === 'minimized') {
      restore();
      return;
    }
    if (chrome === 'closed') {
      open();
    }
  };

  const renderReceiverSummary = (summary: NonNullable<typeof receiverSummary>) => {
    return (
      <div
        ref={receiverBranchRef}
        className="ai-assistant__receiver-summary"
        data-testid="ai-assistant:receiver-summary"
        dir="ltr"
      >
        {summary.surface === 'content' && summary.content.adaptiveCard ? (
          <div dir="auto">
            <AdaptiveCardRenderer
              card={summary.content.adaptiveCard}
              displayOnly
              onRender={setReceiverCardReady}
              contentRevision={summary.contentRevision}
              fallbackText={AI_ASSISTANT_SUMMARY_MESSAGES.unavailable}
              logger={logger}
            />
          </div>
        ) : null}
        {summary.surface === 'content' && receiverActionsVisible ? (
          <AISummary
            mode="mid-call-receiver"
            containingPanelFocusTarget={panelRef}
            state="content"
            requestPending={summary.feedbackPending}
            selectedFeedback={summary.selectedFeedback}
            contentRevision={summary.contentRevision}
            getReceiverCopyText={() => (receiverBranchRef.current ? extractCardText(receiverBranchRef.current) : '')}
            onCopy={summary.recordReceiverSummaryCopied}
            onFeedback={summary.setReceiverSummaryFeedback}
          />
        ) : null}
        {summary.surface === 'unavailable' || summary.surface === 'generic-error' ? (
          <AISummary mode="mid-call-receiver" containingPanelFocusTarget={panelRef} state={summary.surface} />
        ) : null}
        {summary.surface === 'content' && !summary.content.adaptiveCard ? (
          <AISummary mode="mid-call-receiver" containingPanelFocusTarget={panelRef} state="unavailable" />
        ) : null}
      </div>
    );
  };

  const renderReceiverSummaryTrigger = (classNameSuffix = '') =>
    canViewReceiverSummary ? (
      <Button
        type="button"
        variant="tertiary"
        size={28}
        onClick={openReceiverSummary}
        className={`ai-assistant__summary-trigger${classNameSuffix}`}
        data-testid="ai-assistant:view-summary"
        aria-label={AI_ASSISTANT_SUMMARY_MESSAGES.viewSummary}
        title={AI_ASSISTANT_SUMMARY_MESSAGES.viewSummary}
      >
        {AI_ASSISTANT_SUMMARY_MESSAGES.viewSummary}
      </Button>
    ) : null;

  const renderLauncherButton = () => (
    <Button
      type="button"
      variant="tertiary"
      size={52}
      onClick={openRealTimeAssist}
      className="ai-assistant__launcher"
      data-testid="ai-assistant:launcher"
      aria-label="Open AI Assistant"
    >
      <CiscoAIAssistantColorIcon size={22} />
    </Button>
  );

  return (
    <div className={rootClass} data-testid="ai-assistant:root" onFocusCapture={handleRootFocusCapture} ref={rootRef}>
      {chrome === 'closed' ? (
        canViewReceiverSummary ? (
          <div className="ai-assistant__closed-chrome" data-testid="ai-assistant:closed-chrome">
            {renderReceiverSummaryTrigger()}
            {renderLauncherButton()}
          </div>
        ) : (
          renderLauncherButton()
        )
      ) : chrome === 'minimized' ? (
        <div className="ai-assistant__panel ai-assistant__panel--minimized" data-testid="ai-assistant:panel-minimized">
          <div className="ai-assistant__minimized-bar" data-testid="ai-assistant:minimized-bar">
            <Text tagname="span" type="body-midsize-bold" className="ai-assistant__title">
              {AI_ASSISTANT_TITLE}
            </Text>
            <div className="ai-assistant__header-actions">
              {renderReceiverSummaryTrigger(' ai-assistant__summary-trigger--minimized')}
              <Button
                id={`${headerActionId}-restore`}
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon="arrow-up-bold"
                aria-label="Restore"
                data-testid="ai-assistant:minimized-restore"
                onClick={restoreRealTimeAssist}
              />
              <Tooltip triggerID={`${headerActionId}-restore`} placement="bottom" tooltipType="label">
                Restore
              </Tooltip>
              <Button
                id={`${headerActionId}-minimized-close`}
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon="cancel-bold"
                aria-label="Close"
                data-testid="ai-assistant:minimized-close"
                onClick={close}
              />
              <Tooltip triggerID={`${headerActionId}-minimized-close`} placement="bottom" tooltipType="label">
                Close
              </Tooltip>
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={panelRef}
          className={panelClass}
          data-testid="ai-assistant:panel"
          role="dialog"
          aria-label={AI_ASSISTANT_TITLE}
          tabIndex={-1}
        >
          <header className="ai-assistant__header" data-testid="ai-assistant:header">
            <Text tagname="h2" type="body-large-bold" className="ai-assistant__title">
              {AI_ASSISTANT_TITLE}
            </Text>
            <div className="ai-assistant__header-actions" data-testid="ai-assistant:header-actions">
              <Button
                id={`${headerActionId}-clear`}
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon="clean-up-bold"
                aria-label="Clear"
                data-testid="ai-assistant:header-clear"
                disabled={!hasClearableContent}
                onClick={clearContent}
              />
              <Tooltip
                triggerID={`${headerActionId}-clear`}
                placement="bottom"
                tooltipType="label"
                data-testid="ai-assistant:header-clear-tooltip"
              >
                Clear
              </Tooltip>
              <Button
                id={`${headerActionId}-minimize`}
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon="minimize-bold"
                aria-label="Minimize"
                data-testid="ai-assistant:header-minimize"
                onClick={minimize}
              />
              <Tooltip triggerID={`${headerActionId}-minimize`} placement="bottom" tooltipType="label">
                Minimize
              </Tooltip>
              <Button
                id={`${headerActionId}-fullscreen`}
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon={isFullScreen ? 'fullscreen-exit-bold' : 'fullscreen-bold'}
                aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
                data-testid="ai-assistant:header-fullscreen"
                onClick={toggleFullScreen}
              />
              <Tooltip triggerID={`${headerActionId}-fullscreen`} placement="bottom" tooltipType="label">
                {isFullScreen ? 'Exit full screen' : 'Full screen'}
              </Tooltip>
              <Button
                id={`${headerActionId}-close`}
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon="cancel-bold"
                aria-label="Close"
                data-testid="ai-assistant:header-close"
                onClick={close}
              />
              <Tooltip triggerID={`${headerActionId}-close`} placement="bottom" tooltipType="label">
                Close
              </Tooltip>
            </div>
          </header>
          <div
            className={`ai-assistant__body${
              (showLanding && !showWellnessContent) || showWellnessSuggestion ? ' ai-assistant__body--landing' : ''
            }${showWellnessSuggestion ? ' ai-assistant__body--wellness-suggestion' : ''}`}
            data-testid="ai-assistant:body"
          >
            {showWellnessHistory && wellness ? (
              <WellnessBreakHistory
                entries={wellnessHistory}
                onAccept={() => wellness.onAccept('card')}
                onLater={() => wellness.onLater('card')}
              />
            ) : null}
            {(showWellnessSuggestion || (showWellnessRequestState && !showWellnessHistory)) && wellness ? (
              <WellnessBreakRequestCard
                phase={wellness.phase}
                notice={wellness.notice}
                disabled={wellness.phase === 'request-pending' || !wellness.requestAvailable}
                actionText={wellness.event?.actionText}
                onRequest={wellness.onRequest}
              />
            ) : null}
            {showWellnessOffer && !showWellnessHistory && wellness ? (
              <WellnessBreakOfferCard
                event={wellness.event}
                disabled={false}
                onAccept={() => wellness.onAccept('card')}
                onLater={() => wellness.onLater('card')}
              />
            ) : null}
            {showWellnessStatus && !showWellnessHistory && wellness ? (
              <section className="wellness-break-card" data-testid="wellness-break:status" aria-live="polite">
                <Text tagname="p" type="body-small-regular" className="wellness-break-card__message">
                  {wellness.phase === 'restoring'
                    ? 'Restoring your status…'
                    : wellness.phase === 'waiting-for-safe-state'
                      ? wellness.hasBlockingTasks
                        ? 'Great. Your well-being break starts right after your current work.'
                        : 'Great. Your well-being break will begin shortly.'
                      : 'Great. Your well-being break will begin shortly.'}
                </Text>
              </section>
            ) : null}
            {showWellnessError && wellness ? <WellnessBreakError error={wellness.error} /> : null}
            {!showWellnessContent ? (
              showReceiverSummary ? (
                renderReceiverSummary(receiverSummary!)
              ) : showLanding ? (
                <AIAssistantLanding agentName={agentName} showRealTimeAssist={isFeatureEnabled} />
              ) : (
                <RealTimeAssist
                  status={requestStatus}
                  errorMessage={errorMessage}
                  chatEntries={chatEntries}
                  contextDraft={contextDraft}
                  isRequesting={isRequesting}
                  onRequestRealTimeAssist={requestRealTimeAssist}
                  onContextDraftChange={setContextDraft}
                  onSubmitContext={submitContext}
                  hasInitialRequestSucceeded={hasInitialRequestSucceeded}
                  onRealTimeAssistAction={onRealTimeAssistAction}
                  logger={logger}
                />
              )
            ) : null}
          </div>
          {showFooter ? (
            <footer className="ai-assistant__footer" data-testid="ai-assistant:footer">
              <Text
                tagname="p"
                type="body-small-regular"
                className="ai-assistant__disclaimer"
                data-testid="ai-assistant:disclaimer"
              >
                {DISCLAIMER_TEXT}
              </Text>
            </footer>
          ) : null}
        </div>
      )}
      {wellnessOverlayPhase && wellness ? (
        <WellnessBreakModal
          phase={wellnessOverlayPhase}
          countdown={wellness.countdown}
          elapsedSeconds={wellness.elapsedSeconds}
          animationData={wellness.animationData}
          reducedMotion={wellness.reducedMotion}
          onMediaError={wellness.onMediaError}
          overlayTarget={wellnessBreakOverlayTarget}
          loadAnimation={loadWellnessAnimation}
        />
      ) : null}
      {showWellnessOffer && wellness ? (
        <WellnessBreakOfferToast
          visible={chrome !== 'open'}
          event={wellness.event}
          disabled={false}
          onAccept={() => wellness.onAccept('notification')}
          onLater={() => wellness.onLater('notification')}
          onDismiss={wellness.onDismissNotification}
        />
      ) : null}
    </div>
  );
};

const AIAssistantComponentWithMetrics = withMetrics(AIAssistantComponent, 'AIAssistant');

export default AIAssistantComponentWithMetrics;
