import React from 'react';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import store from '@webex/cc-store';
import {useDigitalChannels, useDigitalChannelsInit} from '../helper';
import {DigitalChannelsComponent} from './DigitalChannelsComponent';
import {DigitalChannelsProps} from './digital-channels.types';

const DigitalChannelsInternal: React.FunctionComponent<DigitalChannelsProps> = observer(
  ({jwtToken, dataCenter, currentTheme, isVisualRebrand = true, onError}) => {
    const {logger, currentTask, isDigitalChannelsInitialized, setDigitalChannelsInitialized} = store;

    if (!currentTask) {
      return null;
    }

    const {initialized} = useDigitalChannelsInit({
      currentTask,
      jwtToken,
      dataCenter,
      onError,
      logger,
      isDigitalChannelsInitialized,
      setDigitalChannelsInitialized,
    });

    const {conversationId} = useDigitalChannels({
      currentTask,
      jwtToken,
      dataCenter,
      onError,
      logger,
    });

    if (!initialized || !conversationId) {
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
