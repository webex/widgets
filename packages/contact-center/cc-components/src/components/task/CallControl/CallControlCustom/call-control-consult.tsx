import React, {useState} from 'react';
import {ButtonCircle, TooltipNext, Text} from '@momentum-ui/react-collaboration';
import {Avatar, Icon} from '@momentum-design/components/dist/react';
import TaskTimer from '../../TaskTimer';
import {CallControlConsultComponentsProps} from '../../task.types';
import {
  createConsultButtons,
  getVisibleButtons,
  handleTransferPress,
  handleEndConsultPress,
  handleMuteToggle,
  getConsultStatusText,
  createTimerKey,
  handleConsultConferencePress,
} from './call-control-custom.utils';

const CallControlConsultComponent: React.FC<CallControlConsultComponentsProps> = ({
  agentName,
  startTimeStamp,
  onTransfer,
  endConsultCall,
  consultConference,
  consultCompleted,
  isAgentBeingConsulted,
  isEndConsultEnabled,
  logger,
  muteUnmute,
  isMuted,
  onToggleConsultMute,
}) => {
  const [isMuteDisabled, setIsMuteDisabled] = useState(false);

  const timerKey = createTimerKey(startTimeStamp);

  const handleTransfer = () => {
    handleTransferPress(onTransfer, logger);
  };

  const handleEndConsult = () => {
    handleEndConsultPress(endConsultCall, logger);
  };

  const handleConsultMuteToggle = () => {
    handleMuteToggle(onToggleConsultMute, setIsMuteDisabled, logger);
  };

  const handleConsultConference = () => {
    handleConsultConferencePress(consultConference, logger);
  };

  const buttons = createConsultButtons(
    isMuted,
    isMuteDisabled,
    consultCompleted,
    isAgentBeingConsulted,
    isEndConsultEnabled,
    muteUnmute,
    onTransfer ? handleTransfer : undefined,
    handleConsultMuteToggle,
    handleEndConsult,
    handleConsultConference
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
            {getConsultStatusText(consultCompleted)}&nbsp;&bull;&nbsp;
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
