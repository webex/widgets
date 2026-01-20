import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useDigitalChannelsInit, useDigitalChannelsData} from '../helper';
import {DigitalChannelsComponent} from './DigitalChannelsComponent';
import {DigitalChannelsProps} from './digital-channels.types';

const DigitalChannelsInternal: React.FunctionComponent<DigitalChannelsProps> = observer(({currentTheme}) => {
  const {
    logger,
    currentTask,
    isDigitalChannelsInitialized,
    setDigitalChannelsInitialized,
    getAccessToken,
    getDataCenter,
  } = store;

  // Fetch all required data (token, datacenter, conversationId)
  const {jwtToken, dataCenter, conversationId, hasError} = useDigitalChannelsData({
    getAccessToken,
    getDataCenter,
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
