import {MediaInfo, MEDIA_CHANNEL} from '../components/task/task.types';
import type {MEDIA_CHANNEL as MediaChannelType} from '../components/task/task.types';

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
 * Returns media information (icon, class, label, and brand visual flag)
 * based on the provided mediaType and mediaChannel.
 *
 * - If the mediaType is SOCIAL, it checks mediaChannel-specific mappings
 *   like Facebook, WhatsApp, and Apple Chat.
 * - For other mediaTypes (e.g., TELEPHONY, EMAIL, CHAT), it uses a direct map.
 * - If no match is found, a default media info is returned for TELEPHONY or SOCIAL.
 *
 * This utility consolidates icon metadata and display label logic for consistent rendering.
 *
 * @param mediaType - The primary media type (e.g., TELEPHONY, EMAIL, SOCIAL)
 * @param mediaChannel - The secondary channel for SOCIAL types (e.g., FACEBOOK, WHATSAPP)
 * @returns MediaInfo object with iconName, className, labelName, and isBrandVisual flag
 */
export const getMediaTypeInfo = (mediaType: MediaChannelType, mediaChannel: MediaChannelType): MediaInfo => {
  const socialMap: Partial<Record<MediaChannelType, MediaInfo>> = {
    [MEDIA_CHANNEL.FACEBOOK]: {
      iconName: 'social-facebook-color',
      className: MEDIA_CHANNEL.FACEBOOK,
      labelName: 'FB messenger',
      isBrandVisual: true,
    },
    [MEDIA_CHANNEL.WHATSAPP]: {
      iconName: 'social-whatsapp-color',
      className: MEDIA_CHANNEL.WHATSAPP,
      labelName: 'Whatsapp',
      isBrandVisual: true,
    },
    [MEDIA_CHANNEL.APPLE]: {
      iconName: 'apple-business-chat-color',
      className: MEDIA_CHANNEL.APPLE,
      labelName: 'Apple Chat',
      isBrandVisual: true,
    },
  };

  const typeMap: Partial<Record<MediaChannelType, MediaInfo>> = {
    [MEDIA_CHANNEL.TELEPHONY]: {
      iconName: 'handset-filled',
      className: MEDIA_CHANNEL.TELEPHONY,
      labelName: 'Call',
      isBrandVisual: false,
    },
    [MEDIA_CHANNEL.EMAIL]: {
      iconName: 'email-filled',
      className: MEDIA_CHANNEL.EMAIL,
      labelName: 'Email',
      isBrandVisual: false,
    },
    [MEDIA_CHANNEL.CHAT]: {
      iconName: 'chat-filled',
      className: MEDIA_CHANNEL.CHAT,
      labelName: 'Chat',
      isBrandVisual: false,
    },
  };

  if (mediaType === MEDIA_CHANNEL.SOCIAL) {
    return (
      socialMap[mediaChannel] ?? {
        iconName: 'chat-filled',
        className: MEDIA_CHANNEL.SOCIAL,
        labelName: 'Chat',
        isBrandVisual: false,
      }
    );
  }

  return (
    typeMap[mediaType] ?? {
      iconName: 'handset-filled',
      className: MEDIA_CHANNEL.TELEPHONY,
      labelName: 'Call',
      isBrandVisual: false,
    }
  );
};
