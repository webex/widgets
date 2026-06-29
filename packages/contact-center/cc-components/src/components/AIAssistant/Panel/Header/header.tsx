import React from 'react';
import {Button, Text} from '@momentum-design/components/dist/react';
import {AIAssistantHeaderProps} from '../../ai-assistant.types';

const Header: React.FC<AIAssistantHeaderProps> = ({onMinimize, onToggleFullScreen, onClose, isFullScreen}) => (
  <header className="ai-assistant__header" data-testid="ai-assistant:header">
    <Text tagname="h2" type="body-large-bold" className="ai-assistant__title">
      Cisco AI Assistant
    </Text>
    <div className="ai-assistant__header-actions">
      <Button
        type="button"
        variant="tertiary"
        size={28}
        prefix-icon="minimize-bold"
        aria-label="Minimize"
        data-testid="ai-assistant:header-minimize"
        onClick={onMinimize}
      />
      <Button
        type="button"
        variant="tertiary"
        size={28}
        prefix-icon={isFullScreen ? 'fullscreen-exit-bold' : 'fullscreen-bold'}
        aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
        data-testid="ai-assistant:header-fullscreen"
        onClick={onToggleFullScreen}
      />
      <Button
        type="button"
        variant="tertiary"
        size={28}
        prefix-icon="cancel-bold"
        aria-label="Close"
        data-testid="ai-assistant:header-close"
        onClick={onClose}
      />
    </div>
  </header>
);

export default Header;
