import React, {useEffect, useRef} from 'react';
import * as AdaptiveCards from 'adaptivecards';
import {Text} from '@momentum-design/components/dist/react';
import {ErrorBoundary, useErrorBoundary} from 'react-error-boundary';
import type {AdaptiveCardRendererProps, AIAssistantActionKind} from '../ai-assistant.types';
import {
  addImageFallbacks,
  buildHostConfig,
  copyToClipboard,
  detectActionKind,
  extractCardText,
  getNextFeedback,
  preloadIcons,
  prepareCardForRender,
  setActionControls,
} from './adaptive-card-renderer.utils';

const CARD_CONTROL_LABELS: Record<AIAssistantActionKind, string> = {
  like: 'Like suggestion',
  dislike: 'Dislike suggestion',
  copy: 'Copy suggestion',
};

const AdaptiveCardFallback: React.FC<Pick<AdaptiveCardRendererProps, 'fallbackText'>> = ({fallbackText}) =>
  fallbackText ? (
    <Text
      tagname="p"
      type="body-midsize-regular"
      className="ai-assistant__card-fallback"
      data-testid="ai-assistant:adaptive-card-fallback"
    >
      {fallbackText}
    </Text>
  ) : null;

const AdaptiveCardRendererBody: React.FC<AdaptiveCardRendererProps> = (props) => {
  const {
    card,
    presentation = 'suggestion',
    contentIdentity,
    displayOnly = false,
    omitSourceTimestamp = false,
    assistantTitle,
    publishTimestamp,
  } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const {resetBoundary, showBoundary} = useErrorBoundary();
  // Adaptive Cards owns its DOM. Keep handlers and controlled options current
  // without reparsing the card and replacing a focused input.
  const propsRef = useRef(props);
  const updateCardRef = useRef<(() => void) | undefined>();
  useEffect(() => {
    propsRef.current = props;
    updateCardRef.current?.();
  });

  useEffect(() => {
    preloadIcons();
    const container = containerRef.current;
    if (!container) return undefined;
    if (!card) {
      propsRef.current.onRender?.(false);
      return undefined;
    }

    resetBoundary();
    container.innerHTML = '';
    let current = true;
    const isCurrent = () => current && container.isConnected;

    try {
      const controls = new Map<Element, AIAssistantActionKind>();
      let copyControl: Element | undefined;
      const adaptiveCard = new AdaptiveCards.AdaptiveCard();
      adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({
        ...buildHostConfig(presentation),
        supportsInteractivity: !displayOnly,
      });
      adaptiveCard.onExecuteAction = (action) => {
        if (!isCurrent() || propsRef.current.disabled || displayOnly) return;
        const a = action as {id?: string; title?: string};
        const kind = detectActionKind(a);
        const actionId = a?.id || a?.title || '';
        if (propsRef.current.hiddenActionIds?.includes(actionId)) return;
        if (kind === 'copy') {
          const text = (
            propsRef.current.suggestionText || extractCardText(container, {summaryOnly: presentation === 'summary'})
          ).trim();
          const onCopied = propsRef.current.onUserAction;
          const copying = copyToClipboard(text, copyControl, propsRef.current.logger, isCurrent);
          if (presentation !== 'summary') {
            onCopied?.({type: 'copy', actionId});
            return;
          }
          void copying
            .then((copied) => {
              if (copied && isCurrent()) return onCopied?.({type: 'copy', actionId});
              return undefined;
            })
            .catch(() => undefined);
          return;
        }
        if (kind === 'like' || kind === 'dislike') {
          const feedback = propsRef.current.feedback;
          const result = propsRef.current.onUserAction?.(
            feedback === undefined
              ? {type: kind, actionId}
              : {type: kind, actionId, feedback: getNextFeedback(feedback, kind)}
          );
          // Suggested responses keep their existing acknowledgement-driven toggle.
          const onSent = () => {
            if (propsRef.current.feedback !== undefined) return;
            const active = Array.from(controls).some(
              ([element, controlKind]) => controlKind === kind && element.getAttribute('data-active') === 'true'
            );
            setActionControls(active ? 'none' : kind, controls);
          };
          if (result && typeof result.then === 'function') {
            void result.then(onSent).catch(() => undefined);
          } else {
            onSent();
          }
          return;
        }
        propsRef.current.onAction?.(action);
      };
      adaptiveCard.onInputValueChanged = (input) => {
        if (!isCurrent() || propsRef.current.disabled || propsRef.current.readOnlyInputs || displayOnly) return;
        if (input.getJsonTypeName() === 'Input.Text' && input.id && typeof input.value === 'string') {
          propsRef.current.onInputChange?.(input.id, input.value);
        }
      };
      adaptiveCard.parse(prepareCardForRender(card, publishTimestamp, assistantTitle, omitSourceTimestamp));
      const rendered = adaptiveCard.render();
      if (rendered) {
        container.appendChild(rendered);
        addImageFallbacks(container);
        propsRef.current.onRender?.(true);

        // Keep each action's original presentation alongside its feedback control.
        const actions = adaptiveCard.getAllActions().flatMap((action) => {
          const element = action.renderedElement;
          if (!element) return [];
          const kind = detectActionKind(action);
          if (kind) {
            controls.set(element, kind);
            if (kind === 'copy') copyControl ??= element;
            element.style.cursor = 'pointer';
          }
          return [
            {
              action,
              element,
              kind,
              label: element.getAttribute('aria-label') || undefined,
              hidden: element.hidden,
              display: element.style.display,
            },
          ];
        });
        const inputs = adaptiveCard.getAllInputs().filter((input) => input.getJsonTypeName() === 'Input.Text');
        const nativeControls = Array.from(
          container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>(
            'input, textarea, select, button'
          )
        ).map((element) => ({
          element,
          disabled: element.disabled,
          readOnly:
            element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element.readOnly : false,
        }));
        const updateCard = () => {
          const options = propsRef.current;
          if (options.feedback !== undefined) setActionControls(options.feedback, controls);
          nativeControls.forEach(({element, disabled, readOnly}) => {
            element.disabled = Boolean(options.disabled || disabled);
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
              element.readOnly = Boolean(options.readOnlyInputs || readOnly);
            }
          });
          actions.forEach(({action, element, kind, label, hidden, display}) => {
            if (kind)
              element.setAttribute('aria-label', options.actionLabels?.[kind] ?? label ?? CARD_CONTROL_LABELS[kind]);
            const hideAction = Boolean(action.id && options.hiddenActionIds?.includes(action.id));
            element.hidden = hideAction || hidden;
            element.style.display = hideAction ? 'none' : display;
            element.setAttribute('aria-disabled', String(Boolean(options.disabled || action.isEnabled === false)));
          });
          inputs.forEach((input) => {
            if (!input.id) return;
            const value =
              typeof options.inputValues === 'string'
                ? inputs.length === 1
                  ? options.inputValues
                  : undefined
                : options.inputValues?.[input.id];
            const element = input.renderedElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
              'input, textarea'
            );
            if (value !== undefined && element && element.value !== value) element.value = value;
          });
        };
        updateCardRef.current = updateCard;
        updateCard();
      } else {
        throw new Error('Adaptive card render returned no DOM output.');
      }
    } catch (error) {
      propsRef.current.onRender?.(false);
      showBoundary(error instanceof Error ? error : new Error('Adaptive card rendering failed.'));
    }

    return () => {
      current = false;
      updateCardRef.current = undefined;
      container.innerHTML = '';
    };
  }, [
    assistantTitle,
    card,
    contentIdentity,
    displayOnly,
    omitSourceTimestamp,
    presentation,
    publishTimestamp,
    resetBoundary,
    showBoundary,
  ]);

  return <div ref={containerRef} className="ai-assistant__card-host" />;
};

const AdaptiveCardRenderer: React.FC<AdaptiveCardRendererProps> = (props) => {
  const {
    card,
    presentation = 'suggestion',
    contentIdentity,
    displayOnly = false,
    fallbackText,
    assistantTitle,
    footer,
  } = props;
  const isCustomerStatement = /^the customer said:?$/i.test(assistantTitle?.trim() ?? '');

  return (
    <div
      className={`ai-assistant__card${presentation === 'summary' ? ' ai-assistant__card--summary' : ''}${
        isCustomerStatement ? ' ai-assistant__card--customer-statement' : ''
      }`}
      data-testid="ai-assistant:adaptive-card"
    >
      <ErrorBoundary
        fallbackRender={() => <AdaptiveCardFallback fallbackText={fallbackText} />}
        resetKeys={displayOnly || contentIdentity !== undefined ? [card, contentIdentity] : undefined}
      >
        <AdaptiveCardRendererBody {...props} />
      </ErrorBoundary>
      {footer ? <div className="ai-assistant__card-footer">{footer}</div> : null}
    </div>
  );
};

export default AdaptiveCardRenderer;
