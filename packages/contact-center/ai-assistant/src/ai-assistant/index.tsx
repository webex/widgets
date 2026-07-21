import React, {useCallback} from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {AIAssistantComponent} from '@webex/cc-components';
import type {AIAssistantFeedbackEvent} from '@webex/cc-components';
import type {RealTimeAssistPayload} from '@webex/cc-store';
import {useAiAssistant, REAL_TIME_ASSIST_FLAG} from '../helper';
import {IAIAssistantProps} from '../ai-assistant.types';

const AIAssistantInternal: React.FunctionComponent<IAIAssistantProps> = observer((props) => {
  const {currentTask, agentId, featureFlags, realTimeAssist} = store;
  const interactionId = currentTask?.data?.interactionId;
  const isFeatureEnabled = Boolean(featureFlags?.[REAL_TIME_ASSIST_FLAG]);
  const activeRealTimeAssist = interactionId ? realTimeAssist?.[interactionId] || [] : [];

  const hookProps = useAiAssistant({
    ...props,
    interactionId,
    agentId,
    isFeatureEnabled,
    realTimeAssist: activeRealTimeAssist,
  });

  const handleRealTimeAssistAction = useCallback(
    (event: AIAssistantFeedbackEvent, assist: RealTimeAssistPayload) => {
      const api = store.cc?.apiAIAssistant;
      const adaptiveCardId = assist?.data?.adaptiveCardId;
      if (!interactionId || !agentId || !adaptiveCardId || !api?.sendRealTimeAssistanceUserAction) return;

      void api
        .sendRealTimeAssistanceUserAction({
          agentId,
          interactionId,
          adaptiveCardId,
          actionId: event.actionId,
          languageCode: typeof assist?.data?.languageCode === 'string' ? assist.data.languageCode : undefined,
        })
        .catch((error) => {
          store.logger?.error(`CC-Widgets: sendRealTimeAssistanceUserAction failed - ${error}`, {
            module: 'ai-assistant/index.tsx',
            method: 'handleRealTimeAssistAction',
          });
        });
    },
    [agentId, interactionId]
  );

  return (
    <AIAssistantComponent
      {...hookProps}
      isFeatureEnabled={isFeatureEnabled}
      className={props.className}
      onRealTimeAssistAction={handleRealTimeAssistAction}
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
