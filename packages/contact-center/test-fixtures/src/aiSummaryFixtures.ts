import type {AISummaryEntry} from '@webex/cc-store';

type AISummary = NonNullable<AISummaryEntry['content']>;

const MAIN_INTERACTION_ID = 'interaction-main-1';

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
} as const satisfies Readonly<Record<string, AISummary>>;

const receivingMidCall = {
  adaptiveCard: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 2100,
    languageCode: 'en-US',
    areTranscriptsAvailable: true,
    summaryText: 'Transferred billing inquiry: invoice correction needed.',
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
  typedOnlyUnsupported: {
    conversationId: MAIN_INTERACTION_ID,
    timestamp: 2103,
    languageCode: 'en-US',
    sections: {
      reasonForTransferOrConsult: 'Typed receiver payload.',
    },
  },
} as const satisfies Readonly<Record<string, AISummary>>;

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
} as const satisfies Readonly<Record<string, AISummary>>;

export const aiSummaryFixtures = {initiatingMidCall, receivingMidCall, postCall} as const;
