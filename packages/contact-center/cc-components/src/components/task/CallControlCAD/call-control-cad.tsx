import React from 'react';
import CallControlComponent from '../CallControl/call-control';
import {Text, PopoverNext} from '@momentum-ui/react-collaboration';
import {Brandvisual, Icon, Tooltip, Button} from '@momentum-design/components/dist/react';
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
import {withMetrics} from '@webex/cc-ui-logging';

const CallControlCADComponent: React.FC<CallControlComponentProps> = (props) => {
  const {
    currentTask,
    isRecording,
    holdTime,
    consultAgentName,
    consultTimerLabel,
    consultTimerTimestamp,
    endConsultCall,
    consultTransfer,
    consultConference,
    switchToMainCall,
    callControlClassName,
    callControlConsultClassName,
    startTimestamp,
    stateTimerLabel,
    stateTimerTimestamp,
    controlVisibility,
    logger,
    isMuted,
    toggleMute,
    conferenceParticipants,
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

  //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
  const customerName = currentTask?.data?.interaction?.callAssociatedDetails?.customerName;

  //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
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
            className="call-control-task-tooltip"
          >
            <Text tagName="small">{customerText}</Text>
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
            className="call-control-task-tooltip"
          >
            <Text tagName="small">{phoneText}</Text>
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
              <div className="call-details-row">
                <Text className="call-timer" type="body-secondary" tagName={'small'} data-testid="cc-cad:call-timer">
                  {currentMediaType.labelName} - <TaskTimer startTimeStamp={startTimestamp} />
                  {stateTimerLabel && stateTimerTimestamp && (
                    <>
                      {' '}
                      • {stateTimerLabel} - <TaskTimer startTimeStamp={stateTimerTimestamp} />
                    </>
                  )}
                </Text>
                {controlVisibility.isConferenceInProgress && !controlVisibility.wrapup.isVisible && (
                  <>
                    <div className="vertical-divider"></div>
                    <div className="participants-section">
                      <div className="participants-indicator">
                        <Text type="body-secondary" tagName={'small'} className="participants-count">
                          +{Object.keys(conferenceParticipants).length || 1}
                        </Text>
                        <Icon name="participant-list-regular" size={0.875} className="participants-icon" />
                      </div>
                      <PopoverNext
                        color="secondary"
                        delay={[0, 0]}
                        placement="bottom-start"
                        showArrow
                        trigger="click"
                        variant="medium"
                        interactive
                        offsetDistance={2}
                        className="participants-popover"
                        triggerComponent={
                          <Button
                            id="participants-trigger"
                            aria-label="Select Participant"
                            data-testid="call-control:participants-trigger"
                            className="participants-select-button"
                            color="default"
                            variant="tertiary"
                          >
                            <Icon name="arrow-down-bold" className="dropdown-arrow" />
                          </Button>
                        }
                      >
                        <div className="participants-menu">
                          {conferenceParticipants?.map((participant) => (
                            <div
                              key={participant.id}
                              className="participant-menu-item"
                              role="menuitem"
                              tabIndex={0}
                              data-testid={`call-control:participant-${participant.name?.toLowerCase()}`}
                            >
                              {participant.name}
                            </div>
                          ))}
                        </div>
                      </PopoverNext>
                    </div>
                  </>
                )}
              </div>
              <div className="call-status">
                {!controlVisibility.wrapup.isVisible &&
                  controlVisibility.isHeld &&
                  !controlVisibility.isConsultReceived &&
                  !controlVisibility.consultCallHeld && (
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
        {!controlVisibility.wrapup.isVisible && controlVisibility.recordingIndicator.isVisible && (
          <div className="recording-indicator">
            <Icon name={isRecording ? 'record-active-badge-filled' : 'record-paused-badge-filled'} size={1.3} />
          </div>
        )}
        <CallControlComponent {...props} />
        <div className="cad-variables">
          <Text className="queue" type="body-secondary" tagName={'small'}>
            <strong>{QUEUE}</strong>{' '}
            <span>
              {
                //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762

                currentTask?.data?.interaction?.callAssociatedDetails?.virtualTeamName || NO_TEAM_NAME
              }
            </span>
          </Text>
          {renderPhoneNumber()}
          <Text className="rona" type="body-secondary" tagName={'small'}>
            <strong>{RONA}</strong>{' '}
            <span>
              {
                //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762

                currentTask?.data?.interaction?.callAssociatedDetails?.ronaTimeout || NO_RONA
              }
            </span>
          </Text>
        </div>
      </div>
      {controlVisibility.isConsultInitiatedOrAccepted && !controlVisibility.wrapup.isVisible && (
        <div className={`call-control-consult-container ${callControlConsultClassName || ''}`}>
          <CallControlConsultComponent
            agentName={consultAgentName}
            consultTimerLabel={consultTimerLabel}
            consultTimerTimestamp={consultTimerTimestamp}
            endConsultCall={endConsultCall}
            consultTransfer={consultTransfer}
            consultConference={consultConference}
            switchToMainCall={switchToMainCall}
            logger={logger}
            isMuted={isMuted}
            controlVisibility={controlVisibility}
            toggleConsultMute={toggleMute}
          />
        </div>
      )}
    </>
  );
};

const CallControlCADComponentWithMetrics = withMetrics(CallControlCADComponent, 'CallControlCAD');
export default CallControlCADComponentWithMetrics;
