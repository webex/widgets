import {useEffect, useState, useMemo} from 'react';
import {initializeApp} from 'cc-digital-interactions';

import {UseDigitalChannelsInitProps, UseDigitalChannelsDataProps} from './digital-channels/digital-channels.types';

/**
 * Hook to handle Digital Channels initialization.
 * Ensures initialization happens only once per session using store flag.
 */
export const useDigitalChannelsInit = (props: UseDigitalChannelsInitProps) => {
  const {
    currentTask,
    jwtToken,
    dataCenter,
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

/**
 * Hook to handle fetching Digital Channels data (token, datacenter, conversationId).
 * Centralizes all data fetching logic to keep the component clean.
 */
export const useDigitalChannelsData = (props: UseDigitalChannelsDataProps) => {
  const {getAccessToken, getDataCenter, currentTask, logger} = props;

  const [jwtToken, setJwtToken] = useState<string>('');
  const [tokenError, setTokenError] = useState<boolean>(false);
  const [dataCenter, setDataCenter] = useState<string>('');
  const [dataCenterError, setDataCenterError] = useState<boolean>(false);

  // Fetch access token from the store
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getAccessToken();
        setJwtToken(token);
      } catch (error) {
        logger?.error('[DIGITAL_CHANNELS] ❌ Failed to get access token', {
          module: 'cc-digital-channels',
          method: 'useDigitalChannelsData.fetchToken',
          error,
        });
        setTokenError(true);
      }
    };
    fetchToken();
  }, [getAccessToken, logger]);

  // Fetch datacenter from the store
  useEffect(() => {
    const fetchDataCenter = async () => {
      try {
        const region = await getDataCenter();

        if (!region) {
          logger?.error('[DIGITAL_CHANNELS] ❌ Failed to get datacenter from store', {
            module: 'cc-digital-channels',
            method: 'useDigitalChannelsData.fetchDataCenter',
          });
          setDataCenterError(true);
          return;
        }

        logger?.log(`[DIGITAL_CHANNELS] ✅ Retrieved datacenter: ${region}`, {
          module: 'cc-digital-channels',
          method: 'useDigitalChannelsData.fetchDataCenter',
        });

        setDataCenter(region);
      } catch (error) {
        logger?.error('[DIGITAL_CHANNELS] ❌ Failed to get datacenter from store', {
          module: 'cc-digital-channels',
          method: 'useDigitalChannelsData.fetchDataCenter',
          error,
        });
        setDataCenterError(true);
      }
    };
    fetchDataCenter();
  }, [getDataCenter, logger]);

  // Extract conversationId from currentTask (always call this, return empty string if no task)
  const conversationId = useMemo(() => {
    if (!currentTask) return '';
    return (
      (currentTask.data.interaction as {callAssociatedDetails?: {mediaResourceId?: string}}).callAssociatedDetails
        ?.mediaResourceId || ''
    );
  }, [currentTask]);

  const hasError = tokenError || dataCenterError;

  return {
    jwtToken,
    dataCenter,
    conversationId,
    tokenError,
    dataCenterError,
    hasError,
  };
};
