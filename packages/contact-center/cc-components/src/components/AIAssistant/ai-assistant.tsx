import React, {useState} from 'react';
import {Button, Text, Tooltip} from '@momentum-design/components/dist/react';
import {withMetrics} from '@webex/cc-ui-logging';
import RealTimeAssist from './RealTimeAssist/real-time-assist';
import AIAssistantLanding from './ai-assistant-landing';
import CiscoAIAssistantColorIcon from './CiscoAIAssistantColorIcon';
import WellnessBreakError from './WellnessBreak/wellness-break-error';
import WellnessBreakHistory from './WellnessBreak/wellness-break-history';
import WellnessBreakModal from './WellnessBreak/wellness-break-modal';
import WellnessBreakOfferCard from './WellnessBreak/wellness-break-offer-card';
import WellnessBreakOfferToast from './WellnessBreak/wellness-break-offer-toast';
import WellnessBreakRequestCard from './WellnessBreak/wellness-break-request-card';
import {AIAssistantComponentProps, WellnessBreakModalProps, WellnessBreakViewModel} from './ai-assistant.types';
import {AI_ASSISTANT_TITLE, DISCLAIMER_TEXT} from './constants';
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
  logger,
  className,
  wellnessBreakOverlayTarget,
  wellness,
}) => {
  const [headerActionId] = useState(() => {
    assistantHeaderSequence += 1;
    return `ai-assistant-header-${assistantHeaderSequence}`;
  });
  // Fullscreen is consumer-owned: we emit onFullScreenToggle; the host owns layout.
  const rootClass = ['ai-assistant', className || ''].filter(Boolean).join(' ');
  const panelClass = ['ai-assistant__panel', isFullScreen ? 'ai-assistant__panel--full-screen' : '']
    .filter(Boolean)
    .join(' ');
  const showLanding = !hasActiveInteraction || !isFeatureEnabled;
  const wellnessHistory = wellness?.history ?? [];
  const showWellnessHistory = Boolean(wellness?.enabled && !wellness.contentCleared && wellnessHistory.length > 0);
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
  const wellnessOverlayPhase = wellness && isWellnessOverlayPhase(wellness.phase) ? wellness.phase : undefined;
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

  return (
    <div className={rootClass} data-testid="ai-assistant:root">
      {chrome === 'closed' ? (
        <Button
          type="button"
          variant="tertiary"
          size={52}
          onClick={open}
          className="ai-assistant__launcher"
          data-testid="ai-assistant:launcher"
          aria-label="Open AI Assistant"
        >
          <CiscoAIAssistantColorIcon size={22} />
        </Button>
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
                onClick={restore}
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
              (showLanding && !showWellnessContent) || (showWellnessSuggestion && !showWellnessHistory)
                ? ' ai-assistant__body--landing'
                : ''
            }`}
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
