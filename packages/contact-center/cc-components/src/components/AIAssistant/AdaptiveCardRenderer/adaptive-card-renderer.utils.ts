import checkCircleFilledIcon from '@momentum-design/icons/dist/svg/check-circle-filled.svg';
import ciscoAIAssistantSolidBoldIcon from '@momentum-design/icons/dist/svg/cisco-ai-assistant-solid-bold.svg';
import copyRegularIcon from '@momentum-design/icons/dist/svg/copy-regular.svg';
import dislikeFilledIcon from '@momentum-design/icons/dist/svg/dislike-filled.svg';
import dislikeRegularIcon from '@momentum-design/icons/dist/svg/dislike-regular.svg';
import linkRegularIcon from '@momentum-design/icons/dist/svg/link-regular.svg';
import likeFilledIcon from '@momentum-design/icons/dist/svg/like-filled.svg';
import likeRegularIcon from '@momentum-design/icons/dist/svg/like-regular.svg';

const SOURCE_TIMESTAMP_PLACEHOLDER = 'SOURCE_TIMESTAMP_PLACEHOLDER';

const MOMENTUM_ICON_URLS: Record<string, string> = {
  'check-circle-filled.svg': checkCircleFilledIcon,
  'cisco-ai-assistant-solid-bold.svg': ciscoAIAssistantSolidBoldIcon,
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

// Backend ships filenames not published in @momentum-design/icons; alias them.
const MOMENTUM_ICON_ALIASES: Record<string, string> = {
  'cisco-ai-assistant-color.svg': 'cisco-ai-assistant-solid-bold.svg',
};

export const resolveMomentumIconUrl = (iconName: string): string | null => {
  const normalized = iconName.trim().toLowerCase();
  const resolved = MOMENTUM_ICON_ALIASES[normalized] ?? normalized;
  return MOMENTUM_ICON_URLS[resolved] ?? null;
};

/** Returns the trailing `name.svg` from a local path or URL, else null. */
const extractMomentumIconName = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/([\w-]+\.svg)(?:[?#].*)?$/i);
  return match ? match[1].toLowerCase() : null;
};

/**
 * Returns a clone of the card with supported bare `*.svg` URLs rewritten to
 * bundled Momentum asset URLs and any `SOURCE_TIMESTAMP_PLACEHOLDER`
 * substituted.
 */
export const prepareCardForRender = <T>(card: T, publishTimestamp?: number | string): T => {
  if (card === null || typeof card !== 'object') return card;

  const formattedTimestamp = formatSourceTimestamp(publishTimestamp);

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
        }
        out[key] = visit(value);
      }
      return out;
    }
    return node;
  };

  return visit(card) as T;
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
    padding: 12,
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
