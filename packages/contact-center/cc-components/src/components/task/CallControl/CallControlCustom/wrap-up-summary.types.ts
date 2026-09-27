import type {
  AISummaryContent,
  AISummaryEditableField,
  AISummaryFeedback,
  AISummaryFeedbackStatus,
  AISummaryRequestResult,
  AISummarySurface,
} from '@webex/cc-store';
import type {AISummaryCopyVisualState} from '../../../AISummary';

export type WrapUpSummaryReason = {
  id: string;
  name: string;
};

export type WrapUpSummaryView = {
  state: AISummarySurface;
  content: Extract<AISummaryContent, {type: 'sections' | 'text'}>;
  contentRevision: number;
  selectedFeedback?: AISummaryFeedback;
  feedbackStatus?: AISummaryFeedbackStatus;
  requestPending?: boolean;
  completionEscape?: boolean;
  controlsDisabled?: boolean;
  onViewed?: (expectedRevision: number) => boolean;
  onEdit: (field: AISummaryEditableField, expectedRevision: number) => boolean;
  onCopy: (expectedRevision: number) => boolean;
  onFeedback: (feedback: Exclude<AISummaryFeedback, 'none'>, expectedRevision: number) => boolean;
  onRetry: () => Promise<AISummaryRequestResult>;
  onCopyVisualStateChange: (state: AISummaryCopyVisualState) => void;
};

export type WrapUpSummaryProps = {
  reasons: readonly WrapUpSummaryReason[];
  summary?: WrapUpSummaryView;
  initialReasonId?: string;
  completionPending?: boolean;
  completionEscape?: boolean;
  onReasonChange?: (reason: WrapUpSummaryReason, selectionRevision: number) => void;
  onReasonCommit: (reason: WrapUpSummaryReason, selectionRevision: number) => void;
  onComplete: (reason: WrapUpSummaryReason) => void | Promise<unknown>;
};
