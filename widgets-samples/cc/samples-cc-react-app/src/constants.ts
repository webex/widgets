/**
 * Digital Channels Constants
 * Shared constants for digital channel interactions (chat, social, email)
 */

/**
 * Supported digital channel media types
 */
export const DIGITAL_MEDIA_TYPES = {
  CHAT: 'chat',
  SOCIAL: 'social',
  EMAIL: 'email',
} as const;

/**
 * Array of supported digital media types for validation
 */
export const SUPPORTED_DIGITAL_MEDIA_TYPES = Object.values(DIGITAL_MEDIA_TYPES);

/**
 * Icons for different digital channel types
 */
export const DIGITAL_CHANNEL_ICONS = {
  [DIGITAL_MEDIA_TYPES.CHAT]: '💬',
  [DIGITAL_MEDIA_TYPES.SOCIAL]: '💬',
  [DIGITAL_MEDIA_TYPES.EMAIL]: '✉️',
  DEFAULT: '📋',
} as const;

/**
 * Default data center for digital channels
 */
export const DEFAULT_DATA_CENTER = 'intgus1';

/**
 * UI Constants
 */
export const UI_CONSTANTS = {
  /** Notification display duration in milliseconds */
  NOTIFICATION_TIMEOUT: 5000,

  /** CSS class names */
  CSS_CLASSES: {
    FLOATING_BUTTON: 'engage-floating-button',
    FLOATING_WINDOW: 'engage-floating-window',
    WINDOW_HEADER: 'engage-window-header',
    WINDOW_TITLE: 'engage-window-title',
    CLOSE_BUTTON: 'engage-close-button',
    CONTENT_AREA: 'engage-content-area',
    CONTENT_PLACEHOLDER: 'engage-content-placeholder',
    NOTIFICATION: 'engage-notification',
    HAS_NEW_TASK: 'has-new-task',
    HAS_TASK: 'has-task',
    NO_TASK: 'no-task',
    HIDDEN: 'hidden',
  },

  /** Theme values */
  THEMES: {
    DARK: 'DARK',
    LIGHT: 'LIGHT',
  },

  /** Theme CSS class names */
  THEME_CLASSES: {
    DARK: 'dark',
    LIGHT: 'light',
  },
} as const;

/**
 * Messages and text content
 */
export const MESSAGES = {
  NO_ACTIVE_TASKS:
    'No active digital channel tasks available. When you receive a chat, social, or email task, it will appear here.',
  INITIALIZING: 'Initializing...',
  NO_ACTIVE_TASK: 'No Active Task',
  NO_ACTIVE_TASKS_TITLE: 'No active tasks',
} as const;

/**
 * Helper function to check if a media type is a supported digital channel
 */
export const isDigitalChannelMediaType = (mediaType: string | undefined): boolean => {
  if (!mediaType) return false;
  return (SUPPORTED_DIGITAL_MEDIA_TYPES as readonly string[]).includes(mediaType);
};

/**
 * Helper function to get icon for a media type
 */
export const getMediaTypeIcon = (mediaType: string | undefined): string => {
  if (!mediaType) return DIGITAL_CHANNEL_ICONS.DEFAULT;

  const key = mediaType as keyof typeof DIGITAL_CHANNEL_ICONS;
  return DIGITAL_CHANNEL_ICONS[key] || DIGITAL_CHANNEL_ICONS.DEFAULT;
};

/**
 * Helper function to get title for a media type
 */
export const getMediaTypeTitle = (mediaType: string | undefined): string => {
  if (!mediaType) return 'Task';
  return `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Task`;
};

