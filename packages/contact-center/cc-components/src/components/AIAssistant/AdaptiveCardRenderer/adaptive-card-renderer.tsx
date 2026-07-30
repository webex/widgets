import React, {useEffect, useRef} from 'react';
import * as AdaptiveCards from 'adaptivecards';
import {Text} from '@momentum-design/components/dist/react';
import {ErrorBoundary, useErrorBoundary} from 'react-error-boundary';
import {AdaptiveCardRendererProps, AIAssistantActionEvent, AIAssistantActionKind} from '../ai-assistant.types';
import {
  addImageFallbacks,
  buildHostConfig,
  copySuggestion,
  detectActionKind,
  extractCardText,
  preloadIcons,
  prepareCardForRender,
  toggleActionControls,
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

const AdaptiveCardRendererBody: React.FC<AdaptiveCardRendererProps> = ({
  card,
  assistantTitle,
  publishTimestamp,
  suggestionText,
  onUserAction,
  onAction,
  logger,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const {resetBoundary, showBoundary} = useErrorBoundary();

  // Stash callbacks in refs so the render effect only re-runs when the card
  // itself changes — fresh inline parent callbacks would otherwise force a
  // full re-parse and re-fetch of every image on each render.
  const onUserActionRef = useRef(onUserAction);
  const onActionRef = useRef(onAction);
  const suggestionTextRef = useRef(suggestionText);
  const loggerRef = useRef(logger);
  useEffect(() => {
    onUserActionRef.current = onUserAction;
    onActionRef.current = onAction;
    suggestionTextRef.current = suggestionText;
    loggerRef.current = logger;
  });

  useEffect(() => {
    preloadIcons();
    const container = containerRef.current;
    if (!container || !card) return undefined;

    resetBoundary();
    container.innerHTML = '';

    try {
      const controls = new Map<Element, AIAssistantActionKind>();
      const getControl = (kind: AIAssistantActionKind): Element | undefined =>
        Array.from(controls.entries()).find(([, controlKind]) => controlKind === kind)?.[0];
      const adaptiveCard = new AdaptiveCards.AdaptiveCard();
      adaptiveCard.hostConfig = new AdaptiveCards.HostConfig(buildHostConfig());
      // `onSent` runs once the host confirms the action reached the backend, so
      // the control never shows a selection the SDK didn't record.  Hosts that
      // return nothing are treated as immediate success.
      const emitUserAction = (event: AIAssistantActionEvent, onSent?: () => void) => {
        const result = onUserActionRef.current?.(event);
        if (!onSent) return;
        if (result && typeof (result as Promise<void>).then === 'function') {
          (result as Promise<void>).then(onSent).catch(() => undefined);
        } else {
          onSent();
        }
      };

      adaptiveCard.onExecuteAction = (action) => {
        const a = action as {id?: string; title?: string};
        const kind = detectActionKind(a);
        const actionId = a?.id || a?.title || '';
        if (kind === 'copy') {
          const text = (suggestionTextRef.current || extractCardText(container)).trim();
          void copySuggestion(text, getControl('copy'), loggerRef.current);
          emitUserAction({type: 'copy', actionId});
          return;
        }
        if (kind === 'like' || kind === 'dislike') {
          emitUserAction({type: kind, actionId}, () => toggleActionControls(kind, controls));
          return;
        }
        onActionRef.current?.(action);
      };
      adaptiveCard.parse(prepareCardForRender(card, publishTimestamp, assistantTitle));
      const rendered = adaptiveCard.render();
      if (rendered) {
        container.appendChild(rendered);
        addImageFallbacks(container);

        // Visual-state wiring for the like/dislike/copy controls.  Adaptive
        // Cards owns the rendered buttons, so ask it which element belongs to
        // which action rather than inferring it from the DOM.
        adaptiveCard.getAllActions().forEach((action) => {
          const el = action.renderedElement;
          const kind = detectActionKind(action);
          if (!el || !kind) return;
          controls.set(el, kind);
          el.style.cursor = 'pointer';
          // The payload sends an empty title, so Adaptive Cards leaves these
          // buttons without an accessible name.
          if (!el.getAttribute('aria-label')) {
            el.setAttribute('aria-label', CARD_CONTROL_LABELS[kind]);
          }
        });
      } else {
        showBoundary(new Error('Adaptive card render returned no DOM output.'));
      }
    } catch (error) {
      showBoundary(error instanceof Error ? error : new Error('Adaptive card rendering failed.'));
    }

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [assistantTitle, card, publishTimestamp, resetBoundary, showBoundary]);

  return <div ref={containerRef} className="ai-assistant__card-host" />;
};

const AdaptiveCardRenderer: React.FC<AdaptiveCardRendererProps> = ({
  card,
  assistantTitle,
  fallbackText,
  publishTimestamp,
  suggestionText,
  onUserAction,
  onAction,
  logger,
}) => {
  const isCustomerStatement = /^the customer said:?$/i.test(assistantTitle?.trim() ?? '');

  return (
    <div
      className={`ai-assistant__card${isCustomerStatement ? ' ai-assistant__card--customer-statement' : ''}`}
      data-testid="ai-assistant:adaptive-card"
    >
      <ErrorBoundary fallbackRender={() => <AdaptiveCardFallback fallbackText={fallbackText} />}>
        <AdaptiveCardRendererBody
          card={card}
          assistantTitle={assistantTitle}
          fallbackText={fallbackText}
          publishTimestamp={publishTimestamp}
          suggestionText={suggestionText}
          onUserAction={onUserAction}
          onAction={onAction}
          logger={logger}
        />
      </ErrorBoundary>
    </div>
  );
};

export default AdaptiveCardRenderer;
