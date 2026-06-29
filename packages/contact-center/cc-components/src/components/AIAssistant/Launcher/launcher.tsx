import React from 'react';
import CiscoAIAssistantColorIcon from '../CiscoAIAssistantColorIcon';
import {LauncherProps} from '../ai-assistant.types';

const Launcher: React.FC<LauncherProps> = ({onOpen, className}) => (
  <button
    type="button"
    onClick={onOpen}
    className={`ai-assistant__launcher ${className || ''}`.trim()}
    data-testid="ai-assistant:launcher"
    aria-label="Open AI Assistant"
  >
    <CiscoAIAssistantColorIcon size={22} />
  </button>
);

export default Launcher;
