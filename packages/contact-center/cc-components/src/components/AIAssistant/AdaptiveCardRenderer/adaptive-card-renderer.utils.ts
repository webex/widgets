import arrowDownRegularIcon from '@momentum-design/icons/dist/svg/arrow-down-regular.svg';
import arrowRightRegularIcon from '@momentum-design/icons/dist/svg/arrow-right-regular.svg';
import checkCircleFilledIcon from '@momentum-design/icons/dist/svg/check-circle-filled.svg';
import copyRegularIcon from '@momentum-design/icons/dist/svg/copy-regular.svg';
import dislikeFilledIcon from '@momentum-design/icons/dist/svg/dislike-filled.svg';
import dislikeRegularIcon from '@momentum-design/icons/dist/svg/dislike-regular.svg';
import linkRegularIcon from '@momentum-design/icons/dist/svg/link-regular.svg';
import likeFilledIcon from '@momentum-design/icons/dist/svg/like-filled.svg';
import likeRegularIcon from '@momentum-design/icons/dist/svg/like-regular.svg';

const SOURCE_TIMESTAMP_PLACEHOLDER = 'SOURCE_TIMESTAMP_PLACEHOLDER';
const LINE_SEPARATOR_ID = 'line-separator-textBlock';
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

  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit);
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (typeof value === 'string') {
          const iconName = extractMomentumIconName(value);
          if (iconName) {
            const iconUrl = resolveMomentumIconUrl(iconName);
            if (iconUrl) {
              out[key] = iconUrl;
              continue;
            }
          }
          if (value.includes(SOURCE_TIMESTAMP_PLACEHOLDER)) {
            out[key] = value.split(SOURCE_TIMESTAMP_PLACEHOLDER).join(formattedTimestamp);
            continue;
          }
          if (key === 'text' && /(^|\n)\s*-\s+/.test(value)) {
            out[key] = value.replace(/(^|\n)\s*-\s+/g, '$1• ');
            continue;
          }
        }
        out[key] = visit(value);
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
