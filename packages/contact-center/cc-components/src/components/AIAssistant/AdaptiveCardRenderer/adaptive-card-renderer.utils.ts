import type {ILogger} from '@webex/cc-store';
import type {AIAssistantActionKind} from '../ai-assistant.types';
import {ADAPTIVE_CARD_MODULE, COPIED_FEEDBACK_MS, LINE_SEPARATOR_ID, SOURCE_TIMESTAMP_PLACEHOLDER} from '../constants';
import arrowDownRegularIcon from '@momentum-design/icons/dist/svg/arrow-down-regular.svg';
import arrowRightRegularIcon from '@momentum-design/icons/dist/svg/arrow-right-regular.svg';
import checkCircleFilledIcon from '@momentum-design/icons/dist/svg/check-circle-filled.svg';
import copyRegularIcon from '@momentum-design/icons/dist/svg/copy-regular.svg';
import dislikeFilledIcon from '@momentum-design/icons/dist/svg/dislike-filled.svg';
import dislikeRegularIcon from '@momentum-design/icons/dist/svg/dislike-regular.svg';
import linkRegularIcon from '@momentum-design/icons/dist/svg/link-regular.svg';
import likeFilledIcon from '@momentum-design/icons/dist/svg/like-filled.svg';
import likeRegularIcon from '@momentum-design/icons/dist/svg/like-regular.svg';

const CISCO_AI_ASSISTANT_COLOR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
  '<defs><linearGradient id="a" x1="15" y1="1" x2="1" y2="15" gradientUnits="userSpaceOnUse">' +
  '<stop stop-color="#0051AF"/><stop offset=".67" stop-color="#0087EA"/><stop offset="1" stop-color="#00BCEB"/>' +
  '</linearGradient><linearGradient id="b" x1="8" y1="1" x2="15" y2="8" gradientUnits="userSpaceOnUse">' +
  '<stop stop-color="#0087EA"/><stop offset="1" stop-color="#63FFF7"/></linearGradient></defs>' +
  '<circle cx="12" cy="5" r="4" fill="url(#b)"/>' +
  '<path fill="url(#a)" fill-rule="evenodd" d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Z"/>' +
  '</svg>';
const ciscoAIAssistantColorIcon = `data:image/svg+xml,${encodeURIComponent(CISCO_AI_ASSISTANT_COLOR_SVG)}`;

const MOMENTUM_ICON_URLS: Record<string, string> = {
  'arrow-down-regular.svg': arrowDownRegularIcon,
  'arrow-right-regular.svg': arrowRightRegularIcon,
  'check-circle-filled.svg': checkCircleFilledIcon,
  'cisco-ai-assistant-color.svg': ciscoAIAssistantColorIcon,
  'copy-regular.svg': copyRegularIcon,
  'dislike-filled.svg': dislikeFilledIcon,
  'dislike-regular.svg': dislikeRegularIcon,
  'link-regular.svg': linkRegularIcon,
  'like-filled.svg': likeFilledIcon,
  'like-regular.svg': likeRegularIcon,
};
const ALLOWED_MOMENTUM_RESOURCE_URLS = new Set(Object.values(MOMENTUM_ICON_URLS));

/** Format an epoch (ms) into "HH:MM"; empty string on bad input. */
const formatSourceTimestamp = (raw: number | string | undefined): string => {
  if (raw === undefined || raw === null || raw === '') return '';
  const ms = typeof raw === 'number' ? raw : Number.parseInt(`${raw}`, 10);
  if (Number.isNaN(ms)) return '';
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '';
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  return `${hh}:${mm}`;
};

export const resolveMomentumIconUrl = (iconName: string): string | null => {
  const normalized = iconName.trim().toLowerCase();
  return MOMENTUM_ICON_URLS[normalized] ?? null;
};

/** Returns the trailing `name.svg` from a local path or URL, else null. */
const extractMomentumIconName = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/([\w-]+\.svg)(?:[?#].*)?$/i);
  return match ? match[1].toLowerCase() : null;
};

const resolveAllowedResourceUrl = (value: string): string | undefined => {
  const iconName = extractMomentumIconName(value);
  if (!iconName) return undefined;
  return resolveMomentumIconUrl(iconName) ?? undefined;
};

const isAllowedMomentumResourceUrl = (value: string): boolean => ALLOWED_MOMENTUM_RESOURCE_URLS.has(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const extractCustomerStatementTitle = (card: unknown): string | undefined => {
  if (Array.isArray(card)) {
    for (const item of card) {
      const title = extractCustomerStatementTitle(item);
      if (title) return title;
    }
    return undefined;
  }
  if (!card || typeof card !== 'object') return undefined;

  const node = card as Record<string, unknown>;
  if (node.type === 'TextBlock' && typeof node.text === 'string' && /^the customer said:?$/i.test(node.text.trim())) {
    return node.text.trim();
  }

  for (const value of Object.values(node)) {
    const title = extractCustomerStatementTitle(value);
    if (title) return title;
  }
  return undefined;
};

/**
 * Returns a clone of the card with supported bare `*.svg` URLs rewritten to
 * bundled Momentum asset URLs and any `SOURCE_TIMESTAMP_PLACEHOLDER`
 * substituted.
 */
const removeDuplicateAssistantHeader = (
  card: Record<string, unknown>,
  assistantTitle?: string
): Record<string, unknown> => {
  if (!assistantTitle || !Array.isArray(card.body) || card.body.length === 0) return card;
  const [first, ...rest] = card.body;
  if (!first || typeof first !== 'object') return card;

  const firstItem = first as Record<string, unknown>;
  const serializedHeader = JSON.stringify(firstItem).toLowerCase();
  const normalizedTitle = assistantTitle.trim().toLowerCase();
  const containsTitle = serializedHeader.includes(normalizedTitle);

  if (firstItem.type === 'ColumnSet' && containsTitle) {
    return {...card, body: rest};
  }

  if (firstItem.type === 'TextBlock' && `${firstItem.text ?? ''}`.trim().toLowerCase() === normalizedTitle) {
    return {...card, body: rest};
  }

  if (firstItem.type === 'Container' && Array.isArray(firstItem.items)) {
    const [firstChild, ...remainingItems] = firstItem.items;
    if (
      firstChild &&
      typeof firstChild === 'object' &&
      `${(firstChild as Record<string, unknown>).text ?? ''}`.trim().toLowerCase() === normalizedTitle
    ) {
      return {...card, body: [{...firstItem, items: remainingItems}, ...rest]};
    }
  }

  return card;
};

export const prepareCardForRender = <T>(card: T, publishTimestamp?: number | string, assistantTitle?: string): T => {
  if (card === null || typeof card !== 'object') return card;

  const formattedTimestamp = formatSourceTimestamp(publishTimestamp);
  const cardWithoutDuplicateHeader = removeDuplicateAssistantHeader(card as Record<string, unknown>, assistantTitle);

  const prepareResourceValue = (value: unknown): unknown | undefined => {
    if (typeof value === 'string') {
      return resolveAllowedResourceUrl(value);
    }
    if (!isRecord(value)) {
      return undefined;
    }
    const url = value.url;
    if (typeof url !== 'string') {
      return undefined;
    }
    const allowedUrl = resolveAllowedResourceUrl(url);
    if (!allowedUrl) {
      return undefined;
    }
    const prepared = visit({...value, url: allowedUrl});
    return isRecord(prepared) ? prepared : undefined;
  };

  const isImageUrl = (
    record: Record<string, unknown>,
    key: string,
    context: {parentType?: string; parentKey?: string}
  ): boolean =>
    key === 'url' && (record.type === 'Image' || (context.parentType === 'ImageSet' && context.parentKey === 'images'));

  const visit = (node: unknown, context: {parentType?: string; parentKey?: string} = {}): unknown => {
    if (Array.isArray(node)) {
      return node
        .map((item) => visit(item, context))
        .filter((item): item is Exclude<unknown, undefined> => item !== undefined);
    }
    if (isRecord(node)) {
      const out: Record<string, unknown> = {};
      const record = node;
      const recordType = typeof record.type === 'string' ? record.type : undefined;
      for (const [key, value] of Object.entries(record)) {
        if (key === 'backgroundImage') {
          const preparedBackground = prepareResourceValue(value);
          if (preparedBackground !== undefined) {
            out[key] = preparedBackground;
          }
          continue;
        }
        if (recordType === 'Media' && key === 'sources') {
          continue;
        }
        if (recordType === 'Media' && key === 'poster') {
          const preparedPoster = prepareResourceValue(value);
          if (preparedPoster !== undefined) {
            out[key] = preparedPoster;
          }
          continue;
        }
        if (
          isImageUrl(record, key, context) ||
          (key === 'iconUrl' && typeof recordType === 'string' && recordType.startsWith('Action.'))
        ) {
          const preparedResource = prepareResourceValue(value);
          if (preparedResource !== undefined) {
            out[key] = preparedResource;
          }
          continue;
        }
        if (typeof value === 'string') {
          if (value.includes(SOURCE_TIMESTAMP_PLACEHOLDER)) {
            out[key] = value.split(SOURCE_TIMESTAMP_PLACEHOLDER).join(formattedTimestamp);
            continue;
          }
          if (key === 'text' && /(^|\n)\s*-\s+/.test(value)) {
            out[key] = value.replace(/(^|\n)\s*-\s+/g, '$1• ');
            continue;
          }
        }
        out[key] = visit(value, {parentType: recordType, parentKey: key});
      }
      if (out.id === LINE_SEPARATOR_ID) {
        out.separator = true;
      }
      return out;
    }
    return node;
  };

  return visit(cardWithoutDuplicateHeader) as T;
};

export const hasRenderableCardContent = (card: unknown): boolean => {
  const hasText = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;

  const hasRenderableFact = (fact: unknown): boolean => {
    if (!isRecord(fact)) return false;
    return hasText(fact.title) || hasText(fact.value);
  };

  const hasRenderableNode = (node: unknown, context: {richTextInline?: boolean} = {}): boolean => {
    if (Array.isArray(node)) {
      return node.some((item) => hasRenderableNode(item, context));
    }
    if (typeof node === 'string') {
      return context.richTextInline === true && hasText(node);
    }
    if (!isRecord(node)) {
      return false;
    }
    const record = node;
    if (record.type === 'TextBlock') {
      return hasText(record.text);
    }
    if (record.type === 'TextRun') {
      return context.richTextInline === true && hasText(record.text);
    }
    if (record.type === 'RichTextBlock') {
      return hasRenderableNode(record.inlines, {richTextInline: true});
    }
    if (record.type === 'FactSet') {
      return Array.isArray(record.facts) && record.facts.some(hasRenderableFact);
    }
    if (record.type === 'Image') {
      return typeof record.url === 'string' && isAllowedMomentumResourceUrl(record.url);
    }
    if (record.type === 'ImageSet') {
      return (
        Array.isArray(record.images) &&
        record.images.some(
          (image) =>
            (isRecord(image) && typeof image.url === 'string' && isAllowedMomentumResourceUrl(image.url)) ||
            hasRenderableNode(image)
        )
      );
    }
    if (record.type === 'AdaptiveCard') {
      return hasRenderableNode(record.body);
    }
    if (record.type === 'Container' || record.type === 'Column') {
      return hasRenderableNode(record.items);
    }
    if (record.type === 'ColumnSet') {
      return hasRenderableNode(record.columns);
    }
    if (record.type === 'Table') {
      return hasRenderableNode(record.rows);
    }
    if (record.type === 'TableRow') {
      return hasRenderableNode(record.cells);
    }
    if (record.type === 'TableCell') {
      return hasRenderableNode(record.items);
    }
    return (
      hasRenderableNode(record.body) ||
      hasRenderableNode(record.items) ||
      hasRenderableNode(record.columns) ||
      hasRenderableNode(record.images) ||
      (Array.isArray(record.facts) && record.facts.some(hasRenderableFact))
    );
  };

  return hasRenderableNode(card);
};

/**
 * Classifies a card action by its `id` / `title` (e.g. `likeButton`).  The
 * icon URL is deliberately not used: it is bundled as an inline data URI, so
 * it carries no file name to match on.
 */
export const detectActionKind = (action: {id?: string; title?: string}): AIAssistantActionKind | null => {
  const label = `${action?.id || ''} ${action?.title || ''}`.toLowerCase();
  if (label.includes('copy')) return 'copy';
  // `dislike` contains `like`, so it has to be checked first.
  if (label.includes('dislike')) return 'dislike';
  if (label.includes('like')) return 'like';
  return null;
};

const PRELOAD_ICONS = [
  'like-regular.svg',
  'like-filled.svg',
  'dislike-regular.svg',
  'dislike-filled.svg',
  'copy-regular.svg',
  'check-circle-filled.svg',
];
let iconsPreloaded = false;

/**
 * Warms the regular + filled variants so the like/dislike/copy toggles don't
 * wait on a network roundtrip on the first click.
 */
export const preloadIcons = () => {
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
export const extractCardText = (container: HTMLElement): string => {
  const blocks = container.querySelectorAll('.ac-textBlock, .ac-richTextBlock');
  const lines: string[] = [];
  blocks.forEach((el) => {
    const text = (el.textContent || '').trim();
    if (text && text !== 'Source') lines.push(text);
  });
  return lines.join('\n');
};

/** Swap broken card images for the bundled source icon, or hide them. */
export const addImageFallbacks = (container: HTMLElement) => {
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

/** Paint `kind` as the only selected control; re-clicking it clears the selection. */
export const toggleActionControls = (kind: 'like' | 'dislike', controls: Map<Element, AIAssistantActionKind>) => {
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

/**
 * Copies `text` and briefly flashes the copy control as confirmation.  Falls
 * back to a hidden textarea for non-secure contexts without the async API.
 */
export const copySuggestion = async (text: string, sourceEl?: Element, logger?: ILogger): Promise<void> => {
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
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
      }, COPIED_FEEDBACK_MS);
    }
  } catch (err) {
    logger?.error(`CC-Components: copy to clipboard failed - ${err}`, {
      module: ADAPTIVE_CARD_MODULE,
      method: 'copySuggestion',
    });
  }
};

/** HostConfig wired to Momentum CSS tokens so cards inherit the active theme. */
export const buildHostConfig = () => ({
  fontFamily: 'inherit',
  spacing: {
    small: 4,
    default: 8,
    medium: 12,
    large: 16,
    extraLarge: 24,
    padding: 0,
  },
  separator: {
    lineThickness: 1,
    lineColor: 'var(--mds-color-theme-outline-secondary-normal)',
  },
  containerStyles: (() => {
    // Force every semantic foreground to the primary text color so card
    // labels (e.g. "Source") don't read as alerts/links.
    const primary = 'var(--mds-color-theme-text-primary-normal)';
    const subtle = 'var(--mds-color-theme-text-secondary-normal)';
    const flat = {default: primary, subtle: primary};
    const foregroundColors = {
      default: {default: primary, subtle},
      accent: flat,
      attention: flat,
      good: flat,
      warning: flat,
      dark: flat,
      light: flat,
    };
    return {
      default: {
        backgroundColor: 'transparent',
        foregroundColors,
      },
      emphasis: {
        backgroundColor: 'transparent',
        foregroundColors,
      },
    };
  })(),
  actions: {
    maxActions: 5,
    spacing: 'default',
    buttonSpacing: 8,
    actionsOrientation: 'horizontal',
    actionAlignment: 'left',
  },
});
