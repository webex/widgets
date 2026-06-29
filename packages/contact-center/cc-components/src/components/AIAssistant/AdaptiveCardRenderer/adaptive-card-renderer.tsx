import React, {useEffect, useRef, useState} from 'react';
import * as AdaptiveCards from 'adaptivecards';
import {AdaptiveCardRendererProps} from '../ai-assistant.types';
import {buildHostConfig, prepareCardForRender} from './adaptive-card-renderer.utils';

const MOMENTUM_ICON_CDN = 'https://cdn.jsdelivr.net/npm/@momentum-design/icons/dist/svg/';

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
    const img = new Image();
    img.src = `${MOMENTUM_ICON_CDN}${name}`;
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

const swapIcon = (element: Element, newName: string): string | null => {
  const img = element.querySelector('img');
  if (!img) return null;
  const previous = img.getAttribute('src');
  img.setAttribute('src', `${MOMENTUM_ICON_CDN}${newName}`);
  return previous;
};

const AdaptiveCardRenderer: React.FC<AdaptiveCardRendererProps> = ({
  card,
  fallbackText,
  publishTimestamp,
  suggestionText,
  onFeedback,
  onAction,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);

  // Stash callbacks in refs so the effect only re-runs when the card itself
  // changes — not on every parent re-render that hands us a fresh inline
  // function.  Without this, re-renders re-parse the card and the browser
  // re-fetches every image (including any failing icon).
  const onFeedbackRef = useRef(onFeedback);
  const onActionRef = useRef(onAction);
  const suggestionTextRef = useRef(suggestionText);
  useEffect(() => {
    onFeedbackRef.current = onFeedback;
  }, [onFeedback]);
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);
  useEffect(() => {
    suggestionTextRef.current = suggestionText;
  }, [suggestionText]);

  useEffect(() => {
    preloadIcons();
    const container = containerRef.current;
    if (!container || !card) return undefined;

    setRenderFailed(false);
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
        if (sourceEl) {
          const previousSrc = swapIcon(sourceEl, 'check-circle-filled.svg');
          sourceEl.setAttribute('data-copied', 'true');
          setTimeout(() => {
            sourceEl.removeAttribute('data-copied');
            if (previousSrc) {
              const img = sourceEl.querySelector('img');
              img?.setAttribute('src', previousSrc);
            }
          }, 1500);
        }
      } catch (err) {
        console.warn('[AIAssistant] copy to clipboard failed', err);
      }
    };

    const toggleFeedback = (kind: 'like' | 'dislike', controls: Map<Element, IconKind>) => {
      controls.forEach((thisKind, el) => {
        if (thisKind !== 'like' && thisKind !== 'dislike') return;
        const active = el.getAttribute('data-active') === 'true';
        const isThis = thisKind === kind;
        // Mutually exclusive: clicking the active one clears it; clicking the other flips.
        const nextActive = isThis ? !active : false;
        const img = el.querySelector('img');
        if (img) {
          img.setAttribute('src', `${MOMENTUM_ICON_CDN}${thisKind}-${nextActive ? 'filled' : 'regular'}.svg`);
        }
        if (nextActive) {
          el.setAttribute('data-active', 'true');
        } else {
          el.removeAttribute('data-active');
        }
      });
    };

    try {
      const adaptiveCard = new AdaptiveCards.AdaptiveCard();
      adaptiveCard.hostConfig = new AdaptiveCards.HostConfig(buildHostConfig());
      adaptiveCard.onExecuteAction = (action) => {
        const a = action as {id?: string; title?: string};
        const label = `${a?.id || ''} ${a?.title || ''}`.toLowerCase();
        const actionId = a?.id || a?.title || '';
        if (label.includes('copy')) {
          handleCopy();
          onFeedbackRef.current?.({type: 'copy', actionId});
          return;
        }
        if (label.includes('dislike')) {
          onFeedbackRef.current?.({type: 'dislike', actionId});
          return;
        }
        if (label.includes('like')) {
          onFeedbackRef.current?.({type: 'like', actionId});
          return;
        }
        onActionRef.current?.(action);
      };
      adaptiveCard.parse(prepareCardForRender(card, publishTimestamp));
      const rendered = adaptiveCard.render();
      if (rendered) {
        container.appendChild(rendered);

        // Visual-state wiring for the like/dislike/copy controls.
        const controls = new Map<Element, IconKind>();
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
          // Visual-only: telemetry fires via onExecuteAction above to avoid double-posting.
          el.addEventListener('click', () => {
            if (kind === 'copy') {
              handleCopy(el);
            } else {
              toggleFeedback(kind, controls);
            }
          });
        });
      } else {
        setRenderFailed(true);
      }
    } catch {
      setRenderFailed(true);
    }

    return () => {
      if (container) container.innerHTML = '';
    };
  }, [card, publishTimestamp]);

  return (
    <div className="ai-assistant__card" data-testid="ai-assistant:adaptive-card">
      {renderFailed && fallbackText ? (
        <p className="ai-assistant__card-fallback" data-testid="ai-assistant:adaptive-card-fallback">
          {fallbackText}
        </p>
      ) : null}
      <div ref={containerRef} className="ai-assistant__card-host" />
    </div>
  );
};

export default AdaptiveCardRenderer;
