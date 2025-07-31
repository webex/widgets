import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import Engage from '@webex-engage/wxengage-conversations';

import {useDigitalChannels} from '../helper';
import {DigitalChannelsProps} from './digital-channels.types';
import '@momentum-ui/web-components';
const DigitalChannels: React.FunctionComponent<DigitalChannelsProps> = observer(({jwtToken, dataCenter, onError}) => {
  const {logger, currentTask} = store;

  if (!currentTask) {
    return null;
  }

  const result = useDigitalChannels({
    currentTask,
    jwtToken,
    dataCenter,
    onError,
    logger,
  });

  const {handleError, conversationId} = result;

  return (
    <div>
      <md-theme id="app-theme" theme="momentumV2" class="is-visual-rebrand">
        <Engage conversationId={conversationId} jwtToken={jwtToken} dataCenter={dataCenter} onError={handleError} />
      </md-theme>
    </div>
  );
});

export {DigitalChannels};
