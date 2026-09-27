type RawAISummaryFeedback = 'none' | 'thumbs_up' | 'thumbs_down';
type RawAISummaryState = 'DEFAULT' | 'EXCLUDED' | 'IGNORED' | 'MID_CALL_CANCELLED' | 'NOT_RECEIVED';
type RawAISummarySectionKey =
  | 'initialContactReason'
  | 'additionalContactReasons'
  | 'additionalContext'
  | 'keyActionsTaken'
  | 'nextSteps'
  | 'reasonForTransferOrConsult';
type RawAISummarySections = Readonly<
  Partial<Record<RawAISummarySectionKey, string>> & {
    readonly [key: string]: string | undefined;
  }
>;
type RawAdaptiveCard = Readonly<Record<string, unknown>>;
type RawAISummary = {
  readonly conversationId: string;
  readonly adaptiveCard?: RawAdaptiveCard;
  readonly adaptiveCardId?: string;
  readonly editAdaptiveCard?: RawAdaptiveCard;
  readonly editAdaptiveCardId?: string;
  readonly areTranscriptsAvailable?: boolean;
  readonly languageCode?: string;
  readonly resolution?: string;
  readonly sections?: RawAISummarySections;
  readonly suggestedWrapUpCodes?: readonly Readonly<{readonly name: string}>[];
  readonly suggestedWrapUpCodesMessage?: string;
  readonly summaryText?: string;
  readonly timestamp?: number;
};
type RawAISummaryFeatureEnablement = {
  readonly interactionId: string;
  readonly midCallEnabled?: boolean;
  readonly postCallEnabled?: boolean;
  readonly actionTimestamp?: number;
};
type RawAISummaryCounters = {
  readonly viewed: number;
  readonly edited: number;
  readonly copied: number;
};
type RawAISummaryResponseCounters = {
  readonly numberOfTimesViewed: number;
  readonly numberOfTimesEdited: number;
  readonly numberOfTimesCopied: number;
};
type RawAISummaryResponse = RawAISummaryResponseCounters & {
  readonly summary: RawAISummarySections | string;
  readonly feedback: RawAISummaryFeedback;
  readonly state: RawAISummaryState;
  readonly summaryReceived?: boolean;
  readonly wrapUpCode?: string;
};
type RawVoidSettlement =
  | {
      readonly type: 'fulfilled';
      readonly value: undefined;
    }
  | {
      readonly type: 'rejected';
      readonly reason: Readonly<Record<string, unknown>>;
    };

const MAIN_INTERACTION_ID = 'interaction-main-1';
const OTHER_INTERACTION_ID = 'other-interaction';

const featureEnablement = {
  enabled: {
    interactionId: MAIN_INTERACTION_ID,
    midCallEnabled: true,
    postCallEnabled: true,
    actionTimestamp: 1000,
  },
  disabled: {
    interactionId: MAIN_INTERACTION_ID,
    midCallEnabled: false,
    postCallEnabled: false,
    actionTimestamp: 1001,
  },
  midCallOnly: {
    interactionId: MAIN_INTERACTION_ID,
    midCallEnabled: true,
    postCallEnabled: false,
    actionTimestamp: 1002,
  },
  postCallOnly: {
    interactionId: MAIN_INTERACTION_ID,
    midCallEnabled: false,
    postCallEnabled: true,
    actionTimestamp: 1003,
  },
  flagsOmitted: {
    interactionId: MAIN_INTERACTION_ID,
    actionTimestamp: 1004,
  },
  missingActionTimestamp: {
    interactionId: MAIN_INTERACTION_ID,
    midCallEnabled: false,
    postCallEnabled: false,
  },
  staleOlderEnabled: {
    interactionId: MAIN_INTERACTION_ID,
    midCallEnabled: true,
    postCallEnabled: true,
    actionTimestamp: 900,
  },
  mismatchedInteraction: {
    interactionId: OTHER_INTERACTION_ID,
    midCallEnabled: true,
    postCallEnabled: true,
    actionTimestamp: 1005,
  },
} as const satisfies Readonly<Record<string, RawAISummaryFeatureEnablement>>;

const initiatingMidCall = {
  typedSections: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 2000,
    languageCode: 'en-US',
    areTranscriptsAvailable: true,
    sections: {
      reasonForTransferOrConsult: 'Customer needs billing help.',
      additionalContext: 'Invoice discrepancy is the active topic.',
      keyActionsTaken: 'Verified account and checked invoice.',
      rawExtraIgnored: 'This raw SDK extension is not a declared display section.',
    },
    summaryText: 'Customer needs billing help. Verified account and checked invoice.',
  },
  plainText: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 2001,
    languageCode: 'en-US',
    areTranscriptsAvailable: true,
    summaryText: 'Customer needs billing help. Verified account and checked invoice.',
  },
  cardOnlyUnsupported: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 2002,
    languageCode: 'en-US',
    areTranscriptsAvailable: true,
    adaptiveCardId: 'mid-call-initiator-card-only',
    adaptiveCard: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [{type: 'TextBlock', text: 'Card-only initiator summary'}],
    },
  },
} as const satisfies Readonly<Record<string, RawAISummary>>;

const receivingMidCall = {
  adaptiveCard: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 2100,
    languageCode: 'en-US',
    areTranscriptsAvailable: true,
    summaryText: 'Receiver text must be ignored when a card is present.',
    sections: {
      reasonForTransferOrConsult: 'Receiver typed sections must be ignored.',
      additionalContext: 'Receiver additional context must be ignored.',
      keyActionsTaken: 'Receiver actions must be ignored.',
    },
    adaptiveCardId: 'mid-call-receiver-card',
    adaptiveCard: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {type: 'TextBlock', text: 'Customer needs billing help.'},
        {type: 'TextBlock', text: 'Invoice discrepancy is the active topic.'},
      ],
    },
  },
  remoteImageWithText: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 2101,
    languageCode: 'en-US',
    adaptiveCardId: 'mid-call-receiver-remote-image-text',
    adaptiveCard: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {type: 'Image', url: 'https://example.invalid/customer.png', altText: 'Remote image'},
        {type: 'TextBlock', text: 'Text remains after remote image sanitization.'},
      ],
    },
  },
  remoteImageOnly: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 2102,
    languageCode: 'en-US',
    adaptiveCardId: 'mid-call-receiver-remote-image-only',
    adaptiveCard: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [{type: 'Image', url: 'https://example.invalid/only.png', altText: 'Remote image only'}],
    },
  },
  typedOnlyUnsupported: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 2103,
    languageCode: 'en-US',
    sections: {
      reasonForTransferOrConsult: 'Typed receiver payload.',
    },
  },
  plainOnlyUnsupported: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 2104,
    languageCode: 'en-US',
    summaryText: 'Plain receiver payload.',
  },
} as const satisfies Readonly<Record<string, RawAISummary>>;

const postCall = {
  structured: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 3000,
    languageCode: 'en-US',
    areTranscriptsAvailable: true,
    sections: {
      initialContactReason: 'Customer called about an invoice discrepancy.',
      additionalContactReasons: 'Customer also asked about late fees.',
      additionalContext: 'Customer is positive about the correction.',
      keyActionsTaken: 'Send corrected invoice by email.',
      nextSteps: 'Confirm receipt tomorrow.',
      rawExtraIgnored: 'This raw SDK extension is not a declared display section.',
    },
    summaryText: 'Customer called about an invoice discrepancy. Send corrected invoice by email.',
    resolution: 'Billing adjustment prepared',
  },
  plainText: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 3001,
    languageCode: 'en-US',
    areTranscriptsAvailable: true,
    summaryText: 'Customer called about an invoice discrepancy. Send corrected invoice by email.',
  },
  cardOnlyUnsupported: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 3002,
    languageCode: 'en-US',
    areTranscriptsAvailable: true,
    adaptiveCardId: 'post-call-card-only',
    adaptiveCard: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [{type: 'TextBlock', text: 'Card-only post-call summary'}],
    },
  },
  resolutionPresent: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 3003,
    languageCode: 'en-US',
    sections: {
      initialContactReason: 'Customer asked for an invoice correction.',
      nextSteps: 'Email the corrected invoice.',
    },
    summaryText: 'Customer asked for an invoice correction. Email the corrected invoice.',
    resolution: 'Correction approved',
  },
  resolutionAbsent: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 3003,
    languageCode: 'en-US',
    sections: {
      initialContactReason: 'Customer asked for an invoice correction.',
      nextSteps: 'Email the corrected invoice.',
    },
    summaryText: 'Customer asked for an invoice correction. Email the corrected invoice.',
  },
  resolutionUndefinedBoundary: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 3004,
    languageCode: 'en-US',
    sections: {
      initialContactReason: 'Boundary fixture.',
    },
    summaryText: 'Boundary fixture.',
    resolution: undefined,
  },
  resolutionEmptyBoundary: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 3005,
    languageCode: 'en-US',
    sections: {
      initialContactReason: 'Boundary fixture.',
    },
    summaryText: 'Boundary fixture.',
    resolution: '',
  },
} as const satisfies Readonly<Record<string, RawAISummary>>;

const malformed = {
  featureEnablementNonNumericActionTimestamp: {
    interactionId: MAIN_INTERACTION_ID,
    midCallEnabled: true,
    postCallEnabled: true,
    actionTimestamp: '1002',
  },
  featureEnablementNonBooleanFlag: {
    interactionId: MAIN_INTERACTION_ID,
    midCallEnabled: 'true',
    postCallEnabled: false,
    actionTimestamp: 1002,
  },
  featureEnablementMissingInteraction: {
    midCallEnabled: true,
    postCallEnabled: true,
    actionTimestamp: 1003,
  },
  sectionsNotRecord: {conversationId: MAIN_INTERACTION_ID, sections: 'not-a-record'},
  sectionValueNotString: {
    conversationId: MAIN_INTERACTION_ID,
    sections: {initialContactReason: ['not-a-string']},
  },
  emptySummaryText: {conversationId: MAIN_INTERACTION_ID, summaryText: ''},
  inventedUnsupportedPayload: {conversationId: MAIN_INTERACTION_ID, unsupported: true},
  responseWithSummaryText: {
    conversationId: MAIN_INTERACTION_ID,
    feedback: 'like',
    summaryText: 'Final committed post-call summary.',
  },
} as const;

const errors = {
  unauthorized: {response: {status: 401}},
  initialization: {
    message: 'AI_ASSISTANT_BASE_URL_NOT_AVAILABLE',
    data: {errorCode: 'AI_ASSISTANT_BASE_URL_NOT_AVAILABLE'},
  },
  offline: {code: 'ERR_NETWORK'},
  unavailable: {status: 503},
  empty: {conversationId: MAIN_INTERACTION_ID, summaryText: ''},
  disabled: {
    message: 'MID_CALL_SUMMARY_DISABLED',
    data: {errorCode: 'MID_CALL_SUMMARY_DISABLED'},
  },
  timeout: {
    message: 'POST_CALL_SUMMARY_TIMEOUT',
    data: {errorCode: 'POST_CALL_SUMMARY_TIMEOUT'},
  },
  generic: {message: 'unexpected failure'},
} as const;

const ordering = {
  presentGreaterTimestamp: {
    previous: {conversationId: MAIN_INTERACTION_ID, timestamp: 10, summaryText: 'older'},
    incoming: {conversationId: MAIN_INTERACTION_ID, timestamp: 20, summaryText: 'newer'},
    expectedAccepted: 'incoming',
  },
  presentEqualTimestamp: {
    previous: {conversationId: MAIN_INTERACTION_ID, timestamp: 20, summaryText: 'first'},
    incoming: {conversationId: MAIN_INTERACTION_ID, timestamp: 20, summaryText: 'last'},
    expectedAccepted: 'incoming',
  },
  presentLowerTimestamp: {
    previous: {conversationId: MAIN_INTERACTION_ID, timestamp: 20, summaryText: 'newer'},
    incoming: {conversationId: MAIN_INTERACTION_ID, timestamp: 10, summaryText: 'older'},
    expectedAccepted: 'previous',
  },
  omittedTimestampPair: {
    previous: {conversationId: MAIN_INTERACTION_ID, summaryText: 'first omitted'},
    incoming: {conversationId: MAIN_INTERACTION_ID, summaryText: 'second omitted'},
    expectedAccepted: 'incoming-by-arrival',
  },
  mixedPresentOmitted: {
    previous: {conversationId: MAIN_INTERACTION_ID, timestamp: 20, summaryText: 'present'},
    incoming: {conversationId: MAIN_INTERACTION_ID, summaryText: 'omitted'},
    expectedAccepted: 'incoming-by-arrival',
  },
  mixedOmittedPresent: {
    previous: {conversationId: MAIN_INTERACTION_ID, summaryText: 'omitted'},
    incoming: {conversationId: MAIN_INTERACTION_ID, timestamp: 20, summaryText: 'present'},
    expectedAccepted: 'incoming-by-arrival',
  },
  staleOlderFeatureEnablement: {
    previous: featureEnablement.enabled,
    incoming: featureEnablement.staleOlderEnabled,
    expectedAccepted: 'previous',
  },
  matchingConversation: {
    expectedInteractionId: MAIN_INTERACTION_ID,
    payload: {conversationId: MAIN_INTERACTION_ID, summaryText: 'Matching payload.'},
  },
  mismatchedConversation: {
    expectedInteractionId: MAIN_INTERACTION_ID,
    payload: {conversationId: OTHER_INTERACTION_ID, summaryText: 'Mismatched payload.'},
  },
  missingConversation: {
    expectedInteractionId: MAIN_INTERACTION_ID,
    payload: {summaryText: 'Missing conversation payload.'},
  },
  lateSuccessAfterTimeout: {
    requestId: 'request-timeout-1',
    ownerRole: 'post-call',
    deadlineMs: 15000,
    timeout: {type: 'timeout', observedAtMs: 15000},
    lateSettlement: {
      type: 'success',
      observedAtMs: 15001,
      timestamp: 999999,
      payload: {conversationId: MAIN_INTERACTION_ID, summaryText: 'Late success must be stale.'},
    },
  },
} as const;

const transfers = {
  consult: {actionType: 'CONSULT', agentId: 'agent-b', destinationId: 'billing-agent'},
  transfer: {actionType: 'TRANSFER', agentId: 'agent-c', destinationId: 'billing-queue'},
  consultToTransferPromotion: {
    initialActionType: 'CONSULT',
    promotedActionType: 'TRANSFER',
    interactionId: MAIN_INTERACTION_ID,
  },
  agentAToBToC: {
    interactionId: MAIN_INTERACTION_ID,
    hops: [
      {
        fromAgentId: 'agent-a',
        toAgentId: 'agent-b',
        actionType: 'CONSULT',
        ownershipGeneration: 1,
        summary: {...initiatingMidCall.typedSections, timestamp: 2200},
      },
      {
        fromAgentId: 'agent-b',
        toAgentId: 'agent-c',
        actionType: 'TRANSFER',
        ownershipGeneration: 2,
        summary: {
          ...initiatingMidCall.plainText,
          timestamp: 2201,
          summaryText: 'Agent B transferred the billing follow-up to Agent C.',
        },
      },
    ],
    expectedFinalAgentId: 'agent-c',
  },
} as const;

const conferences = {
  stableMain: {
    task: {
      data: {
        agentId: 'agent-a',
        interactionId: 'leg-consult-1',
        interaction: {
          mainInteractionId: MAIN_INTERACTION_ID,
          interactionId: 'leg-consult-1',
          mediaType: 'telephony',
          media: {
            'media-main': {mType: 'mainCall', mediaResourceId: MAIN_INTERACTION_ID},
          },
        },
      },
    },
    expectedInteractionId: MAIN_INTERACTION_ID,
  },
  mainInteractionIdOnly: {
    task: {
      data: {
        agentId: 'agent-a',
        interactionId: 'leg-consult-1',
        interaction: {
          mainInteractionId: MAIN_INTERACTION_ID,
          interactionId: 'leg-consult-1',
          mediaType: 'telephony',
          media: {
            'media-consult': {mType: 'consult', mediaResourceId: 'leg-consult-1'},
          },
        },
      },
    },
    expectedInteractionId: MAIN_INTERACTION_ID,
  },
  mainCallMediaOnly: {
    task: {
      data: {
        agentId: 'agent-a',
        interactionId: 'leg-consult-1',
        interaction: {
          interactionId: 'leg-consult-1',
          mediaType: 'telephony',
          media: {
            'media-main': {mType: 'mainCall', mediaResourceId: MAIN_INTERACTION_ID},
          },
        },
      },
    },
    expectedInteractionId: MAIN_INTERACTION_ID,
  },
  conflictingStableCandidates: {
    task: {
      data: {
        agentId: 'agent-a',
        interaction: {
          mainInteractionId: MAIN_INTERACTION_ID,
          media: {
            'media-main': {mType: 'mainCall', mediaResourceId: 'interaction-main-2'},
          },
        },
      },
    },
  },
  mainAliasRejected: {
    task: {
      data: {
        agentId: 'agent-a',
        interaction: {
          interactionId: 'leg-consult-1',
          mediaType: 'telephony',
          media: {
            'media-main': {mType: 'main', mediaResourceId: MAIN_INTERACTION_ID},
          },
        },
      },
    },
  },
  mapKeyOnlyRejected: {
    task: {
      data: {
        agentId: 'agent-a',
        interaction: {
          interactionId: 'leg-consult-1',
          mediaType: 'telephony',
          media: {
            [MAIN_INTERACTION_ID]: {mType: 'mainCall'},
          },
        },
      },
    },
  },
  legScopedOnlyRejected: {
    task: {
      data: {
        agentId: 'agent-a',
        interactionId: 'leg-only-1',
        interaction: {
          interactionId: 'leg-only-1',
          mediaType: 'telephony',
          media: {},
        },
      },
    },
  },
  twoPartyHost: {
    canonicalInteractionId: 'interaction-conference-1',
    participantInitiationOrder: ['agent-a', 'agent-b', 'agent-c'],
    events: [
      {type: 'conference-joined', agentId: 'agent-a'},
      {type: 'conference-joined', agentId: 'agent-b'},
      {type: 'conference-joined', agentId: 'agent-c'},
      {type: 'participant-left', agentId: 'agent-b'},
    ],
    sdkProjection: {
      mediaType: 'telephony',
      media: {
        'media-main': {
          mType: 'mainCall',
          participants: ['agent-a', 'agent-c', 'customer-1'],
        },
      },
      participants: {
        'agent-a': {pType: 'Agent', hasJoined: true, hasLeft: false},
        'agent-b': {pType: 'Agent', hasJoined: true, hasLeft: true},
        'agent-c': {pType: 'Agent', hasJoined: true, hasLeft: false},
        'customer-1': {pType: 'Customer', hasJoined: true, hasLeft: false},
      },
    },
    expectedHostAgentId: 'agent-a',
  },
  agentAToBToC: {
    canonicalInteractionId: 'interaction-conference-a-b-c',
    ownerSequence: [
      {agentId: 'agent-a', ownershipGeneration: 1},
      {agentId: 'agent-b', ownershipGeneration: 2},
      {agentId: 'agent-c', ownershipGeneration: 3},
    ],
    sdkProjection: {
      mediaType: 'telephony',
      media: {
        'media-main': {
          mType: 'mainCall',
          participants: ['agent-a', 'agent-b', 'agent-c', 'customer-1'],
        },
      },
      participants: {
        'agent-a': {pType: 'Agent', hasJoined: true, hasLeft: false},
        'agent-b': {pType: 'Agent', hasJoined: true, hasLeft: false},
        'agent-c': {pType: 'Agent', hasJoined: true, hasLeft: false},
        'customer-1': {pType: 'Customer', hasJoined: true, hasLeft: false},
      },
    },
  },
} as const;

const feedback = {
  none: {feedback: 'none'},
  thumbsUp: {feedback: 'thumbs_up'},
  thumbsDown: {feedback: 'thumbs_down'},
  toggleBackToNone: {
    previousFeedback: 'thumbs_up',
    feedback: 'none',
  },
} as const satisfies Readonly<
  Record<
    string,
    | {readonly feedback: RawAISummaryFeedback}
    | {readonly previousFeedback: RawAISummaryFeedback; readonly feedback: RawAISummaryFeedback}
  >
>;

const counters = {
  zero: {viewed: 0, edited: 0, copied: 0},
  viewed: {viewed: 1, edited: 0, copied: 0},
  edited: {viewed: 0, edited: 1, copied: 0},
  copied: {viewed: 0, edited: 0, copied: 1},
  viewedEditedCopied: {viewed: 1, edited: 1, copied: 1},
  responseProjection: {
    viewed: 1,
    edited: 1,
    copied: 1,
    response: {
      numberOfTimesViewed: 1,
      numberOfTimesEdited: 1,
      numberOfTimesCopied: 1,
    },
  },
  receivedResponseProjection: {
    viewed: 1,
    edited: 0,
    copied: 1,
    response: {
      numberOfTimesViewed: 1,
      numberOfTimesEdited: 0,
      numberOfTimesCopied: 1,
      summaryReceived: true,
    },
  },
} as const satisfies Readonly<
  Record<
    string,
    RawAISummaryCounters & {
      readonly response?: RawAISummaryResponseCounters & {readonly summaryReceived?: boolean};
    }
  >
>;

const wrapUp = {
  distinctReasonAndCode: {
    wrapUpReason: 'Billing follow-up',
    auxCodeId: 'aux-code-billing-follow-up',
  },
  agentWrappedUp: {
    event: 'AgentWrappedUp',
    interactionId: MAIN_INTERACTION_ID,
    agentId: 'agent-a',
  },
} as const;

const postWrapUpSummaryResponse = {
  summary: {
    initialContactReason: 'Customer called about an invoice discrepancy.',
    additionalContactReasons: 'Customer also asked about late fees.',
    additionalContext: 'Customer is positive about the correction.',
    keyActionsTaken: 'Send corrected invoice by email.',
    nextSteps: 'Confirm receipt tomorrow.',
  },
  feedback: 'thumbs_up',
  state: 'DEFAULT',
  numberOfTimesViewed: 1,
  numberOfTimesEdited: 0,
  numberOfTimesCopied: 0,
  summaryReceived: true,
  wrapUpCode: wrapUp.distinctReasonAndCode.auxCodeId,
} as const satisfies RawAISummaryResponse;

const postWrapUpSend = {
  fulfilled: {
    interactionId: MAIN_INTERACTION_ID,
    taskId: 'task-main-1',
    wrapupCall: {
      method: 'wrapup',
      payload: wrapUp.distinctReasonAndCode,
      settlement: {type: 'fulfilled', value: undefined},
    },
    sendCalls: [
      {
        method: 'sendPostCallSummaryResponse',
        payload: postWrapUpSummaryResponse,
        settlement: {type: 'fulfilled', value: undefined},
      },
    ],
    expectedAdmission: 'pass',
  },
  rejected: {
    interactionId: MAIN_INTERACTION_ID,
    taskId: 'task-main-1',
    wrapupCall: {
      method: 'wrapup',
      payload: wrapUp.distinctReasonAndCode,
      settlement: {type: 'fulfilled', value: undefined},
    },
    sendCalls: [
      {
        method: 'sendPostCallSummaryResponse',
        payload: postWrapUpSummaryResponse,
        settlement: {
          type: 'rejected',
          reason: {message: 'sendPostCallSummaryResponse unavailable after wrapup'},
        },
      },
    ],
    expectedAdmission: 'fail',
  },
} as const satisfies Readonly<
  Record<
    string,
    {
      readonly interactionId: string;
      readonly taskId: string;
      readonly wrapupCall: {
        readonly method: 'wrapup';
        readonly payload: typeof wrapUp.distinctReasonAndCode;
        readonly settlement: RawVoidSettlement;
      };
      readonly sendCalls: readonly [
        {
          readonly method: 'sendPostCallSummaryResponse';
          readonly payload: RawAISummaryResponse;
          readonly settlement: RawVoidSettlement;
        },
      ];
      readonly expectedAdmission: 'pass' | 'fail';
    }
  >
>;

export const aiSummaryFixtureGroupNames = [
  'featureEnablement',
  'initiatingMidCall',
  'receivingMidCall',
  'postCall',
  'malformed',
  'errors',
  'ordering',
  'transfers',
  'conferences',
  'feedback',
  'counters',
  'wrapUp',
  'postWrapUpSend',
] as const;

export type AISummaryFixtureGroupName = (typeof aiSummaryFixtureGroupNames)[number];

export const aiSummaryFixtures = {
  featureEnablement,
  initiatingMidCall,
  receivingMidCall,
  postCall,
  malformed,
  errors,
  ordering,
  transfers,
  conferences,
  feedback,
  counters,
  wrapUp,
  postWrapUpSend,
} as const;

type AISummaryFixtureGroups = typeof aiSummaryFixtures;
type ExactAISummaryFixtureGroupInventory = [
  Exclude<AISummaryFixtureGroupName, keyof AISummaryFixtureGroups>,
  Exclude<keyof AISummaryFixtureGroups, AISummaryFixtureGroupName>,
] extends [never, never]
  ? true
  : never;
const exactAISummaryFixtureGroupInventory: ExactAISummaryFixtureGroupInventory = true;
void exactAISummaryFixtureGroupInventory;
