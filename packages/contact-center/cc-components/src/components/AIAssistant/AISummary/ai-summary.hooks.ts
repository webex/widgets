import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {FocusEvent} from 'react';
import type {AISummaryEntry, AISummaryFeedback} from '@webex/cc-store';
import {AI_ASSISTANT_SUMMARY_MESSAGES, AI_ASSISTANT_SUMMARY_SECTION_ORDER} from './ai-summary.constants';
import {COPIED_FEEDBACK_MS} from '../constants';
import type {AISummaryDisplaySection, AISummaryProps, AISummaryTooltipControl} from './ai-summary.types';

const useReactId = (React as typeof React & {useId: () => string}).useId;

const isEnabledFocusTarget = (element: HTMLElement): boolean =>
  element.isConnected &&
  !element.hasAttribute('disabled') &&
  element.getAttribute('aria-disabled') !== 'true' &&
  element.tabIndex >= 0;

const getEnabledControls = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]')).filter(
    isEnabledFocusTarget
  );

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

export const useAISummaryInteractions = (props: AISummaryProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const latestPropsRef = useRef(props);
  useLayoutEffect(() => {
    latestPropsRef.current = props;
  });
  const focusedControlRef = useRef<HTMLElement | null>(null);
  const successorRef = useRef<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<AISummaryTooltipControl | null>(null);
  const [, scheduleFocusRestoration] = useState(0);
  const summaryId = useReactId();
  const feedbackDescriptionId = `ai-summary-feedback-${summaryId}`;
  const disabled = Boolean(props.controlsDisabled || props.requestPending);
  const selectedFeedback = props.selectedFeedback ?? 'none';

  const clearFocusSnapshot = () => {
    focusedControlRef.current = null;
    successorRef.current = null;
  };

  const handleLocalControlRemoval = () => {
    scheduleFocusRestoration((revision) => revision + 1);
  };

  useEffect(() => {
    setCopied(false);
  }, [props.content, props.mode, props.state]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (hoveredTooltip === null) {
      return undefined;
    }
    const dismissTooltip = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setHoveredTooltip(null);
      }
    };
    document.addEventListener('keydown', dismissTooltip, true);
    return () => document.removeEventListener('keydown', dismissTooltip, true);
  }, [hoveredTooltip]);

  useLayoutEffect(() => {
    const focused = focusedControlRef.current;
    if (!focused || focused.isConnected) {
      return;
    }
    const successor = successorRef.current;
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      activeElement !== document.body &&
      activeElement.isConnected &&
      !(successor !== null && activeElement === successor && !isEnabledFocusTarget(successor))
    ) {
      clearFocusSnapshot();
      return;
    }
    if (successor && isEnabledFocusTarget(successor)) {
      successor.focus();
      if (document.activeElement === successor && isEnabledFocusTarget(successor)) {
        clearFocusSnapshot();
        return;
      }
    }
    props.containingPanelFocusTarget.current?.focus();
    clearFocusSnapshot();
  });

  const handleFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const controls = rootRef.current ? getEnabledControls(rootRef.current) : [];
    const index = controls.indexOf(target);
    focusedControlRef.current = target;
    successorRef.current = index >= 0 ? (controls[index + 1] ?? null) : null;
  };

  const handleBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    const root = rootRef.current;
    if (
      relatedTarget instanceof HTMLElement &&
      relatedTarget !== document.body &&
      relatedTarget.isConnected &&
      root &&
      !root.contains(relatedTarget)
    ) {
      clearFocusSnapshot();
    }
  };

  const handleCopy = async () => {
    if (disabled || props.state !== 'content') {
      return;
    }
    setHoveredTooltip(null);
    setCopied(false);
    try {
      const text =
        props.mode === 'mid-call-receiver'
          ? props.getReceiverCopyText()
          : props.content
            ? flattenContentForCopy(props.content)
            : '';
      if (text.trim().length === 0) {
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    // Clipboard writes can finish after another SDK summary is displayed.
    // Keep completion local to the content and surface that initiated the copy.
    const current = latestPropsRef.current;
    if (
      !rootRef.current ||
      current.state !== 'content' ||
      current.mode !== props.mode ||
      current.content !== props.content
    ) {
      return;
    }
    setCopied(props.onCopy());
  };

  const handleFeedback = (feedback: Exclude<AISummaryFeedback, 'none'>) => {
    if (!disabled && props.state === 'content') {
      props.onFeedback(feedback);
    }
  };

  const handleActionMouseEnter = (control: AISummaryTooltipControl) => {
    if (!disabled && !(control === 'copy' && copied)) {
      setHoveredTooltip(control);
    }
  };

  const handleActionMouseLeave = (control: AISummaryTooltipControl) => {
    if (hoveredTooltip === control) {
      setHoveredTooltip(null);
    }
  };

  return {
    rootRef,
    copied,
    setCopied,
    hoveredTooltip,
    setHoveredTooltip,
    summaryId,
    feedbackDescriptionId,
    disabled,
    selectedFeedback,
    handleLocalControlRemoval,
    handleFocusCapture,
    handleBlurCapture,
    handleCopy,
    handleFeedback,
    handleActionMouseEnter,
    handleActionMouseLeave,
  };
};
