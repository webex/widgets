import React from 'react';
import {Button, Text} from '@momentum-design/components/dist/react';
import {MinimizedBarProps} from '../../ai-assistant.types';

const MinimizedBar: React.FC<MinimizedBarProps> = ({onRestore, onClose}) => (
  <div className="ai-assistant__minimized-bar" data-testid="ai-assistant:minimized-bar">
    <Text tagname="span" type="body-midsize-bold" className="ai-assistant__title">
      Cisco AI Assistant
    </Text>
    <div className="ai-assistant__header-actions">
      <Button
        type="button"
        variant="tertiary"
        size={28}
        prefix-icon="arrow-up-bold"
        aria-label="Restore"
        data-testid="ai-assistant:minimized-restore"
        onClick={onRestore}
      />
      <Button
        type="button"
        variant="tertiary"
        size={28}
        prefix-icon="cancel-bold"
        aria-label="Close"
        data-testid="ai-assistant:minimized-close"
        onClick={onClose}
      />
    </div>
  </div>
);

export default MinimizedBar;
