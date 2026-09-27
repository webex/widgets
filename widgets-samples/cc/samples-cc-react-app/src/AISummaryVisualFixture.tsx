import React, {useMemo, useState} from 'react';
import type {AISummaryContent, AISummaryEditableField} from '@webex/cc-store';
import {applyVisualSummaryEdit, createPostCallVisualContent} from './ai-summary-visual-content';
import {IconProvider, ThemeProvider} from '@momentum-design/components/dist/react';
import {CallControlComponent, CallControlComponentProps, CallControlAISummaryProps} from '@webex/cc-components';

type AISummaryVisualFixtureProps = {
  stateId: string;
};

const enabled = {isVisible: true, isEnabled: true};
const hidden = {isVisible: false, isEnabled: false};

const logger = {
  log: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  trace: () => undefined,
} as CallControlComponentProps['logger'];

const createControls = (postCall: boolean, transfer = false): CallControlComponentProps['controls'] => ({
  activeLeg: 'main',
  main: {
    accept: hidden,
    decline: hidden,
    hold: hidden,
    transfer: !postCall && transfer ? enabled : hidden,
    consult: !postCall && !transfer ? enabled : hidden,
    end: hidden,
    mute: hidden,
    recording: hidden,
    wrapup: postCall ? enabled : hidden,
    conference: hidden,
    exitConference: hidden,
    mergeToConference: hidden,
    consultTransfer: hidden,
    transferConference: hidden,
    endConsult: hidden,
    switch: hidden,
  },
  consult: {
    accept: hidden,
    decline: hidden,
    hold: hidden,
    transfer: hidden,
    consult: hidden,
    end: hidden,
    mute: hidden,
    recording: hidden,
    wrapup: hidden,
    conference: hidden,
    exitConference: hidden,
    mergeToConference: hidden,
    consultTransfer: hidden,
    transferConference: hidden,
    endConsult: hidden,
    switch: hidden,
  },
  consultTransferDestinations: {
    consult: ['agent', 'queue', 'dialNumber', 'entryPoint'],
    transfer: ['agent', 'queue', 'dialNumber', 'entryPoint'],
  },
});

const MID_CALL_CONTENT = {
  type: 'text' as const,
  summaryText:
    'Customer Joanna Smith called regarding an unexpected $29.99 charge labeled “Service Fee” on her credit card statement dated last Friday. She does not recognize the charge and doesn’t recall signing up for any related service or subscription.',
};

const POST_CALL_EDITING_CONTENT = {
  type: 'text' as const,
  summaryText:
    'Customer called in after misplacing their debit card and noticing unauthorized ATM withdrawal attempts. Verified account ownership through security questions.\n\nImmediately blocked the compromised card to prevent further misuse. Created and submitted a replacement card request. Provided temporary guidance on accessing funds through online transfer and advised monitoring account activity via mobile app. Customer to activate the replacement card when delivered in 3-5 business days. Support team will follow up with the fraud department to reimburse unauthorized charges. Resolved',
};

const POST_CALL_READY_CONTENT = createPostCallVisualContent();

const VISUAL_FIXTURE_STATE_IDS = new Set([
  'JNY-001:mid-call-summary',
  'JNY-002:generating',
  'JNY-002:editing',
  'JNY-002:like-hover',
  'JNY-002:like-selected',
  'JNY-002:dislike-hover',
  'JNY-002:dislike-selected',
  'JNY-002:copy-hover',
  'JNY-002:copy-selected',
  'JNY-002:error',
  'post-call:canonical-copy',
]);

type VisualBuddyAgent = NonNullable<CallControlComponentProps['buddyAgents']>[number];

const createVisualBuddyAgent = (agentId: string, agentName: string, dn: string): VisualBuddyAgent => ({
  agentId,
  agentName,
  state: 'Available',
  teamId: 'team-1',
  siteId: 'site-1',
  dn,
});

const VISUAL_BUDDY_AGENTS: CallControlComponentProps['buddyAgents'] = [
  createVisualBuddyAgent('billing-agent', 'Billing Agent', '1001'),
  createVisualBuddyAgent('support-agent', 'Support Agent', '1002'),
  createVisualBuddyAgent('accounts-agent', 'Accounts Agent', '1003'),
  createVisualBuddyAgent('webex-agent', 'Webex Agent', '1004'),
  createVisualBuddyAgent('card-services-agent', 'Card Services Agent', '1005'),
  createVisualBuddyAgent('retention-agent', 'Retention Agent', '1006'),
  createVisualBuddyAgent('activation-agent', 'Activation Agent', '1007'),
  createVisualBuddyAgent('fraud-agent', 'Fraud Agent', '1008'),
];

const summaryState = (stateId: string): 'generating' | 'generic-error' | 'unavailable' | 'content' => {
  if (stateId.includes('generating') || stateId.includes('pending-')) return 'generating';
  if (stateId.includes('error')) return 'generic-error';
  if (stateId.includes('unavailable')) return 'unavailable';
  return 'content';
};

const isPostCallState = (stateId: string): boolean =>
  !(stateId.startsWith('JNY-001:') || stateId.startsWith('mid-call:') || stateId.startsWith('initiating:'));

const createAISummary = (
  stateId: string,
  postCall: boolean,
  content: Exclude<AISummaryContent, {type: 'card'}>,
  onEdit: (field: AISummaryEditableField, revision: number) => boolean
): CallControlAISummaryProps => {
  const state = summaryState(stateId);
  const selectedFeedback: 'like' | 'dislike' | 'none' = stateId.includes('dislike-selected')
    ? 'dislike'
    : stateId.includes('like-selected')
      ? 'like'
      : 'none';

  if (!postCall) {
    const transfer = stateId.includes('transfer');
    const summary = {
      state,
      content,
      contentRevision: 1,
      actionType: transfer ? ('TRANSFER' as const) : ('CONSULT' as const),
      selectedFeedback,
      requestPending: state === 'generating',
      onEdit,
      onCopy: () => true,
      onFeedback: async () => ({outcome: 'confirmed' as const}),
    };
    return {
      ...(transfer ? {transfer: summary} : {consult: summary}),
      requestMidCallSummary: async () => ({outcome: 'accepted' as const, revision: 1}),
      sendMidCallSummaryBeforeAction: async () => ({outcome: 'sent' as const}),
    };
  }

  return {
    postCall: {
      state,
      content,
      contentRevision: 1,
      selectedFeedback,
      feedbackStatus: stateId.includes('feedback-pending') ? 'pending' : undefined,
      requestPending: state === 'generating',
      onEdit,
      onCopy: () => true,
      onFeedback: () => true,
      onRetry: async () => ({outcome: 'accepted', revision: 2}),
      onCopyVisualStateChange: () => undefined,
    },
    onPostCallReasonCommit: () => undefined,
  };
};

const currentTask = (postCall: boolean, transfer: boolean) =>
  ({
    data: {
      interactionId: 'ai-summary-visual-interaction',
      interaction: {
        interactionId: 'ai-summary-visual-interaction',
        mediaType: 'telephony',
        mediaChannel: 'telephony',
        state: postCall ? 'wrapup' : 'connected',
      },
    },
    uiControls: createControls(postCall, transfer),
    autoWrapup: undefined,
  }) as CallControlComponentProps['currentTask'];

const emptyAsyncResult = async () => undefined;

const AISummaryVisualFixture: React.FC<AISummaryVisualFixtureProps> = ({stateId}) => {
  if (!VISUAL_FIXTURE_STATE_IDS.has(stateId)) {
    throw new Error(`Unknown AI Summary visual fixture state: ${stateId}`);
  }

  const postCall = isPostCallState(stateId);
  const transfer = stateId.includes('transfer');
  const [content, setContent] = useState<Exclude<AISummaryContent, {type: 'card'}>>(() =>
    !postCall ? MID_CALL_CONTENT : stateId.includes('editing') ? POST_CALL_EDITING_CONTENT : POST_CALL_READY_CONTENT
  );
  const props = useMemo<CallControlComponentProps>(
    () => ({
      currentTask: currentTask(postCall, transfer),
      isHeld: false,
      toggleHold: () => undefined,
      toggleRecording: () => undefined,
      toggleMute: () => undefined,
      sendDtmf: () => undefined,
      isMuted: false,
      endCall: () => undefined,
      wrapupCall: async () => ({wrapup: 'succeeded', response: 'not-required'}),
      wrapupCodes: [
        {id: 'aux-code-account-freeze-unfreeze', name: 'Account freeze/unfreeze'},
        {id: 'aux-code-account-information-update', name: 'Account information update'},
        {id: 'aux-code-business-account-inquiry', name: 'Business account inquiry'},
        {id: 'aux-code-commercial-card-services', name: 'Commercial card services'},
        {id: 'aux-code-card-replacement-request', name: 'Card replacement request'},
        {id: 'aux-code-credit-limit-inquiry', name: 'Credit limit inquiry'},
        {id: 'aux-code-credit-card-activation', name: 'Credit card activation'},
        {id: 'aux-code-credit-card-application', name: 'Credit card application'},
        {id: 'aux-code-credit-card-cancellation', name: 'Credit card cancellation'},
        {id: 'aux-code-debit-card-application', name: 'Debit card application'},
      ] as CallControlComponentProps['wrapupCodes'],
      isRecording: false,
      setIsRecording: () => undefined,
      buddyAgents: VISUAL_BUDDY_AGENTS,
      loadingBuddyAgents: false,
      loadBuddyAgents: emptyAsyncResult,
      transferCall: emptyAsyncResult,
      consultCall: emptyAsyncResult,
      consultConference: emptyAsyncResult,
      switchToMainCall: emptyAsyncResult,
      switchToConsult: emptyAsyncResult,
      exitConference: emptyAsyncResult,
      endConsultCall: emptyAsyncResult,
      consultTransfer: emptyAsyncResult,
      callControlAudio: null,
      consultAgentName: VISUAL_BUDDY_AGENTS[0]?.agentName ?? 'Billing Agent',
      setConsultAgentName: () => undefined,
      holdTime: 0,
      startTimestamp: 0,
      stateTimerLabel: '',
      stateTimerTimestamp: 0,
      consultTimerLabel: '',
      consultTimerTimestamp: 0,
      allowConsultToQueue: true,
      lastTargetType: 'agent',
      setLastTargetType: () => undefined,
      controls: createControls(postCall, transfer),
      logger,
      cancelAutoWrapup: () => undefined,
      conferenceParticipants: [],
      aiSummary: createAISummary(stateId, postCall, content, (field, revision) => {
        if (revision !== 1) return false;
        setContent((current) => applyVisualSummaryEdit(current, field));
        return true;
      }),
      conferenceEnabled: false,
    }),
    [postCall, stateId, transfer, content]
  );

  return (
    <ThemeProvider themeclass="mds-theme-stable-lightWebex">
      <IconProvider iconSet="momentum-icons">
        <main
          className="ai-summary-visual-fixture mds-typography webexTheme"
          style={(() => {
            const width = Number(new URLSearchParams(window.location.search).get('ai-summary-panel-width'));
            return width >= 280 && width <= 1200
              ? ({'--cc-summary-panel-width': `${width}px`, marginInlineStart: '4rem'} as React.CSSProperties)
              : undefined;
          })()}
          data-ai-summary-evidence-root={stateId}
          data-production-component="CallControlComponent"
          data-render-kind="production-component"
          role="main"
        >
          <CallControlComponent {...props} />
        </main>
      </IconProvider>
    </ThemeProvider>
  );
};

export default AISummaryVisualFixture;
