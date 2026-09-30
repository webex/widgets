import React, {useCallback} from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {AIAssistantComponent} from '@webex/cc-components';
import {useAiAssistant, REAL_TIME_ASSIST_FLAG} from '../helper';
import {useWellnessBreak} from '../wellness/useWellnessBreak';
import {loadWellnessAnimation} from '../wellness/animation';
import {IAIAssistantProps} from '../ai-assistant.types';

const AIAssistantInternal: React.FunctionComponent<IAIAssistantProps> = observer((props) => {
  const {
    currentTask,
    agentId,
    agentProfile,
    featureFlags,
    realTimeAssist,
    isWellnessBreakEnabled,
    isAgentLoggedIn,
    wellnessAgentSessionId,
    wellbeingBreakIdleCode,
    wellnessBreakState,
    wellnessEventSequence,
    legacyAgentState,
    legacyAuxCodeId,
    taskList,
    currentTheme,
  } = store;
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
  const wellness = useWellnessBreak({
    ...props,
    enabled: Boolean(isWellnessBreakEnabled),
    isLoggedIn: Boolean(isAgentLoggedIn),
    agentId: agentId || '',
    agentSessionId: wellnessAgentSessionId || '',
    wellbeingBreakIdleCode,
    wellnessBreakState: wellnessBreakState || {phase: 'idle'},
    wellnessEventSequence: wellnessEventSequence || 0,
    legacyAgentState: legacyAgentState || '',
    legacyAuxCodeId: legacyAuxCodeId || '',
    taskList: taskList || {},
    theme: currentTheme || 'light',
  });
  const clearContent = useCallback(() => {
    hookProps.clearTranscript();
    wellness.onClearHistory?.();
  }, [hookProps.clearTranscript, wellness.onClearHistory]);
  const hasClearableContent = Boolean(
    hookProps.chatEntries.length ||
      wellness.history?.length ||
      (!wellness.contentCleared &&
        (wellness.requestAvailable ||
          wellness.notice ||
          wellness.error ||
          ['offer-pending', 'request-pending', 'changing-to-break', 'waiting-for-safe-state', 'restoring'].includes(
            wellness.phase
          )))
  );

  return (
    <AIAssistantComponent
      {...hookProps}
      isFeatureEnabled={isFeatureEnabled}
      hasActiveInteraction={Boolean(interactionId)}
      agentName={agentProfile?.agentName}
      logger={store.logger}
      className={props.className}
      wellnessBreakOverlayTarget={props.wellnessBreakOverlayTarget}
      wellness={wellness}
      loadWellnessAnimation={loadWellnessAnimation}
      clearContent={clearContent}
      hasClearableContent={hasClearableContent}
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
