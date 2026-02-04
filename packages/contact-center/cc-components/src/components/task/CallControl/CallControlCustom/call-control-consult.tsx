import React from 'react';
import {ButtonCircle, TooltipNext, Text} from '@momentum-ui/react-collaboration';
import {Avatar, Icon} from '@momentum-design/components/dist/react';
import TaskTimer from '../../TaskTimer';
import {CallControlConsultComponentsProps} from '../../task.types';
import {createConsultButtons, getVisibleButtons, createTimerKey} from './call-control-custom.utils';

const CallControlConsultComponent: React.FC<CallControlConsultComponentsProps> = ({
  agentName,
  consultTimerLabel,
  consultTimerTimestamp,
  consultTransfer,
  endConsultCall,
  consultConference,
  switchToMainCall,
  logger,
  isMuted,
  controlVisibility,
  toggleConsultMute,
}) => {
  // Use the label and timestamp calculated in helper.ts
  // Stable key based on timestamp to prevent timer resets
  const timerKey = createTimerKey(consultTimerTimestamp);

  // Use consultTimerTimestamp with fallback
  const effectiveTimestamp = consultTimerTimestamp || Date.now();

  const buttons = createConsultButtons(
    isMuted,
    controlVisibility,
    consultTransfer,
    toggleConsultMute,
    endConsultCall,
    consultConference,
    switchToMainCall,
    logger
  );

  // Filter buttons that should be shown, then map them
  const visibleButtons = getVisibleButtons(buttons);

  return (
    <div className="call-control-consult">
      <div className="consult-header">
        <Avatar iconName="handset-filled" className="task-avatar" size={32} />
        <div>
          <Text tagName="p" type="body-large-bold" className="consult-agent-name">
            {agentName}
          </Text>
          <Text tagName="p" type="body-secondary" className="consult-sub-text">
            {consultTimerLabel}&nbsp;&bull;&nbsp;
            <TaskTimer key={timerKey} startTimeStamp={effectiveTimestamp} />
          </Text>
        </div>
      </div>

      <div className="consult-buttons consult-buttons-container">
        {visibleButtons.map((button) => (
          <TooltipNext
            key={button.key}
            triggerComponent={
              <ButtonCircle
                className={button.className}
                onPress={button.onClick}
                disabled={button.disabled}
                data-testid={`${button.key}-consult-btn`}
              >
                <Icon className={`${button.className}-icon`} name={button.icon} />
              </ButtonCircle>
            }
            color="primary"
            delay={[0, 0]}
            placement="bottom-start"
            type="description"
            variant="small"
            className="tooltip"
          >
            <p>{button.tooltip}</p>
          </TooltipNext>
        ))}
      </div>
    </div>
  );
};

export default CallControlConsultComponent;
