import type {RefObject, TextareaHTMLAttributes} from 'react';
import type {
  AISummaryActionType,
  AISummaryContent,
  AISummaryDisplaySection,
  AISummaryEditableField,
  AISummaryFeedback,
  AISummaryFeedbackResult,
  AISummaryFeedbackStatus,
  AISummaryRequestResult,
  AISummarySurface,
} from '@webex/cc-store';

export type AISummaryEditableContent = Extract<AISummaryContent, {type: 'sections' | 'text'}>;

export type AISummaryEditorProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> & {
  value: string;
};

export type AISummarySectionEditorProps = {
  section: AISummaryDisplaySection;
  disabled: boolean;
  onChange: (value: string) => void;
  onEditorBlur: () => void;
};

export type AISummaryCopyVisualState = 'idle' | 'hover' | 'confirmed';

export type AISummaryPresentationState = Exclude<AISummarySurface, 'omitted'>;

type AISummaryBaseProps = {
  state: AISummaryPresentationState;
  requestPending?: boolean;
  controlsDisabled?: boolean;
  selectedFeedback?: AISummaryFeedback;
  containingPanelFocusTarget: RefObject<HTMLElement | null>;
};

type AISummaryFocusFallbackProps = {
  containingPanelFocusTarget: RefObject<HTMLElement | null>;
};

type AISummaryEditableActions = {
  content: AISummaryEditableContent;
  contentRevision: number;
  onEdit: (field: AISummaryEditableField, expectedRevision: number) => boolean;
  onCopy: (expectedRevision: number) => boolean;
};

type AISummaryMidCallFeedback = {
  actionType: AISummaryActionType;
  onFeedback: (
    feedback: Exclude<AISummaryFeedback, 'none'>,
    actionType: AISummaryActionType,
    expectedRevision: number
  ) => Promise<AISummaryFeedbackResult>;
};

export type AISummaryMidCallInitiatorProps = AISummaryBaseProps &
  AISummaryEditableActions &
  AISummaryMidCallFeedback & {
    mode: 'mid-call-initiator';
    onRetry?: never;
    onComplete?: never;
    onCopyVisualStateChange?: never;
  };

export type AISummaryMidCallReceiverReadyProps = AISummaryFocusFallbackProps &
  AISummaryMidCallFeedback & {
    mode: 'mid-call-receiver';
    state: 'content';
    requestPending?: boolean;
    controlsDisabled?: boolean;
    selectedFeedback?: AISummaryFeedback;
    contentRevision: number;
    getReceiverCopyText: () => string;
    onCopy: (expectedRevision: number) => boolean;
    content?: never;
    onEdit?: never;
    onRetry?: never;
    onComplete?: never;
    onCopyVisualStateChange?: never;
  };

export type AISummaryMidCallReceiverNonReadyProps = AISummaryFocusFallbackProps & {
  mode: 'mid-call-receiver';
  state: Exclude<AISummaryPresentationState, 'content'>;
  requestPending?: never;
  controlsDisabled?: never;
  selectedFeedback?: never;
  contentRevision?: never;
  getReceiverCopyText?: never;
  onCopy?: never;
  actionType?: never;
  onFeedback?: never;
  content?: never;
  onEdit?: never;
  onRetry?: never;
  onComplete?: never;
  onCopyVisualStateChange?: never;
};

export type AISummaryMidCallReceiverProps = AISummaryMidCallReceiverReadyProps | AISummaryMidCallReceiverNonReadyProps;

export type AISummaryPostCallProps = AISummaryBaseProps &
  AISummaryEditableActions & {
    mode: 'post-call';
    feedbackStatus?: AISummaryFeedbackStatus;
    onFeedback: (feedback: Exclude<AISummaryFeedback, 'none'>, expectedRevision: number) => boolean;
    onRetry: () => Promise<AISummaryRequestResult>;
    onComplete?: () => void;
    onCopyVisualStateChange: (state: AISummaryCopyVisualState) => void;
    actionType?: never;
    getReceiverCopyText?: never;
  };

export type AISummaryProps = AISummaryMidCallInitiatorProps | AISummaryMidCallReceiverProps | AISummaryPostCallProps;
