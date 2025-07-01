import React from 'react';
import Engage from '@webex-engage/wxengage-conversations';

export interface WebexEngageConversationsProps {
  conversationId: string;
  jwtToken: string;
  apiEndpoint: string;
  signalREndpoint: string;
  onError?: (error: unknown) => boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const WebexEngageConversations: React.FC<WebexEngageConversationsProps> = ({
  conversationId,
  jwtToken,
  apiEndpoint,
  signalREndpoint,
  onError,
  className,
  style
}) => {
  const handleError = (error: unknown): boolean => {
    if (onError) {
      return onError(error);
    }
    // Default error handling
    console.debug('Webex Engage component error:', error);
    return false; // Prevent default error handling
  };

  return (
    <div className={className} style={style}>
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
};

export default WebexEngageConversations;
