import React, {useMemo} from 'react';
import Engage from '@webex/cc-digital-interactions';

import '@momentum-ui/web-components';

export interface DigitalChannelsComponentProps {
  conversationId: string;
  jwtToken: string;
  dataCenter: string;
  handleError: (error: unknown) => boolean;
}

/**
 * Presentation component for Digital Channels.
 * Renders the Engage widget with proper theming.
 */
const DigitalChannelsComponent: React.FunctionComponent<DigitalChannelsComponentProps> = ({
  conversationId,
  jwtToken,
  dataCenter,
  handleError,
}) => {
  // Create a stable key based on critical props to force remount when they change
  // This prevents issues with the Froala editor trying to cleanup/reinitialize improperly
  const componentKey = useMemo(() => {
    return `${conversationId}-${jwtToken.slice(-8)}-${dataCenter}`;
  }, [conversationId, jwtToken, dataCenter]);

  return (
    <div>
      <md-theme id="app-theme" theme="momentumV2" class="is-visual-rebrand">
        <Engage
          key={componentKey}
          conversationId={conversationId}
          jwtToken={jwtToken}
          dataCenter={dataCenter}
          onError={handleError}
        />
      </md-theme>
    </div>
  );
};

export {DigitalChannelsComponent};
