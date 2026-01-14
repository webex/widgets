import {useEffect, useState} from 'react';
import {initializeApp} from '@webex/cc-digital-interactions';

import {UseDigitalChannelsInitProps} from './digital-channels/digital-channels.types';

/**
 * Hook to handle Digital Channels initialization.
 * Ensures initialization happens only once per session using store flag.
 */
export const useDigitalChannelsInit = (props: UseDigitalChannelsInitProps) => {
  const {
    currentTask,
    jwtToken,
    dataCenter,
    onError,
    logger,
    isDigitalChannelsInitialized,
    setDigitalChannelsInitialized,
    skipInit = false,
  } = props;

  const [initialized, setInitialized] = useState(isDigitalChannelsInitialized);

  useEffect(() => {
    // Skip initialization if required data is not available
    if (skipInit) {
      return;
    }

    const initialize = async () => {
      // Initialize the digital channels app only once per session
      if (!isDigitalChannelsInitialized) {
        logger.log(
          `[DIGITAL_CHANNELS_INIT] 🚀 Starting Digital Channels initialization for the FIRST TIME (dataCenter: ${dataCenter})...`,
          {
            module: 'cc-digital-channels',
            method: 'useDigitalChannelsInit',
          }
        );

        try {
          await initializeApp(dataCenter, jwtToken);
          setDigitalChannelsInitialized(true);
          setInitialized(true);
          logger.log('[DIGITAL_CHANNELS_INIT] ✅ Digital Channels app initialized SUCCESSFULLY', {
            module: 'cc-digital-channels',
            method: 'useDigitalChannelsInit',
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`[DIGITAL_CHANNELS_INIT] ❌ Failed to initialize Digital Channels app: ${errorMessage}`, {
            module: 'cc-digital-channels',
            method: 'useDigitalChannelsInit',
            error,
          });
          if (onError) {
            onError(error);
          }
        }
      } else {
        logger.log('[DIGITAL_CHANNELS_INIT] ✅ App already initialized. Skipping re-initialization.', {
          module: 'cc-digital-channels',
          method: 'useDigitalChannelsInit',
        });
        setInitialized(true);
      }
    };

    initialize();
  }, [currentTask, skipInit, jwtToken]);

  return {initialized};
};
