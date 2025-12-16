import React, {useEffect, useMemo, useState} from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import Engage, {initializeApp} from '@webex/cc-digital-interactions';

import {useDigitalChannels} from '../helper';
import {DigitalChannelsProps} from './digital-channels.types';
import '@momentum-ui/web-components';

const DigitalChannels: React.FunctionComponent<DigitalChannelsProps> = observer(({jwtToken, dataCenter, onError}) => {
  const {logger, currentTask} = store;

  if (!currentTask) {
    return null;
  }
  const [initialized, setInitialized] = useState(false);

  const initialize = async () => {
    await initializeApp(dataCenter, jwtToken);
    setInitialized(true);
  };

  useEffect(() => {
    // Initialize the digital interactions app when component mounts or when jwtToken/dataCenter changes
    initialize();
  }, []);

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
