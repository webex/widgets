import React, {useEffect, useRef} from 'react';
import * as AdaptiveCards from 'adaptivecards';
import {Text} from '@momentum-design/components/dist/react';
import {ErrorBoundary, useErrorBoundary} from 'react-error-boundary';
import {AdaptiveCardRendererProps, AIAssistantActionEvent} from '../ai-assistant.types';
import {buildHostConfig, prepareCardForRender, resolveMomentumIconUrl} from './adaptive-card-renderer.utils';

const MODULE = 'cc-components/AdaptiveCardRenderer';

// Preload regular + filled variants so the like/dislike/copy toggles don't
// wait on a network roundtrip on the first click.
const PRELOAD_ICONS = [
  'like-regular.svg',
  'like-filled.svg',
  'dislike-regular.svg',
  'dislike-filled.svg',
  'copy-regular.svg',
  'check-circle-filled.svg',
];
let iconsPreloaded = false;
const preloadIcons = () => {
  if (iconsPreloaded || typeof Image === 'undefined') return;
  iconsPreloaded = true;
  PRELOAD_ICONS.forEach((name) => {
    const iconUrl = resolveMomentumIconUrl(name);
    if (!iconUrl) return;
    const img = new Image();
    img.src = iconUrl;
  });
};

/** Concatenate TextBlocks in the rendered card as a clipboard fallback. */
const extractCardText = (container: HTMLElement): string => {
  const blocks = container.querySelectorAll('.ac-textBlock, .ac-richTextBlock');
  const lines: string[] = [];
  blocks.forEach((el) => {
    const text = (el.textContent || '').trim();
    if (text && text !== 'Source') lines.push(text);
  });
  return lines.join('\n');
};

type IconKind = 'like' | 'dislike' | 'copy' | null;

const ICON_NAME_RE = /([\w-]+)-(regular|bold|filled|light)\.svg(\?|$|#)/i;

const detectIconKind = (element: Element): IconKind => {
  const img = element.querySelector('img');
  const src = img?.getAttribute('src') || '';
  const m = src.match(ICON_NAME_RE);
  const base = m ? m[1].toLowerCase() : '';
  const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
  const title = (element.getAttribute('title') || '').toLowerCase();
  const haystack = `${ariaLabel} ${title} ${base}`;
  if (/\bcopy\b/.test(haystack) || base === 'copy') return 'copy';
  if (/\bdislike\b|thumbs-down/.test(haystack) || base === 'dislike') return 'dislike';
  if (/\blike\b|thumbs-up/.test(haystack) || base === 'like') return 'like';
  return null;
};

const addImageFallbacks = (container: HTMLElement) => {
  container.querySelectorAll('img').forEach((img) => {
    img.onerror = () => {
      const context = `${img.alt} ${img.parentElement?.textContent || ''}`.toLowerCase();
      const sourceIconUrl = resolveMomentumIconUrl('link-regular.svg');
      img.onerror = null;
      if (context.includes('source') && sourceIconUrl) {
        img.src = sourceIconUrl;
      } else {
        img.hidden = true;
      }
    };
  });
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

    const handleCopy = async (sourceEl?: Element) => {
      const text = (suggestionTextRef.current || extractCardText(container)).trim();
      if (!text) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Legacy fallback for non-secure contexts.
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        const img = sourceEl?.querySelector('img');
        if (sourceEl && img) {
          const previousSrc = img.getAttribute('src');
          const copiedIconUrl = resolveMomentumIconUrl('check-circle-filled.svg');
          if (copiedIconUrl) {
            img.setAttribute('src', copiedIconUrl);
          }
          sourceEl.setAttribute('data-copied', 'true');
          setTimeout(() => {
            sourceEl.removeAttribute('data-copied');
            if (previousSrc) img.setAttribute('src', previousSrc);
          }, 1500);
        }
      } catch (err) {
        loggerRef.current?.error(`CC-Components: copy to clipboard failed - ${err}`, {
          module: MODULE,
          method: 'handleCopy',
        });
      }
    };

    /** Snapshot the like/dislike controls so a failed action can be undone. */
    const captureControlState = (controls: Map<Element, IconKind>) => {
      const snapshot = Array.from(controls.keys()).map((el) => ({
        el,
        active: el.getAttribute('data-active'),
        src: el.querySelector('img')?.getAttribute('src') ?? null,
      }));
      return () => {
        snapshot.forEach(({el, active, src}) => {
          if (active) {
            el.setAttribute('data-active', active);
          } else {
            el.removeAttribute('data-active');
          }
          const img = el.querySelector('img');
          if (img && src) img.setAttribute('src', src);
        });
      };
    };

    const toggleAction = (kind: 'like' | 'dislike', controls: Map<Element, IconKind>) => {
      controls.forEach((thisKind, el) => {
        if (thisKind !== 'like' && thisKind !== 'dislike') return;
        const active = el.getAttribute('data-active') === 'true';
        const isThis = thisKind === kind;
        // Mutually exclusive: clicking the active one clears it; clicking the other flips.
        const nextActive = isThis ? !active : false;
        const img = el.querySelector('img');
        if (img) {
          const nextIconUrl = resolveMomentumIconUrl(`${thisKind}-${nextActive ? 'filled' : 'regular'}.svg`);
          if (nextIconUrl) {
            img.setAttribute('src', nextIconUrl);
          }
        }
        if (nextActive) {
          el.setAttribute('data-active', 'true');
        } else {
          el.removeAttribute('data-active');
        }
      });
    };

    try {
      const controls = new Map<Element, IconKind>();
      const getControl = (kind: Exclude<IconKind, null>): Element | undefined =>
        Array.from(controls.entries()).find(([, controlKind]) => controlKind === kind)?.[0];
      const adaptiveCard = new AdaptiveCards.AdaptiveCard();
      adaptiveCard.hostConfig = new AdaptiveCards.HostConfig(buildHostConfig());
      // The toggle is optimistic; `revert` puts the icons back if the host
      // reports that the action never reached the backend.
      const emitUserAction = (event: AIAssistantActionEvent, revert?: () => void) => {
        const result = onUserActionRef.current?.(event);
        if (!revert || !result || typeof (result as Promise<void>).catch !== 'function') return;
        (result as Promise<void>).catch(() => revert());
      };

      adaptiveCard.onExecuteAction = (action) => {
        const a = action as {id?: string; title?: string};
        const label = `${a?.id || ''} ${a?.title || ''}`.toLowerCase();
        const actionId = a?.id || a?.title || '';
        if (label.includes('copy')) {
          void handleCopy(getControl('copy'));
          emitUserAction({type: 'copy', actionId});
          return;
        }
        if (label.includes('dislike') || label.includes('like')) {
          const kind = label.includes('dislike') ? 'dislike' : 'like';
          const revert = captureControlState(controls);
          toggleAction(kind, controls);
          emitUserAction({type: kind, actionId}, revert);
          return;
        }
        onActionRef.current?.(action);
      };
      adaptiveCard.parse(prepareCardForRender(card, publishTimestamp, assistantTitle));
      const rendered = adaptiveCard.render();
      if (rendered) {
        container.appendChild(rendered);
        addImageFallbacks(container);

        // Visual-state wiring for the like/dislike/copy controls.
        container.querySelectorAll('button, [role="button"], a').forEach((el) => {
          const kind = detectIconKind(el);
          if (!kind) return;
          controls.set(el, kind);
          (el as HTMLElement).style.cursor = 'pointer';
          const existingLabel = el.getAttribute('aria-label');
          if (!existingLabel) {
            const labels: Record<Exclude<IconKind, null>, string> = {
              like: 'Like suggestion',
              dislike: 'Dislike suggestion',
              copy: 'Copy suggestion',
            };
            el.setAttribute('aria-label', labels[kind]);
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
