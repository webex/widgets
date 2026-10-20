import type {ComponentProps, RefObject} from 'react';
import type {Textarea} from '@momentum-design/components/dist/react';
import type {AISummaryEntry, AISummaryFeedback, AISummaryResponse, AISummarySections} from '@webex/cc-store';
import type {AI_ASSISTANT_SUMMARY_MODES} from './ai-summary.constants';

export type AISummarySectionKey = keyof AISummarySections | 'resolution';

export type AISummaryDisplaySection = {key: AISummarySectionKey; value: string};

export type AISummaryTooltipControl = 'copy' | Exclude<AISummaryFeedback, 'none'>;

export type AISummaryFocusTarget = {control: HTMLElement; successor: HTMLElement | null};

export type AISummaryPresentationState = 'generating' | 'unavailable' | 'generic-error' | 'content';

export type AISummaryMode = (typeof AI_ASSISTANT_SUMMARY_MODES)[keyof typeof AI_ASSISTANT_SUMMARY_MODES];

export type AISummaryEditorProps = Pick<
  ComponentProps<typeof Textarea>,
  'className' | 'dir' | 'disabled' | 'label' | 'dataAriaLabel' | 'autoFocusOnMount' | 'onBlur'
> & {
  value: string;
  onChange: (value: string) => void;
};

export type AISummarySectionEditorProps = {
  section: AISummaryDisplaySection;
  disabled: boolean;
  onChange: (value: string) => void;
  onEditorClosed: () => void;
};

export type AISummaryFeedbackButton = {
  feedback: Exclude<AISummaryFeedback, 'none'>;
  icon: string;
  label: string;
};

export interface AISummaryProps {
  mode: AISummaryMode;
  state: AISummaryPresentationState;
  requestPending?: boolean;
  controlsDisabled?: boolean;
  selectedFeedback?: AISummaryFeedback;
  containingPanelFocusTarget: RefObject<HTMLElement | null>;
  content?: AISummaryEntry['content'];
  editedSummary?: AISummaryResponse['summary'];
  onCopy?: () => boolean;
  onFeedback?: (feedback: Exclude<AISummaryFeedback, 'none'>) => void;
  onEdit?: (key: keyof AISummarySections | 'summaryText', value: string) => void;
  onRetry?: () => Promise<void>;
  getReceiverCopyText?: () => string;
}
