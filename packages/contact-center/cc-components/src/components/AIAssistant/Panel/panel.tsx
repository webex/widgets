import React from 'react';
import Header from './Header/header';
import MinimizedBar from './MinimizedBar/minimized-bar';
import SuggestedResponse from '../SuggestedResponse/suggested-response';
import ContextInput from '../SuggestedResponse/ContextInput/context-input';
import {AIAssistantPanelProps} from '../ai-assistant.types';

const Panel: React.FC<AIAssistantPanelProps> = ({
  chrome,
  isFullScreen,
  requestStatus,
  errorMessage,
  contextDraft,
  chatEntries,
  isFeatureEnabled,
  hasFiredInitialRequest,
  onMinimize,
  onRestore,
  onClose,
  onToggleFullScreen,
  onRequestSuggestion,
  onContextDraftChange,
  onSubmitContext,
  onSuggestionFeedback,
}) => {
  if (chrome === 'minimized') {
    return (
      <div className="ai-assistant__panel ai-assistant__panel--minimized" data-testid="ai-assistant:panel-minimized">
        <MinimizedBar onRestore={onRestore} onClose={onClose} />
      </div>
    );
  }

  const panelClass = ['ai-assistant__panel', isFullScreen ? 'ai-assistant__panel--full-screen' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={panelClass} data-testid="ai-assistant:panel" role="dialog" aria-label="Cisco AI Assistant">
      <Header
        onMinimize={onMinimize}
        onToggleFullScreen={onToggleFullScreen}
        onClose={onClose}
        isFullScreen={isFullScreen}
      />
      <div className="ai-assistant__body" data-testid="ai-assistant:body">
        <SuggestedResponse
          status={requestStatus}
          errorMessage={errorMessage}
          chatEntries={chatEntries}
          onRequestSuggestion={onRequestSuggestion}
          isFeatureEnabled={isFeatureEnabled}
          hasFiredInitialRequest={hasFiredInitialRequest}
          onSuggestionFeedback={onSuggestionFeedback}
        />
      </div>
      <footer className="ai-assistant__footer" data-testid="ai-assistant:footer">
        <ContextInput
          value={contextDraft}
          disabled={!isFeatureEnabled || !hasFiredInitialRequest}
          onChange={onContextDraftChange}
          onSubmit={onSubmitContext}
          placeholder={
            hasFiredInitialRequest
              ? 'Add context to refine suggestions'
              : 'Click "Get Suggestions" first to start a session'
          }
        />
        <p className="ai-assistant__disclaimer" data-testid="ai-assistant:disclaimer">
          I can make mistakes, so check my responses.
        </p>
      </footer>
    </div>
  );
};

export default Panel;
