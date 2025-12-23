import {UseDigitalChannelsProps} from './digital-channels/digital-channels.types';

export const useDigitalChannels = (props: UseDigitalChannelsProps) => {
  const {jwtToken, dataCenter, onError, logger, currentTask} = props;

  const handleError = (error: unknown): boolean => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger?.error('Digital channels error', errorMessage, {
      module: 'widget-cc-digital-channels#helper.ts',
      method: 'handleError',
    });

    if (onError) {
      return onError(error);
    }

    // Default error handling
    console.debug('Webex Engage component error:', errorMessage);
    return false; // Prevent default error handling
  };

  const conversationId = (currentTask.data.interaction as {callAssociatedDetails?: {mediaResourceId?: string}})
    .callAssociatedDetails?.mediaResourceId;

  return {
    name: 'DigitalChannels',
    handleError,
    conversationId,
    jwtToken,
    dataCenter,
  };
};
