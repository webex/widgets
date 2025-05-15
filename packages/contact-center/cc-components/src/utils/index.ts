import {MediaInfo, MediaType} from '../components/task/task.types';

export const formatTime = (time: number): string => {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;
  // Display full format with hours if time is 1 hour or more
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Less than 1 hour: display mm:ss with two-digit padding for minutes
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Returns the icon name and corresponding CSS class for the specified media type and optional media channel.
 * Supports standard media types such as Telephony, Email, and Chat, and provides specific icons for Social media sub-channels
 * including SMS, Facebook Messenger, WhatsApp, and Apple Messages.
 *
 * @param mediaType - The media type as a string (e.g., 'telephony', 'email', 'chat', 'social').
 * @param mediaChannel - (Optional) The specific channel for Social media types (e.g., 'sms', 'facebook', 'whatsapp', 'apple').
 * @returns An object containing the `iconName` and `className` corresponding to the media type and channel.
 */
export const getMediaIconInfo = (mediaType: string, mediaChannel?: string): MediaInfo => {
  if (mediaType === MediaType.SOCIAL) {
    switch (mediaChannel) {
      case MediaType.FACEBOOK:
        return {
          iconName: 'social-facebook-color',
          className: MediaType.FACEBOOK,
          isBrandVisual: true,
        };
      case MediaType.WHATSAPP:
        return {
          iconName: 'social-whatsapp-color',
          className: MediaType.WHATSAPP,
          isBrandVisual: true,
        };
      case MediaType.APPLE:
        return {
          iconName: 'apple-business-chat-color',
          className: MediaType.APPLE,
          isBrandVisual: true,
        };
      default:
        return {
          iconName: 'chat-filled',
          className: MediaType.SOCIAL,
          isBrandVisual: false,
        };
    }
  }

  switch (mediaType) {
    case MediaType.TELEPHONY:
      return {
        iconName: 'handset-filled',
        className: MediaType.TELEPHONY,
        isBrandVisual: false,
      };
    case MediaType.EMAIL:
      return {
        iconName: 'email-filled',
        className: MediaType.EMAIL,
        isBrandVisual: false,
      };
    case MediaType.CHAT:
      return {
        iconName: 'chat-filled',
        className: MediaType.CHAT,
        isBrandVisual: false,
      };
    default:
      return {
        iconName: 'handset-filled',
        className: MediaType.TELEPHONY,
        isBrandVisual: false,
      };
  }
};

/**
 * Returns the display label string corresponding to the specified media type and optional media channel.
 * Specifically handles Social media types with channel-specific labels such as SMS, Facebook Messenger, WhatsApp, and Apple Messages.
 *
 * @param mediaType - The media type as a string (e.g., 'telephony', 'chat', 'email', 'social').
 * @param mediaChannel - (Optional) The specific channel for Social media types (e.g., 'sms', 'facebook', 'whatsapp', 'apple').
 * @returns A string label representing the media type and channel, or 'Unknown' if not recognized.
 */
export const getMediaLabel = (mediaType: string, mediaChannel?: string): string => {
  if (mediaType === MediaType.SOCIAL) {
    switch (mediaChannel) {
      case MediaType.FACEBOOK:
        return 'FB messenger';
      case MediaType.WHATSAPP:
        return 'Whatsapp';
      case MediaType.APPLE:
        return 'Apple Chat';
      default:
        return 'Social';
    }
  }

  switch (mediaType) {
    case MediaType.TELEPHONY:
      return 'Call';
    case MediaType.CHAT:
      return 'Chat';
    case MediaType.EMAIL:
      return 'Email';
    default:
      return 'Unknown';
  }
};
