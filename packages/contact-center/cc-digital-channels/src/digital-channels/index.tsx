import React, {useState, useEffect, useMemo} from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useDigitalChannelsInit} from '../helper';
import {DigitalChannelsComponent} from './DigitalChannelsComponent';
import {DigitalChannelsProps} from './digital-channels.types';

const DigitalChannelsInternal: React.FunctionComponent<DigitalChannelsProps> = observer(
  ({dataCenter, currentTheme, isVisualRebrand = true, onError}) => {
    const {logger, currentTask, isDigitalChannelsInitialized, setDigitalChannelsInitialized, getAccessToken} = store;
    const [jwtToken, setJwtToken] = useState<string>('');
    const [tokenError, setTokenError] = useState<boolean>(false);

    // Fetch access token from the store
    useEffect(() => {
      const fetchToken = async () => {
        try {
          const token = await getAccessToken();
          setJwtToken(token);
        } catch (error) {
          logger?.error('[DIGITAL_CHANNELS] ❌ Failed to get access token', {
            module: 'cc-digital-channels',
            method: 'DigitalChannelsInternal.useEffect',
            error,
          });
          setTokenError(true);
          if (onError) {
            onError(error);
          }
        }
      };
      fetchToken();
    }, [getAccessToken, logger, onError]);

    // Extract conversationId from currentTask (always call this, return empty string if no task)
    const conversationId = useMemo(() => {
      if (!currentTask) return '';
      return (
        (currentTask.data.interaction as {callAssociatedDetails?: {mediaResourceId?: string}}).callAssociatedDetails
          ?.mediaResourceId || ''
      );
    }, [currentTask]);

    // Always call hooks - pass empty values if not ready yet
    const {initialized} = useDigitalChannelsInit({
      currentTask: currentTask || ({} as typeof currentTask),
      jwtToken: jwtToken || '',
      dataCenter,
      onError,
      logger,
      isDigitalChannelsInitialized,
      setDigitalChannelsInitialized,
      // Skip initialization if we don't have required data
      skipInit: !currentTask || !jwtToken,
    });

    // Early return after all hooks are called
    if (!currentTask || !jwtToken || tokenError || !initialized || !conversationId) {
      return null;
    }

    return (
      <DigitalChannelsComponent
        conversationId={conversationId}
        jwtToken={jwtToken}
        dataCenter={dataCenter}
        currentTheme={currentTheme}
        isVisualRebrand={isVisualRebrand}
      />
    );
  }
);

const DigitalChannels: React.FunctionComponent<DigitalChannelsProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('DigitalChannels', error);
      }}
    >
      <DigitalChannelsInternal {...props} />
    </ErrorBoundary>
  );
};

export {DigitalChannels};
