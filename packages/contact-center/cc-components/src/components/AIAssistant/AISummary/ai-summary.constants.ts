import type {AISummaryFeedbackButton, AISummarySectionKey} from './ai-summary.types';

export const AI_ASSISTANT_SUMMARY_MESSAGES = {
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
  },
} as const;

/** Presentation order for SDK sections and the read-only resolution. */
export const AI_ASSISTANT_SUMMARY_SECTION_ORDER = [
  'reasonForTransferOrConsult',
  'initialContactReason',
  'additionalContactReasons',
  'additionalContext',
  'keyActionsTaken',
  'resolution',
  'nextSteps',
] as const satisfies readonly (keyof typeof AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels)[];

export const AI_ASSISTANT_SUMMARY_FEEDBACK_BUTTONS = [
  {feedback: 'thumbs_up', icon: 'like', label: AI_ASSISTANT_SUMMARY_MESSAGES.like},
  {feedback: 'thumbs_down', icon: 'dislike', label: AI_ASSISTANT_SUMMARY_MESSAGES.dislike},
] as const satisfies readonly AISummaryFeedbackButton[];

export const AI_ASSISTANT_SUMMARY_BULLETED_SECTION_KEYS: ReadonlySet<AISummarySectionKey> = new Set([
  'additionalContactReasons',
  'keyActionsTaken',
  'nextSteps',
]);
