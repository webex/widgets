import React from 'react';
import CallControlComponent from '../CallControl/call-control';
import {Text} from '@momentum-ui/react-collaboration';
import {Brandvisual, Icon, Tooltip} from '@momentum-design/components/dist/react';
import './call-control-cad.styles.scss';
import TaskTimer from '../TaskTimer/index';
import CallControlConsultComponent from '../CallControl/CallControlCustom/call-control-consult';
import {MEDIA_CHANNEL as MediaChannelType, CallControlComponentProps} from '../task.types';
import {getMediaTypeInfo} from '../../../utils';
import {
  NO_CUSTOMER_NAME,
  NO_CALLER_ID,
  NO_PHONE_NUMBER,
  NO_TEAM_NAME,
  NO_RONA,
  ON_HOLD,
  QUEUE,
  PHONE_NUMBER,
  CUSTOMER_NAME,
  RONA,
} from '../constants';

const CallControlCADComponent: React.FC<CallControlComponentProps> = (props) => {
  const {
    currentTask,
    isHeld,
    isRecording,
    holdTime,
    consultAccepted,
    consultInitiated,
    consultAgentName,
    consultStartTimeStamp,
    endConsultCall,
    consultAgentId,
    consultCompleted,
    consultTransfer,
    callControlClassName,
    callControlConsultClassName,
    startTimestamp,
    isEndConsultEnabled,
    lastTargetType,
    controlVisibility,
    logger,
  } = props;

  const formatTime = (time: number): string => {
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentMediaType = getMediaTypeInfo(
    currentTask.data.interaction.mediaType as MediaChannelType,
    currentTask.data.interaction.mediaChannel as MediaChannelType
  );

  const mediaChannel = currentTask.data.interaction.mediaType as MediaChannelType;
  const isSocial = mediaChannel === MediaChannelType.SOCIAL;
  const isTelephony = mediaChannel === MediaChannelType.TELEPHONY;
  const customerName = currentTask?.data?.interaction?.callAssociatedDetails?.customerName;
  const ani = currentTask?.data?.interaction?.callAssociatedDetails?.ani;

  // Create unique IDs for tooltips
  const customerNameTriggerId = `customer-name-trigger-${currentTask.data.interaction.interactionId}`;
  const customerNameTooltipId = `customer-name-tooltip-${currentTask.data.interaction.interactionId}`;
  const phoneNumberTriggerId = `phone-number-trigger-${currentTask.data.interaction.interactionId}`;
  const phoneNumberTooltipId = `phone-number-tooltip-${currentTask.data.interaction.interactionId}`;

  const renderCustomerName = () => {
    const customerText = isSocial ? customerName || NO_CUSTOMER_NAME : ani || NO_CALLER_ID;

    const textComponent = (
      <Text
        className={!isTelephony ? 'digital-customer-name' : 'voice-customer-name'}
        type="body-large-bold"
        tagName={'p'}
        id={!isTelephony ? customerNameTriggerId : undefined}
      >
        {customerText}
      </Text>
    );

    if (!isTelephony) {
      return (
        <>
          {textComponent}
          <Tooltip
            color="contrast"
            delay="0,0"
            id={customerNameTooltipId}
            placement="top-start"
            offset={4}
            tooltip-type="description"
            triggerID={customerNameTriggerId}
            className="task-tooltip"
          >
            <Text tagName="small" className="task-tooltip-text">
              {customerText}
            </Text>
          </Tooltip>
        </>
      );
    }

    return textComponent;
  };

  const renderPhoneNumber = () => {
    const phoneText = isSocial ? customerName || NO_CUSTOMER_NAME : ani || NO_PHONE_NUMBER;
    const labelText = isSocial ? CUSTOMER_NAME : PHONE_NUMBER;

    const textComponent = (
      <Text
        className={!isTelephony ? 'digital-phone-number' : 'voice-phone-number'}
        type="body-secondary"
        tagName={'p'}
        id={!isTelephony ? phoneNumberTriggerId : undefined}
      >
        <strong>{labelText}</strong> <span>{phoneText}</span>
      </Text>
    );

    if (!isTelephony) {
      return (
        <>
          {textComponent}
          <Tooltip
            color="contrast"
            delay="0,0"
            id={phoneNumberTooltipId}
            placement="top-start"
            offset={4}
            tooltip-type="description"
            triggerID={phoneNumberTriggerId}
            className="task-tooltip"
          >
            <Text tagName="small" className="task-tooltip-text">
              {phoneText}
            </Text>
          </Tooltip>
        </>
      );
    }

    return textComponent;
  };

  if (!currentTask) return null;

  return (
    <>
      <div className={`call-control-container ${callControlClassName || ''}`}>
        {/* Caller Information */}
        <div className="caller-info">
          <div className="call-icon-background">
            {currentMediaType.isBrandVisual ? (
              <Brandvisual name={currentMediaType.iconName} className={`media-icon ${currentMediaType.className}`} />
            ) : (
              <Icon name={currentMediaType.iconName} size={1} className={`media-icon ${currentMediaType.className}`} />
            )}
          </div>

          <div className="customer-info">
            {renderCustomerName()}
            <div className="call-details">
              <Text className="call-timer" type="body-secondary" tagName={'small'}>
                {currentMediaType.labelName} - <TaskTimer startTimeStamp={startTimestamp} />
              </Text>
              <div className="call-status">
                {!controlVisibility.wrapup && isHeld && (
                  <>
                    <span className="dot">•</span>
                    <div className="on-hold">
                      <Icon name="call-hold-filled" size={1} className="call-hold-filled-icon" />
                      <span className="on-hold-chip-text">
                        {ON_HOLD} {formatTime(holdTime)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {!controlVisibility.wrapup && controlVisibility.recordingIndicator && (
          <div className="recording-indicator">
            <Icon name={isRecording ? 'record-active-badge-filled' : 'record-paused-badge-filled'} size={1.3} />
          </div>
        )}
        <CallControlComponent {...props} />
        <div className="cad-variables">
          <Text className="queue" type="body-secondary" tagName={'small'}>
            <strong>{QUEUE}</strong>{' '}
            <span>{currentTask?.data?.interaction?.callAssociatedDetails?.virtualTeamName || NO_TEAM_NAME}</span>
          </Text>
          {renderPhoneNumber()}
          <Text className="rona" type="body-secondary" tagName={'small'}>
            <strong>{RONA}</strong>{' '}
            <span>{currentTask?.data?.interaction?.callAssociatedDetails?.ronaTimeout || NO_RONA}</span>
          </Text>
        </div>
      </div>
      {(consultAccepted || consultInitiated) && !controlVisibility.wrapup && isTelephony && (
        <div className={`call-control-consult-container ${callControlConsultClassName || ''}`}>
          <CallControlConsultComponent
            agentName={consultAgentName}
            startTimeStamp={consultStartTimeStamp}
            endConsultCall={endConsultCall}
            onTransfer={() => consultTransfer(consultAgentId || currentTask.data.destAgentId, lastTargetType)}
            consultCompleted={consultCompleted}
            isAgentBeingConsulted={!consultAccepted}
            isEndConsultEnabled={isEndConsultEnabled}
            logger={logger}
          />
        </div>
      )}
    </>
  );
};

export default CallControlCADComponent;
