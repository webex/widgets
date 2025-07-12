import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import Engage from '@webex-engage/wxengage-conversations';

import {useDigitalChannels} from '../helper';
import {DigitalChannelsProps} from './digital-channels.types';

const DigitalChannels: React.FunctionComponent<DigitalChannelsProps> = observer(
  ({jwtToken, apiEndpoint, signalREndpoint, onError}) => {
    const {logger, currentTask} = store.default;

    if (!currentTask) {
      return null;
    }

    const result = useDigitalChannels({
      currentTask,
      jwtToken,
      apiEndpoint,
      signalREndpoint,
      onError,
      logger,
    });

    const {handleError, conversationId} = result;

    return (
      <div>
        <md-theme>
          <Engage
            conversationId={conversationId}
            jwtToken={jwtToken}
            apiEndpoint={apiEndpoint}
            signalREndpoint={signalREndpoint}
            onError={handleError}
          />
        </md-theme>
      </div>
    );
  }
);

export {DigitalChannels};
