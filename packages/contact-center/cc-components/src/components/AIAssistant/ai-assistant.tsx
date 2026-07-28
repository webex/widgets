import React from 'react';
import {Button, Text} from '@momentum-design/components/dist/react';
import {withMetrics} from '@webex/cc-ui-logging';
import Header from './Panel/Header/header';
import MinimizedBar from './Panel/MinimizedBar/minimized-bar';
import RealTimeAssist from './RealTimeAssist/real-time-assist';
import CiscoAIAssistantColorIcon from './CiscoAIAssistantColorIcon';
import {AIAssistantComponentProps} from './ai-assistant.types';
import {DISCLAIMER_TEXT} from './constant';
import './ai-assistant.styles.scss';

const AIAssistantComponent: React.FC<AIAssistantComponentProps> = ({
  chrome,
  isFullScreen,
  requestStatus,
  errorMessage,
  contextDraft,
  chatEntries,
  isFeatureEnabled,
  hasFiredInitialRequest,
  open,
  close,
  minimize,
  restore,
  toggleFullScreen,
  requestSuggestion,
  setContextDraft,
  submitContext,
  onRealTimeAssistAction,
  className,
}) => {
  // Fullscreen is consumer-owned: we emit onFullScreenToggle; the host owns layout.
  const rootClass = ['ai-assistant', className || ''].filter(Boolean).join(' ');
  const panelClass = ['ai-assistant__panel', isFullScreen ? 'ai-assistant__panel--full-screen' : '']
    .filter(Boolean)
    .join(' ');

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
          <MinimizedBar onRestore={restore} onClose={close} />
        </div>
      ) : (
        <div className={panelClass} data-testid="ai-assistant:panel" role="dialog" aria-label="Cisco AI Assistant">
          <Header
            onMinimize={minimize}
            onToggleFullScreen={toggleFullScreen}
            onClose={close}
            isFullScreen={isFullScreen}
          />
          <div className="ai-assistant__body" data-testid="ai-assistant:body">
            <RealTimeAssist
              status={requestStatus}
              errorMessage={errorMessage}
              chatEntries={chatEntries}
              contextDraft={contextDraft}
              onRequestSuggestion={requestSuggestion}
              onContextDraftChange={setContextDraft}
              onSubmitContext={submitContext}
              isFeatureEnabled={isFeatureEnabled}
              hasFiredInitialRequest={hasFiredInitialRequest}
              onRealTimeAssistAction={onRealTimeAssistAction}
            />
          </div>
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
        </div>
      )}
    </div>
  );
};

const AIAssistantComponentWithMetrics = withMetrics(AIAssistantComponent, 'AIAssistant');

export default AIAssistantComponentWithMetrics;
