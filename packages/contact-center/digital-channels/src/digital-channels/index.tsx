import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {useDigitalChannels} from '../helper';
import {IDigitalChannelsProps} from '../digital-channels.types';

// Use the default import according to the package.json exports field
import Engage from '@webex-engage/wxengage-conversations';

const DigitalChannels: React.FunctionComponent<IDigitalChannelsProps> = observer(({onError}) => {
  const {currentTask, currentTheme, logger} = store;
  const props = {
    ...useDigitalChannels({
      currentTask,
      currentTheme,
      logger,
      onError,
    }),
  };

  return <Engage {...props} />;
});

export {DigitalChannels};
