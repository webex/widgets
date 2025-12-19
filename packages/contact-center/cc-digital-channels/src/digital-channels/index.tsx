import React, {useEffect, useMemo, useState} from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import Engage, {initializeApp} from '@webex/cc-digital-interactions';

import {useDigitalChannels} from '../helper';
import {DigitalChannelsProps} from './digital-channels.types';
import '@momentum-ui/web-components';

const DigitalChannels: React.FunctionComponent<DigitalChannelsProps> = observer(({jwtToken, dataCenter, onError}) => {
  const {logger, currentTask, isDigitalChannelsInitialized, setDigitalChannelsInitialized} = store;

  if (!currentTask) {
    return null;
  }

  const [initialized, setInitialized] = useState(isDigitalChannelsInitialized);

  useEffect(() => {
    const initialize = async () => {
      // Initialize the digital channels app only once per session
      if (!isDigitalChannelsInitialized) {
        logger.log(
          `[DIGITAL_CHANNELS_INIT] 🚀 Starting Digital Channels initialization for the FIRST TIME (dataCenter: ${dataCenter})...`,
          {
            module: 'cc-digital-channels',
            method: 'DigitalChannels.useEffect',
          }
        );

        try {
          await initializeApp(dataCenter, jwtToken);
          setDigitalChannelsInitialized(true);
          setInitialized(true);
          logger.log('[DIGITAL_CHANNELS_INIT] ✅ Digital Channels app initialized SUCCESSFULLY', {
            module: 'cc-digital-channels',
            method: 'DigitalChannels.useEffect',
          });
        } catch (error) {
          logger.error(`[DIGITAL_CHANNELS_INIT] ❌ Failed to initialize Digital Channels app: ${error.message}`, {
            module: 'cc-digital-channels',
            method: 'DigitalChannels.useEffect',
            error,
          });
          if (onError) {
            onError(error);
          }
        }
      } else {
        logger.log('[DIGITAL_CHANNELS_INIT] ✅ App already initialized. Skipping re-initialization.', {
          module: 'cc-digital-channels',
          method: 'DigitalChannels.useEffect',
        });
        setInitialized(true);
      }
    };

    initialize();
  }, [currentTask]);

  const result = useDigitalChannels({
    currentTask,
    jwtToken,
    dataCenter,
    onError,
    logger,
  });

  const {handleError, conversationId} = result;

// Create a stable key based on critical props to force remount when they change
  // This prevents issues with the Froala editor trying to cleanup/reinitialize improperly
  const componentKey = useMemo(() => {
    return `${conversationId}-${jwtToken.slice(-8)}-${dataCenter}`;
  }, [conversationId, jwtToken, dataCenter]);

  return (
    <div>
      {initialized && (
        <md-theme id="app-theme" theme="momentumV2" class="is-visual-rebrand">
          <Engage
            key={componentKey}
            conversationId={conversationId}
            jwtToken={jwtToken}
            dataCenter={dataCenter}
            onError={handleError}
          />
        </md-theme>
      )}
    </div>
  );
});

export {DigitalChannels};
