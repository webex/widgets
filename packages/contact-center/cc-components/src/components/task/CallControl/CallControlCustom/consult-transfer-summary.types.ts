import type {
  AISummaryActionType,
  AISummaryContent,
  AISummaryEditableField,
  AISummaryFeedback,
  AISummaryFeedbackResult,
  AISummaryRequestResult,
  AISummarySurface,
} from '@webex/cc-store';

export type ConsultTransferSummaryView = {
  state: AISummarySurface | 'generating';
  content: Extract<AISummaryContent, {type: 'sections' | 'text'}>;
  contentRevision: number;
  actionType: AISummaryActionType;
  selectedFeedback?: AISummaryFeedback;
  requestPending?: boolean;
  controlsDisabled?: boolean;
  onViewed?: (expectedRevision: number) => boolean;
  onEdit: (field: AISummaryEditableField, expectedRevision: number) => boolean;
  onCopy: (expectedRevision: number) => boolean;
  onFeedback: (
    feedback: Exclude<AISummaryFeedback, 'none'>,
    actionType: AISummaryActionType,
    expectedRevision: number
  ) => Promise<AISummaryFeedbackResult>;
};

export type ConsultTransferSummaryProps = {
  summary?: ConsultTransferSummaryView;
  requestMidCallSummary?: (actionType: AISummaryActionType) => Promise<AISummaryRequestResult>;
};
