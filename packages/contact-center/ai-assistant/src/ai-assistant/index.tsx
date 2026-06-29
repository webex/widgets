import React, {useCallback} from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {AIAssistantComponent} from '@webex/cc-components';
import type {AIAssistantFeedbackEvent} from '@webex/cc-components';
import type {SuggestedResponsePayload} from '@webex/cc-store';
import {useAiAssistant, SUGGESTED_RESPONSES_FLAG} from '../helper';
import {IAIAssistantProps} from '../ai-assistant.types';

const AIAssistantInternal: React.FunctionComponent<IAIAssistantProps> = observer((props) => {
  const {currentTask, agentId, featureFlags, suggestedResponses} = store;
  const interactionId = currentTask?.data?.interactionId;
  const isFeatureEnabled = Boolean(featureFlags?.[SUGGESTED_RESPONSES_FLAG]);
  const suggestions = interactionId ? suggestedResponses?.[interactionId] || [] : [];

  const hookProps = useAiAssistant({
    ...props,
    interactionId,
    agentId,
    isFeatureEnabled,
    suggestions,
  });

  const handleSuggestionFeedback = useCallback(
    (event: AIAssistantFeedbackEvent, suggestion: SuggestedResponsePayload) => {
      if (!interactionId) return;
      store.sendSuggestionFeedback?.({
        interactionId,
        adaptiveCardId: suggestion?.data?.adaptiveCardId,
        trackingId: suggestion?.data?.trackingId,
        actionId: event.actionId,
        actionType: 'Action.Submit',
      });
    },
    [interactionId]
  );

  return (
    <AIAssistantComponent
      {...hookProps}
      isFeatureEnabled={isFeatureEnabled}
      className={props.className}
      onSuggestionFeedback={handleSuggestionFeedback}
    />
  );
});

const AIAssistant: React.FunctionComponent<IAIAssistantProps> = (props) => (
  <ErrorBoundary
    fallbackRender={() => <></>}
    onError={(error: Error) => {
      if (store.onErrorCallback) store.onErrorCallback('AIAssistant', error);
    }}
  >
    <AIAssistantInternal {...props} />
  </ErrorBoundary>
);

export {AIAssistant};
