import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {AISummaryEntry, AISummaryFeedback} from '@webex/cc-store';
import {AI_SUMMARY_EDITABLE_SECTION_KEYS} from '@webex/cc-store';
import type {AIAssistantActionEvent} from '../ai-assistant.types';
import {
  AI_ASSISTANT_SUMMARY_MESSAGES,
  AI_ASSISTANT_SUMMARY_MODES,
  AI_ASSISTANT_SUMMARY_SECTION_ORDER,
} from './ai-summary.constants';
import {copyToClipboard, extractCardText, getNextFeedback} from '../AdaptiveCardRenderer/adaptive-card-renderer.utils';
import {COPIED_FEEDBACK_MS} from '../constants';
import type {AISummaryDisplaySection, AISummaryProps} from './ai-summary.types';

let summarySequence = 0;

/** The summary's sections in display order, with the read-only post-call resolution among them. */
export const getDisplaySections = (content: NonNullable<AISummaryEntry['content']>): AISummaryDisplaySection[] =>
  AI_ASSISTANT_SUMMARY_SECTION_ORDER.flatMap((key): AISummaryDisplaySection[] => {
    if (key === 'resolution') {
      return content.resolution?.trim() ? [{key, value: content.resolution}] : [];
    }
    const value = content.sections?.[key];
    return value === undefined ? [] : [{key, value}];
  });

const flattenContentForCopy = (content: NonNullable<AISummaryEntry['content']>): string => {
  if (!content.sections) {
    return content.summaryText ?? '';
  }
  return getDisplaySections(content)
    .filter((section) => section.value.trim().length > 0)
    .map((section) => `${AI_ASSISTANT_SUMMARY_MESSAGES.sectionLabels[section.key]}: ${section.value}`)
    .join('\n\n');
};

// Local edits are a presentation overlay; retain the SDK payload as the action identity.
const getDisplayContent = (props: AISummaryProps): AISummaryEntry['content'] => {
  const {content} = props;
  if (!content || props.mode === AI_ASSISTANT_SUMMARY_MODES.MID_CALL_RECEIVER || props.editedSummary === undefined) {
    return content;
  }
  return typeof props.editedSummary === 'string'
    ? {...content, summaryText: props.editedSummary}
    : {...content, sections: {...content.sections, ...props.editedSummary}};
};

export const useAISummaryInteractions = (props: AISummaryProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const displayContent = getDisplayContent(props);
  const [editingContent, setEditingContent] = useState<AISummaryEntry['content']>();
  const hasEdits =
    typeof props.editedSummary === 'string'
      ? props.editedSummary !== (props.content?.summaryText ?? '')
      : Boolean(props.editedSummary && Object.keys(props.editedSummary).length);
  const isEditing = Boolean(props.onEdit && props.content && (editingContent === props.content || hasEdits));
  const startEditing = () => {
    if (props.state === 'content' && props.onEdit && !props.controlsDisabled) {
      setEditingContent(props.content);
    }
  };
  // Compare the copied text, so response bookkeeping does not reset copy feedback.
  const copyText =
    props.mode === AI_ASSISTANT_SUMMARY_MODES.MID_CALL_RECEIVER || !displayContent
      ? undefined
      : flattenContentForCopy(displayContent);
  const latestPropsRef = useRef({props, copyText});
  useLayoutEffect(() => {
    latestPropsRef.current = {props, copyText};
  });
  const [copied, setCopied] = useState(false);
  const [summaryId] = useState(() => {
    summarySequence += 1;
    return summarySequence;
  });
  const disabled = Boolean(props.controlsDisabled);
  const selectedFeedback = props.selectedFeedback ?? 'none';

  useEffect(() => {
    setCopied(false);
  }, [props.content, props.mode, props.state, copyText]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    if (disabled || props.state !== 'content' || !props.onCopy) {
      return;
    }
    setCopied(false);
    const text =
      props.mode === AI_ASSISTANT_SUMMARY_MODES.MID_CALL_RECEIVER && rootRef.current
        ? extractCardText(rootRef.current, {summaryOnly: true})
        : copyText;
    if (!text?.trim() || !(await copyToClipboard(text))) {
      return;
    }
    // Clipboard writes can finish after another summary or local edit is displayed.
    // Keep completion local to the content and visible values that initiated the copy.
    const {props: current, copyText: currentCopyText} = latestPropsRef.current;
    if (
      !rootRef.current ||
      current.state !== 'content' ||
      current.mode !== props.mode ||
      current.content !== props.content ||
      currentCopyText !== copyText ||
      !current.onCopy
    ) {
      return;
    }
    setCopied(props.onCopy());
  };

  const handleFeedback = (feedback: Exclude<AISummaryFeedback, 'none'>) => {
    if (!disabled && props.state === 'content') {
      props.onFeedback?.(getNextFeedback(selectedFeedback, feedback));
    }
  };

  const hiddenActionIds = [
    ...(!props.onEdit ? ['editButton'] : []),
    ...(!props.onCopy ? ['copyButton'] : []),
    ...(!props.onFeedback ? ['likeButton', 'dislikeButton'] : []),
    ...(!props.onRetry ? ['retryButton'] : []),
  ];

  const handleRetry = () => {
    if (!disabled && props.onRetry) void props.onRetry().catch(() => undefined);
  };

  const handleCardAction = (action: unknown) => {
    if (!action || typeof action !== 'object' || !('id' in action)) return;
    if (action.id === 'editButton') startEditing();
    if (action.id === 'retryButton') handleRetry();
  };

  const handleInput = (key: string, value: string) => {
    if (disabled || !isEditing || !props.onEdit) return;
    const section = props.content?.sections
      ? AI_SUMMARY_EDITABLE_SECTION_KEYS.find((section) => section === key)
      : 'summaryText';
    if (section) props.onEdit(section, value);
  };

  const handleCardRendered = (ready: boolean) => {
    if (ready && isEditing && !disabled) {
      rootRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')?.focus();
    }
  };

  const handleCardUserAction = (event: AIAssistantActionEvent) => {
    if (disabled) return;
    if (event.type === 'copy') {
      props.onCopy?.();
      return;
    }
    props.onFeedback?.(event.feedback === 'none' ? 'none' : event.type === 'like' ? 'thumbs_up' : 'thumbs_down');
  };

  return {
    rootRef,
    displayContent,
    copyText,
    isEditing,
    startEditing,
    hiddenActionIds,
    handleRetry,
    handleCardAction,
    handleInput,
    handleCardUserAction,
    handleCardRendered,
    copied,
    setCopied,
    summaryId,
    disabled,
    selectedFeedback,
    handleCopy,
    handleFeedback,
  };
};
