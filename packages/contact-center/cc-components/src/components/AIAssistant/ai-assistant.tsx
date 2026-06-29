import React from 'react';
import {withMetrics} from '@webex/cc-ui-logging';
import Launcher from './Launcher/launcher';
import Panel from './Panel/panel';
import {AIAssistantComponentProps} from './ai-assistant.types';
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
  onSuggestionFeedback,
  className,
}) => {
  // Fullscreen is consumer-owned: we emit onFullScreenToggle; the host owns layout.
  const rootClass = ['ai-assistant', className || ''].filter(Boolean).join(' ');

  return (
    <div className={rootClass} data-testid="ai-assistant:root">
      {chrome === 'closed' ? (
        <Launcher onOpen={open} />
      ) : (
        <Panel
          chrome={chrome}
          isFullScreen={isFullScreen}
          requestStatus={requestStatus}
          errorMessage={errorMessage}
          contextDraft={contextDraft}
          chatEntries={chatEntries}
          isFeatureEnabled={isFeatureEnabled}
          hasFiredInitialRequest={hasFiredInitialRequest}
          onMinimize={minimize}
          onRestore={restore}
          onClose={close}
          onToggleFullScreen={toggleFullScreen}
          onRequestSuggestion={requestSuggestion}
          onContextDraftChange={setContextDraft}
          onSubmitContext={submitContext}
          onSuggestionFeedback={onSuggestionFeedback}
        />
      )}
    </div>
  );
};

const AIAssistantComponentWithMetrics = withMetrics(AIAssistantComponent, 'AIAssistant');

export default AIAssistantComponentWithMetrics;
