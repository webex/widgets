import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useDigitalChannelsInit, useDigitalChannelsData} from '../helper';
import {DigitalChannelsComponent} from './DigitalChannelsComponent';

const DigitalChannelsInternal: React.FunctionComponent = observer(() => {
  const {
    logger,
    currentTask,
    isDigitalChannelsInitialized,
    setDigitalChannelsInitialized,
    getAccessToken,
    dataCenter,
    currentTheme,
  } = store;

  // Fetch JWT token and conversation ID
  const {jwtToken, conversationId, hasError} = useDigitalChannelsData({
    getAccessToken,
    currentTask,
    logger,
  });

  // Initialize Digital Channels app once we have all required data
  const {initialized} = useDigitalChannelsInit({
    currentTask: currentTask || ({} as typeof currentTask),
    jwtToken: jwtToken || '',
    dataCenter: dataCenter || '',
    logger,
    isDigitalChannelsInitialized,
    setDigitalChannelsInitialized,
    // Skip initialization if we don't have required data
    skipInit: !currentTask || !jwtToken || !dataCenter,
  });

  // Early return after all hooks are called
  if (!currentTask || !jwtToken || !dataCenter || hasError || !initialized || !conversationId) {
    return null;
  }

  return (
    <DigitalChannelsComponent
      conversationId={conversationId}
      jwtToken={jwtToken}
      dataCenter={dataCenter}
      currentTheme={currentTheme}
    />
  );
});

const DigitalChannels: React.FunctionComponent = () => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('DigitalChannels', error);
      }}
    >
      <DigitalChannelsInternal />
    </ErrorBoundary>
  );
};

export {DigitalChannels};
