import React from 'react';
import {Button, Text} from '@momentum-design/components/dist/react';
import {withMetrics} from '@webex/cc-ui-logging';
import RealTimeAssist from './RealTimeAssist/real-time-assist';
import AIAssistantLanding from './ai-assistant-landing';
import CiscoAIAssistantColorIcon from './CiscoAIAssistantColorIcon';
import {AIAssistantComponentProps} from './ai-assistant.types';
import {AI_ASSISTANT_TITLE, DISCLAIMER_TEXT} from './constants';
import './ai-assistant.styles.scss';

const AIAssistantComponent: React.FC<AIAssistantComponentProps> = ({
  chrome,
  isFullScreen,
  requestStatus,
  errorMessage,
  contextDraft,
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
  requestRealTimeAssist,
  setContextDraft,
  submitContext,
  onRealTimeAssistAction,
  logger,
  className,
}) => {
  // Fullscreen is consumer-owned: we emit onFullScreenToggle; the host owns layout.
  const rootClass = ['ai-assistant', className || ''].filter(Boolean).join(' ');
  const panelClass = ['ai-assistant__panel', isFullScreen ? 'ai-assistant__panel--full-screen' : '']
    .filter(Boolean)
    .join(' ');
  const showLanding = !hasActiveInteraction || !isFeatureEnabled;

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
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon="arrow-up-bold"
                aria-label="Restore"
                data-testid="ai-assistant:minimized-restore"
                onClick={restore}
              />
              <Button
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon="cancel-bold"
                aria-label="Close"
                data-testid="ai-assistant:minimized-close"
                onClick={close}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className={panelClass} data-testid="ai-assistant:panel" role="dialog" aria-label={AI_ASSISTANT_TITLE}>
          <header className="ai-assistant__header" data-testid="ai-assistant:header">
            <Text tagname="h2" type="body-large-bold" className="ai-assistant__title">
              {AI_ASSISTANT_TITLE}
            </Text>
            <div className="ai-assistant__header-actions">
              <Button
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon="minimize-bold"
                aria-label="Minimize"
                data-testid="ai-assistant:header-minimize"
                onClick={minimize}
              />
              <Button
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon={isFullScreen ? 'fullscreen-exit-bold' : 'fullscreen-bold'}
                aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
                data-testid="ai-assistant:header-fullscreen"
                onClick={toggleFullScreen}
              />
              <Button
                type="button"
                variant="tertiary"
                size={28}
                prefix-icon="cancel-bold"
                aria-label="Close"
                data-testid="ai-assistant:header-close"
                onClick={close}
              />
            </div>
          </header>
          <div
            className={`ai-assistant__body${showLanding ? ' ai-assistant__body--landing' : ''}`}
            data-testid="ai-assistant:body"
          >
            {showLanding ? (
              <AIAssistantLanding agentName={agentName} showRealTimeAssist={isFeatureEnabled} />
            ) : (
              <RealTimeAssist
                status={requestStatus}
                errorMessage={errorMessage}
                chatEntries={chatEntries}
                contextDraft={contextDraft}
                onRequestRealTimeAssist={requestRealTimeAssist}
                onContextDraftChange={setContextDraft}
                onSubmitContext={submitContext}
                hasInitialRequestSucceeded={hasInitialRequestSucceeded}
                onRealTimeAssistAction={onRealTimeAssistAction}
                logger={logger}
              />
            )}
          </div>
          {showLanding ? null : (
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
          )}
        </div>
      )}
    </div>
  );
};

const AIAssistantComponentWithMetrics = withMetrics(AIAssistantComponent, 'AIAssistant');

export default AIAssistantComponentWithMetrics;
