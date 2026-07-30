import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {AIAssistantComponent} from '@webex/cc-components';
import {useAiAssistant, REAL_TIME_ASSIST_FLAG} from '../helper';
import {IAIAssistantProps} from '../ai-assistant.types';

const AIAssistantInternal: React.FunctionComponent<IAIAssistantProps> = observer((props) => {
  const {currentTask, agentId, agentProfile, featureFlags, realTimeAssist} = store;
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

  return (
    <AIAssistantComponent
      {...hookProps}
      isFeatureEnabled={isFeatureEnabled}
      hasActiveInteraction={Boolean(interactionId)}
      agentName={agentProfile?.agentName}
      logger={store.logger}
      className={props.className}
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
