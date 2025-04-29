import React from 'react';
import {ButtonCircle, TooltipNext, Text} from '@momentum-ui/react-collaboration';
import {Avatar, Icon} from '@momentum-design/components/dist/react';

import TaskTimer from '../../TaskTimer';
import {CallControlConsultComponentsProps} from '../../task.types';

const CallControlConsultComponent: React.FC<CallControlConsultComponentsProps> = ({
  agentName,
  startTimeStamp,
  onTransfer,
  endConsultCall,
  consultCompleted,
  isAgentBeingConsulted,
  isEndConsultEnabled,
}) => {
  const timerKey = `timer-${startTimeStamp}`;

  const handleTransfer = () => {
    try {
      if (onTransfer) {
        onTransfer();
      }
    } catch (error) {
      throw new Error('Error transferring call:', error);
    }
  };

  const handleEndConsult = () => {
    try {
      endConsultCall();
    } catch (error) {
      throw new Error('Error ending consult call:', error);
    }
  };

  const buttons = [
    {
      key: 'transfer',
      icon: 'next-bold',
      tooltip: 'Transfer Consult',
      onClick: handleTransfer,
      className: 'call-control-button',
      disabled: !consultCompleted,
      shouldShow: isAgentBeingConsulted && !!onTransfer,
    },
    {
      key: 'cancel',
      icon: 'headset-muted-bold',
      tooltip: 'End Consult',
      onClick: handleEndConsult,
      className: 'call-control-consult-button-cancel',
      shouldShow: isEndConsultEnabled || isAgentBeingConsulted,
    },
  ];

  // Filter buttons that should be shown, then map them
  const visibleButtons = buttons.filter((button) => button.shouldShow);

  return (
    <div className="call-control-consult">
      <div className="consult-header">
        <Avatar iconName="handset-filled" className="task-avatar" size={32} />
        <div>
          <Text tagName="p" type="body-large-bold" className="consult-agent-name">
            {agentName}
          </Text>
          <Text tagName="p" type="body-secondary" className="consult-sub-text">
            {consultCompleted ? 'Consulting' : 'Consult requested'}&nbsp;&bull;&nbsp;
            <TaskTimer key={timerKey} startTimeStamp={startTimeStamp} />
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
