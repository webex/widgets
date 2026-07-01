import React, {useRef} from 'react';
import CallControlComponent from '../CallControl/call-control';
import {Text, PopoverNext} from '@momentum-ui/react-collaboration';
import {Avatar, Brandvisual, Icon, Tooltip, Button} from '@momentum-design/components/dist/react';
import './call-control-cad.styles.scss';
import TaskTimer from '../TaskTimer/index';
import CallControlConsultComponent from '../CallControl/CallControlCustom/call-control-consult';
import {
  MEDIA_CHANNEL as MediaChannelType,
  CallControlComponentProps,
  getCallerIdentifier,
  CallAssociatedDataMap,
} from '../task.types';
import {getAgentViewableGlobalVariables} from '../Task/task.utils';
import GlobalVariablesPanel from '../GlobalVariablesPanel/global-variables-panel';

import {getMediaTypeInfo} from '../../../utils';
import {
  NO_CUSTOMER_NAME,
  NO_CALLER_ID,
  NO_PHONE_NUMBER,
  NO_TEAM_NAME,
  ON_HOLD,
  QUEUE,
  PHONE_NUMBER,
  CUSTOMER_NAME,
  CAMPAIGN_CALL,
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
    isCampaignCall = false,
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
  const participantsCount = conferenceParticipants?.length || 1;
  const participantsLabel = participantsCount === 1 ? 'Participant' : 'Participants';

  //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
  const customerName = currentTask?.data?.interaction?.callAssociatedDetails?.customerName;

  //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
  const ani = currentTask?.data?.interaction?.callAssociatedDetails?.ani;
  //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
  const dn = currentTask?.data?.interaction?.callAssociatedDetails?.dn;

  //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
  const callAssociatedData = currentTask?.data?.interaction?.callAssociatedData as CallAssociatedDataMap | undefined;
  const latestGlobalVariables = getAgentViewableGlobalVariables(callAssociatedData);

  // Persist and accumulate global variables across task updates.
  // Each websocket event may only carry a subset of the full
  // callAssociatedData, so we merge new variables into the ref by name
  // instead of replacing the whole array.  This ensures all global
  // variables seen during the interaction are displayed — matching the
  // regular desktop behaviour.
  // When length === 0 we keep previous values (missing data, not a
  // legitimate clearing — variables are never cleared mid-call).
  // Reset when the interaction changes so stale CAD from a previous
  // task is never shown on a new call.
  const interactionId = currentTask.data.interaction.interactionId;
  const globalVariablesRef = useRef(latestGlobalVariables);
  const prevInteractionIdRef = useRef(interactionId);
  if (prevInteractionIdRef.current !== interactionId) {
    prevInteractionIdRef.current = interactionId;
    globalVariablesRef.current = latestGlobalVariables;
  } else if (latestGlobalVariables.length > 0) {
    const existingMap = new Map(globalVariablesRef.current.map((v) => [v.name, v]));
    latestGlobalVariables.forEach((v) => existingMap.set(v.name, v));
    globalVariablesRef.current = Array.from(existingMap.values());
  }
  const globalVariables = globalVariablesRef.current;

  // Create unique IDs for tooltips
  const customerNameTriggerId = `customer-name-trigger-${currentTask.data.interaction.interactionId}`;
  const customerNameTooltipId = `customer-name-tooltip-${currentTask.data.interaction.interactionId}`;
  const phoneNumberTriggerId = `phone-number-trigger-${currentTask.data.interaction.interactionId}`;
  const phoneNumberTooltipId = `phone-number-tooltip-${currentTask.data.interaction.interactionId}`;

  // For telephony calls, ani is the originating number and dn is the destination.
  // Inbound: ani = caller's number, dn = entry point dialed by caller
  // Outdial: ani = agent's originating number (entry point), dn = customer's dialed number
  const outboundType = currentTask?.data?.interaction?.outboundType;
  const callerNumber = getCallerIdentifier(ani, dn, outboundType);

  const renderCustomerName = () => {
    const customerText = isSocial ? customerName || NO_CUSTOMER_NAME : callerNumber || NO_CALLER_ID;

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
    const phoneText = isSocial
      ? customerName || NO_CUSTOMER_NAME
      : isTelephony
        ? ani || NO_PHONE_NUMBER
        : ani || NO_PHONE_NUMBER;
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
            {isCampaignCall ? (
              <Avatar icon-name="campaign-management-bold" className="campaign-call-avatar" />
            ) : currentMediaType.isBrandVisual ? (
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
                  {isCampaignCall ? CAMPAIGN_CALL : currentMediaType.labelName} -{' '}
                  <TaskTimer startTimeStamp={startTimestamp} />
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
                      <PopoverNext
                        color="secondary"
                        delay={[0, 0]}
                        placement="bottom-end"
                        showArrow={false}
                        trigger="click"
                        variant="medium"
                        interactive
                        offsetDistance={6}
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
                            <Text type="body-secondary" tagName={'small'} className="participants-count">
                              +{participantsCount} {participantsLabel}
                            </Text>
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
                              <Icon name="meet-regular" size={1.125} className="participant-menu-icon" />
                              <span className="participant-menu-text">{participant.name}</span>
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
        </div>
        <GlobalVariablesPanel variables={globalVariables} className="cad-global-variables" />
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
