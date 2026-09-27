import React from 'react';
import store from '@webex/cc-store';
import type {AISummaryViewModel} from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {AIAssistantComponent} from '@webex/cc-components';
import {useAiAssistant, REAL_TIME_ASSIST_FLAG} from '../helper';
import {AIAssistantReceiverSummary, IAIAssistantProps} from '../ai-assistant.types';

type ReceiverAISummaryViewModel = AISummaryViewModel & {
  midCallFeedbackPending?: boolean;
  ownerKey?: {interactionId: string; agentId: string; ownershipGeneration: number};
};

type ScopedAISummaryStore = typeof store & {
  recordAISummaryViewed(
    kind: 'mid-call',
    role: 'receiver',
    expectedRevision: number,
    task?: typeof store.currentTask
  ): boolean;
  recordAISummaryCopied(
    kind: 'mid-call',
    role: 'receiver',
    expectedRevision: number,
    task?: typeof store.currentTask
  ): boolean;
  setMidCallSummaryFeedback(
    role: 'receiver',
    feedback: 'like' | 'dislike',
    actionType: 'CONSULT' | 'TRANSFER',
    expectedRevision: number,
    task?: typeof store.currentTask
  ): Promise<{outcome: 'confirmed' | 'failed' | 'blocked' | 'stale'}>;
};

const AIAssistantInternal: React.FunctionComponent<IAIAssistantProps> = observer((props) => {
  const {currentTask, agentId, agentProfile, featureFlags, realTimeAssist} = store;
  const scopedStore = store as ScopedAISummaryStore;
  const interactionId = currentTask?.data?.interactionId;
  const isFeatureEnabled = Boolean(featureFlags?.[REAL_TIME_ASSIST_FLAG]);
  const activeRealTimeAssist = interactionId ? realTimeAssist?.[interactionId] || [] : [];
  const receiverView = store.getAISummaryViewModel?.('mid-call', 'receiver', currentTask) as
    | ReceiverAISummaryViewModel
    | undefined;
  const midCallFeedbackPending = receiverView?.midCallFeedbackPending === true;
  const receiverBranchKey = receiverView?.ownerKey
    ? `${receiverView.ownerKey.interactionId}:${receiverView.ownerKey.agentId}:${receiverView.ownerKey.ownershipGeneration}`
    : `${receiverView?.key ?? 'mid-call:receiver'}:${interactionId ?? 'none'}`;
  const receiverSummary: AIAssistantReceiverSummary | undefined =
    receiverView?.surface === 'content' &&
    receiverView.content?.type === 'card' &&
    receiverView.contentRevision !== undefined
      ? {
          surface: 'content',
          branchKey: receiverBranchKey,
          content: receiverView.content,
          contentRevision: receiverView.contentRevision,
          actionType: receiverView.actionType ?? 'TRANSFER',
          selectedFeedback: receiverView.feedback,
          midCallFeedbackPending,
          controlsDisabled: receiverView.requestPending || midCallFeedbackPending || !receiverView.actionType,
          openReceiverSummary: () =>
            scopedStore.recordAISummaryViewed?.('mid-call', 'receiver', receiverView.contentRevision, currentTask) ??
            false,
          recordReceiverSummaryCopied: (expectedRevision: number) =>
            scopedStore.recordAISummaryCopied?.('mid-call', 'receiver', expectedRevision, currentTask) ?? false,
          setReceiverSummaryFeedback: (feedback, actionType, expectedRevision) =>
            scopedStore.setMidCallSummaryFeedback?.('receiver', feedback, actionType, expectedRevision, currentTask) ??
            Promise.resolve({outcome: 'blocked'}),
        }
      : receiverView?.surface === 'unavailable' || receiverView?.surface === 'generic-error'
        ? {
            surface: receiverView.surface,
            branchKey: receiverBranchKey,
            openReceiverSummary: () => true,
          }
        : undefined;

  const hookProps = useAiAssistant({
    ...props,
    interactionId,
    agentId,
    isFeatureEnabled,
    realTimeAssist: activeRealTimeAssist,
    receiverSummary,
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
