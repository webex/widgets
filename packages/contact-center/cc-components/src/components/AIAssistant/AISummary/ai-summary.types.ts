import type {AISummaryEntry, AISummaryFeedback, AISummaryResponse, AISummarySections} from '@webex/cc-store';
import type {AI_ASSISTANT_SUMMARY_MODES} from './ai-summary.constants';

export type AISummarySectionKey = keyof AISummarySections | 'resolution';

export type AISummaryDisplaySection = {key: AISummarySectionKey; value: string};

export type AISummaryPresentationState = 'generating' | 'unavailable' | 'generic-error' | 'content';

export type AISummaryMode = (typeof AI_ASSISTANT_SUMMARY_MODES)[keyof typeof AI_ASSISTANT_SUMMARY_MODES];

export type AISummaryFeedbackButton = {
  feedback: Exclude<AISummaryFeedback, 'none'>;
  icon: string;
  label: string;
};

export interface AISummaryProps {
  mode: AISummaryMode;
  state: AISummaryPresentationState;
  controlsDisabled?: boolean;
  selectedFeedback?: AISummaryFeedback;
  content?: AISummaryEntry['content'];
  editedSummary?: AISummaryResponse['summary'];
  onCopy?: () => boolean;
  onFeedback?: (feedback: AISummaryFeedback) => void;
  onEdit?: (key: keyof AISummarySections | 'summaryText', value: string) => void;
  onRetry?: () => Promise<void>;
}
