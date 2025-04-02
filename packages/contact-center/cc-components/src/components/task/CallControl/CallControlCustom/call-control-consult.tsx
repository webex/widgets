import React from 'react';
import {ButtonCircle, TooltipNext, Text} from '@momentum-ui/react-collaboration';
import {Avatar, Icon} from '@momentum-design/components/dist/react';
import TaskTimer from '../../TaskTimer';

export interface CallControlConsultComponentsProps {
  agentName: string;
  startTimeStamp: number;
  onTransfer?: () => void;
  endConsultCall: () => void;
  consultCompleted: boolean;
  showTransfer: boolean;
}

const CallControlConsultComponent: React.FC<CallControlConsultComponentsProps> = ({
  agentName,
  startTimeStamp,
  onTransfer,
  endConsultCall,
  consultCompleted,
  showTransfer,
}) => {
  const buttons = [
    {
      key: 'transfer',
      icon: 'next-bold',
      tooltip: 'Transfer Consult',
      onClick: onTransfer,
      className: 'call-control-button',
      disabled: !consultCompleted,
    },
    {
      key: 'cancel',
      icon: 'headset-muted-bold',
      tooltip: 'End Consult',
      onClick: endConsultCall,
      className: 'call-control-consult-button-cancel',
    },
  ];

  return (
    <div className="call-control-consult">
      <div className="consult-task-header" style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
        <Avatar iconName="handset-filled" className="task-avatar" size={32} />
        <div
          className="consult-task-details"
          style={{display: 'flex', flexDirection: 'column', marginLeft: '8px', gap: '0.25rem'}}
        >
          <Text tagName="p" type="body-large-bold" style={{margin: 0, lineHeight: 1}}>
            {agentName}
          </Text>
          <Text tagName="p" type="body-secondary" className="consult-sub-text" style={{lineHeight: 1}}>
            {consultCompleted ? 'Consult' : 'Consult requested'}&nbsp;&bull;&nbsp;
            <TaskTimer startTimeStamp={startTimeStamp} />
          </Text>
        </div>
      </div>
      <div className="consult-buttons" style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-start'}}>
        {buttons.map(
          (button) =>
            (button.key !== 'transfer' || (showTransfer && onTransfer)) && (
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
            )
        )}
      </div>
    </div>
  );
};

export default CallControlConsultComponent;
