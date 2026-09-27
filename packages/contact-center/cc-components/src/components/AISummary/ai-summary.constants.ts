import type {AISummaryPostCallDisplaySectionKey, AISummarySectionKey} from '@webex/cc-store';

const assertUniquePostCallDisplaySectionOrder = (order: readonly AISummaryPostCallDisplaySectionKey[]): void => {
  if (new Set(order).size !== order.length) {
    throw new Error(
      'POST_CALL_DISPLAY_SECTION_ORDER must include each AISummaryPostCallDisplaySectionKey exactly once.'
    );
  }
};

export const COPIED_FEEDBACK_MS = 1500;

export const AI_SUMMARY_MESSAGES = {
  viewSummary: 'View summary',
  generatingTitle: 'Generating summary...',
  generatingDescription: 'Just a sec—the details are coming together.',
  unavailable: 'The summary is not available',
  generationError: 'Having trouble generating summary',
  generationErrorDescription:
    'It could be a lost connection or something else. Could you check your connection or try again later?',
  copySummary: 'Copy Summary',
  copiedSummary: 'Copied',
  attribution: 'AI-generated',
  plainSummary: 'Summary',
  like: 'This is helpful',
  dislike: "This isn't helpful",
  likeDisplay: 'Like',
  dislikeDisplay: 'Dislike',
  retry: 'Retry',
  editSectionLabel: (label: string) => `Edit ${label}`,
  sectionLabels: {
    initialContactReason: 'Initial contact reason',
    additionalContactReasons: 'Additional contact reason(s)',
    additionalContext: 'Additional context',
    keyActionsTaken: 'Key Actions Taken',
    nextSteps: 'Next Steps',
    reasonForTransferOrConsult: 'Reason for transfer or consult',
    resolution: 'Outcome',
  },
  midCall: {
    consultHeading: 'Here’s a consult summary—they’ll get a copy',
    transferHeading: 'Here’s a transfer summary—they’ll get a copy.',
    searchPlaceholder: 'Search by name, queue, entry point or phone number',
    destinationCategory: 'Destination category',
    searchDestinations: 'Search destinations',
  },
  postCall: {
    eyebrow: 'Wrap up interaction',
    summaryHeading: 'Summary of your conversation',
    searchPlaceholder: 'Search topic',
    completeAction: 'Complete Wrap-Up',
    instructions: 'Choose a code, and click the summary to edit it if needed.',
    chooseReason: 'Choose a reason to wrap up',
    reasonSearchLabel: 'Search wrap-up reasons',
    noReasonMatches: 'No wrap-up reasons match your search.',
  },
  feedback: {
    pendingSubmission: 'Pending submission',
    submissionNotConfirmed: 'Submission not confirmed',
  },
} as const;

export const MID_CALL_SECTION_DEFINITIONS = [
  {key: 'reasonForTransferOrConsult', label: AI_SUMMARY_MESSAGES.sectionLabels.reasonForTransferOrConsult},
  {key: 'additionalContext', label: AI_SUMMARY_MESSAGES.sectionLabels.additionalContext},
  {key: 'keyActionsTaken', label: AI_SUMMARY_MESSAGES.sectionLabels.keyActionsTaken},
] as const satisfies readonly {key: AISummarySectionKey; label: string}[];

export const POST_CALL_SECTION_DEFINITIONS = [
  {key: 'initialContactReason', label: AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason},
  {key: 'additionalContactReasons', label: AI_SUMMARY_MESSAGES.sectionLabels.additionalContactReasons},
  {key: 'additionalContext', label: AI_SUMMARY_MESSAGES.sectionLabels.additionalContext},
  {key: 'keyActionsTaken', label: AI_SUMMARY_MESSAGES.sectionLabels.keyActionsTaken},
  {key: 'nextSteps', label: AI_SUMMARY_MESSAGES.sectionLabels.nextSteps},
] as const satisfies readonly {key: AISummarySectionKey; label: string}[];

export const POST_CALL_DISPLAY_SECTION_ORDER = [
  'initialContactReason',
  'additionalContactReasons',
  'additionalContext',
  'keyActionsTaken',
  'resolution',
  'nextSteps',
] as const satisfies readonly AISummaryPostCallDisplaySectionKey[];

type MissingPostCallDisplaySectionKeys = Exclude<
  AISummaryPostCallDisplaySectionKey,
  (typeof POST_CALL_DISPLAY_SECTION_ORDER)[number]
>;

const assertCompletePostCallDisplaySectionOrder = (
  missingKeys: Record<MissingPostCallDisplaySectionKeys, never>
): void => {
  void missingKeys;
};

assertCompletePostCallDisplaySectionOrder({});
assertUniquePostCallDisplaySectionOrder(POST_CALL_DISPLAY_SECTION_ORDER);
