import React, {useEffect, useRef, useState} from 'react';
import {Button, Text, Toast, Tooltip} from '@momentum-design/components/dist/react';
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
import {AI_ASSISTANT_TITLE, DISCLAIMER_TEXT, GET_ASSISTANCE_LABEL} from './constants';
import './ai-assistant.styles.scss';
import './WellnessBreak/wellness-break.styles.scss';

const isWellnessOverlayPhase = (phase: WellnessBreakViewModel['phase']): phase is WellnessBreakModalProps['phase'] =>
  phase === 'starting' || phase === 'playing' || phase === 'ending';

let assistantHeaderSequence = 0;

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
  const focusReceiverSummaryRef = useRef(false);
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
  const summary = hasActiveInteraction ? receiverSummary : undefined;
  const showLanding = !summary && (!hasActiveInteraction || !isFeatureEnabled);
  const receiverBranchKey = receiverSummary?.branchKey;
  const receiverContent = receiverSummary?.surface === 'content' ? receiverSummary.content : undefined;
  const [dismissedReceiverNotifications, setDismissedReceiverNotifications] = useState(
    () => new Map<string, NonNullable<typeof receiverContent>>()
  );
  const dismissReceiverNotification = () => {
    if (receiverBranchKey && receiverContent) {
      setDismissedReceiverNotifications((dismissed) => new Map(dismissed).set(receiverBranchKey, receiverContent));
    }
  };

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
  // Incoming summaries take precedence over a completed/dismissed
  // wellness transcript, while in-progress wellness flows keep their priority.
  const hasActiveAssistance =
    hasActiveInteraction &&
    isFeatureEnabled &&
    (isRequesting || hasInitialRequestSucceeded || requestStatus === 'error');
  const showRetainedWellness = wellness?.phase !== 'idle' || (!summary && !hasActiveAssistance);
  const showWellnessHistory = hasWellnessHistory && !showWellnessSuggestion && showRetainedWellness;
  const showWellnessRequestState = Boolean(
    wellness?.enabled &&
      !wellness.contentCleared &&
      (wellness.phase === 'request-pending' || (wellness.notice && showRetainedWellness))
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
  const showReceiverSummaryToast = Boolean(
    summary &&
      receiverContent &&
      chrome !== 'open' &&
      !showWellnessOffer &&
      !showWellnessOverlay &&
      dismissedReceiverNotifications.get(receiverBranchKey ?? '') !== receiverContent
  );
  const showFooter = showWellnessContent
    ? Boolean(!showWellnessSuggestion && !showWellnessOverlay && isFeatureEnabled)
    : !showLanding;

  useEffect(() => {
    if (chrome !== 'open' || !hasActiveInteraction) {
      focusReceiverSummaryRef.current = false;
    }
    if (chrome === 'open' && hasActiveInteraction && receiverBranchKey && receiverContent) {
      setDismissedReceiverNotifications((dismissed) => new Map(dismissed).set(receiverBranchKey, receiverContent));
    }
  }, [chrome, receiverBranchKey, receiverContent, hasActiveInteraction]);

  const closeAssistant = () => {
    focusReceiverSummaryRef.current = false;
    close();
  };

  const openAssistant = () => {
    focusReceiverSummaryRef.current = false;
    open();
  };

  const restoreAssistant = () => {
    focusReceiverSummaryRef.current = false;
    restore();
  };

  const requestAssistanceFromSummary = () => {
    if (!hasActiveInteraction || !isFeatureEnabled || isRequesting) {
      return;
    }
    focusReceiverSummaryRef.current = false;
    requestRealTimeAssist();
  };

  const openReceiverSummary = () => {
    if (!receiverSummary) {
      return;
    }
    dismissReceiverNotification();
    focusReceiverSummaryRef.current = true;
    if (chrome === 'minimized') {
      restore();
      return;
    }
    if (chrome === 'closed') {
      open();
    }
  };

  const receiverCards = summary ? (
    <div className="ai-assistant__chat-item" data-testid="ai-assistant:receiver-summary" dir="ltr">
      {summary.history?.map((card, index) => (
        <AISummary
          key={`history-${index}`}
          mode="mid-call-receiver"
          state={card.content.areTranscriptsAvailable === false ? 'unavailable' : 'content'}
          content={card.content}
          controlsDisabled={card.feedbackPending}
          selectedFeedback={card.selectedFeedback}
          onCopy={card.recordReceiverSummaryCopied}
          onFeedback={card.setReceiverSummaryFeedback}
        />
      ))}
      {summary.surface !== 'history' ? (
        <AISummary
          mode="mid-call-receiver"
          state={summary.surface}
          {...(summary.surface === 'content'
            ? {
                content: summary.content,
                controlsDisabled: summary.feedbackPending,
                selectedFeedback: summary.selectedFeedback,
                onCopy: summary.recordReceiverSummaryCopied,
                onFeedback: summary.setReceiverSummaryFeedback,
              }
            : {})}
        />
      ) : null}
    </div>
  ) : null;

  const renderLauncherButton = () => (
    <Button
      type="button"
      variant="tertiary"
      size={52}
      onClick={openAssistant}
      className="ai-assistant__launcher"
      data-testid="ai-assistant:launcher"
      aria-label="Open AI Assistant"
    >
      <CiscoAIAssistantColorIcon size={22} />
    </Button>
  );

  return (
    <div className={rootClass} data-testid="ai-assistant:root">
      {chrome === 'closed' ? (
        renderLauncherButton()
      ) : chrome === 'minimized' ? (
        <div className="ai-assistant__panel ai-assistant__panel--minimized" data-testid="ai-assistant:panel-minimized">
          <div className="ai-assistant__minimized-bar" data-testid="ai-assistant:minimized-bar">
            <Text tagname="span" type="body-midsize-bold" className="ai-assistant__title">
              {AI_ASSISTANT_TITLE}
            </Text>
            <div className="ai-assistant__header-actions">
              <Button
                id={`${headerActionId}-restore`}
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon="arrow-up-bold"
                aria-label="Restore"
                data-testid="ai-assistant:minimized-restore"
                onClick={restoreAssistant}
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
                onClick={closeAssistant}
              />
              <Tooltip triggerID={`${headerActionId}-minimized-close`} placement="bottom" tooltipType="label">
                Close
              </Tooltip>
            </div>
          </div>
        </div>
      ) : (
        <div className={panelClass} data-testid="ai-assistant:panel" role="dialog" aria-label={AI_ASSISTANT_TITLE}>
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
                autoFocusOnMount={Boolean(summary) && focusReceiverSummaryRef.current}
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
                onClick={closeAssistant}
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
              showLanding ? (
                <AIAssistantLanding agentName={agentName} showRealTimeAssist={isFeatureEnabled} />
              ) : summary && !isFeatureEnabled ? (
                <div className="ai-assistant__chat">{receiverCards}</div>
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
                >
                  {receiverCards}
                </RealTimeAssist>
              )
            ) : null}
          </div>
          {showFooter ? (
            <footer className="ai-assistant__footer" data-testid="ai-assistant:footer">
              {summary && !showWellnessContent && hasActiveInteraction && isFeatureEnabled ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="ai-assistant__pill-button"
                  disabled={isRequesting}
                  onClick={requestAssistanceFromSummary}
                  data-testid="ai-assistant:summary-get-assistance"
                >
                  {GET_ASSISTANCE_LABEL}
                </Button>
              ) : null}
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
      {showReceiverSummaryToast && receiverContent ? (
        <div className="ai-assistant__summary-toast-anchor" data-testid="ai-assistant:summary-toast">
          <Toast
            variant="custom"
            headerText={AI_ASSISTANT_SUMMARY_MESSAGES.incomingNotificationTitle}
            closeButtonAriaLabel={AI_ASSISTANT_SUMMARY_MESSAGES.dismissNotification}
            onClose={dismissReceiverNotification}
          >
            <span className="ai-assistant__summary-toast-icon" slot="content-prefix" aria-hidden="true">
              <CiscoAIAssistantColorIcon size={20} />
            </span>
            <Text slot="toast-body-normal" tagname="span">
              {receiverContent.summaryText || AI_ASSISTANT_SUMMARY_MESSAGES.incomingNotificationDescription}
            </Text>
            <Button
              slot="footer-button-secondary"
              type="button"
              variant="secondary"
              size={32}
              onClick={dismissReceiverNotification}
            >
              {AI_ASSISTANT_SUMMARY_MESSAGES.later}
            </Button>
            <Button
              slot="footer-button-primary"
              type="button"
              variant="primary"
              size={32}
              onClick={openReceiverSummary}
              data-testid="ai-assistant:toast-view-summary"
            >
              {AI_ASSISTANT_SUMMARY_MESSAGES.viewSummary}
            </Button>
          </Toast>
        </div>
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
