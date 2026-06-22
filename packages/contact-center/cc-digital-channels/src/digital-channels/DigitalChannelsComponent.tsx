import React, {useMemo} from 'react';
import Engage from 'cc-digital-interactions';

import '@momentum-ui/web-components';
import {DigitalChannelsComponentProps} from './digital-channels.types';

/**
 * Presentation component for Digital Channels.
 * Renders the Engage widget with proper theming.
 */
const DigitalChannelsComponent: React.FunctionComponent<DigitalChannelsComponentProps> = ({
  conversationId,
  jwtToken,
  dataCenter,
  currentTheme = 'LIGHT',
}) => {
  // Create a stable key based on critical props to force remount when they change
  // This prevents issues with the Froala editor trying to cleanup/reinitialize improperly
  const componentKey = useMemo(() => {
    return `${conversationId}-${jwtToken.slice(-8)}-${dataCenter}`;
  }, [conversationId, jwtToken, dataCenter]);

  const isDarkTheme = currentTheme?.toUpperCase() === 'DARK';

  return (
    <div>
      <md-theme id="app-theme" theme="momentumV2" {...(isDarkTheme ? {darktheme: true} : {lighttheme: true})}>
        <Engage
          key={componentKey}
          conversationId={conversationId}
          jwtToken={jwtToken}
          dataCenter={dataCenter}
          interactionId=""
          readonly={false}
          theme={isDarkTheme ? 'dark' : 'light'}
          isVisualRebrand={true}
        />
      </md-theme>
    </div>
  );
};

export {DigitalChannelsComponent};
