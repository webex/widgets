import React, {useEffect, useRef} from 'react';
import CallControlComponent from '../CallControl/call-control';
import {Text} from '@momentum-ui/react-collaboration';
import {
  Avatar,
  Brandvisual,
  Button,
  Dialog,
  Divider,
  Icon,
  List,
  ListItem,
  Popover,
  Text as MomentumText,
  Tooltip,
} from '@momentum-design/components/dist/react';
import './call-control-cad.styles.scss';
import TaskTimer from '../TaskTimer/index';
import CallControlConsultComponent from '../CallControl/CallControlCustom/call-control-consult';
import {MEDIA_CHANNEL as MediaChannelType, CallControlComponentProps, CallAssociatedDataMap} from '../task.types';
import {ConferenceParticipantDropTarget} from '@webex/cc-store';
import {getAgentViewableGlobalVariables} from '../Task/task.utils';
import GlobalVariablesPanel from '../GlobalVariablesPanel/global-variables-panel';
import {ParticipantRosterSectionProps} from './call-control-cad.types';

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

const ParticipantRosterSection: React.FC<ParticipantRosterSectionProps> = ({
  heading,
  headingId,
  targets,
  pendingParticipantDropId,
  participantDropIsPending,
  rosterDropDisabled,
  onParticipantDropRequest,
}) => (
  <section className="participant-roster-section" aria-labelledby={headingId}>
    <MomentumText className="participant-roster-heading" id={headingId} tagname="h4" type="body-midsize-bold">
      {heading}
    </MomentumText>
    <List className="participant-roster-list" loop="false">
      {targets.map((target) => {
        const dropIsDisabled = target.isDropDisabled || participantDropIsPending || rosterDropDisabled;

        return (
          <ListItem
            className="participant-menu-item"
            key={`${target.participantType}-${target.dropTargetId}`}
            variant="inset-rectangle"
          >
            <Icon
              slot="leading-controls"
              name={target.isPrimary ? 'primary-participant-regular' : 'meet-regular'}
              size={1.125}
              className="participant-menu-icon"
            />
            <MomentumText slot="leading-text-primary-label" tagname="span" type="body-midsize-regular">
              {target.displayName}
              {target.isPrimary ? ' (Primary)' : ''}
            </MomentumText>
            {!target.isReadOnly && (
              <Button
                slot="trailing-controls"
                type="button"
                size={24}
                variant="secondary"
                color="negative"
                aria-label={`Drop ${target.participantType.toLowerCase()} ${target.displayName}`}
                aria-busy={pendingParticipantDropId === target.dropTargetId}
                disabled={dropIsDisabled}
                onClick={() => {
                  if (!dropIsDisabled) {
                    onParticipantDropRequest(target);
                  }
                }}
              >
                {pendingParticipantDropId === target.dropTargetId ? 'Dropping…' : 'Drop'}
              </Button>
            )}
          </ListItem>
        );
      })}
    </List>
  </section>
);

const CallControlCADComponent: React.FC<CallControlComponentProps> = (props) => {
  const {
    currentTask,
    isRecording,
    isHeld,
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
    controls,
    logger,
    isMuted,
    toggleMute,
    conferenceParticipantDropRoster = null,
    pendingParticipantDropId = null,
    participantDropAnnouncement = null,
    participantDropConfirmationTarget = null,
    participantDropConfirmationDisabled = true,
    requestParticipantDrop = async () => undefined,
    confirmParticipantDrop = async () => undefined,
    cancelParticipantDropConfirmation = () => undefined,
    conferenceEnabled = true,
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
  const participantsCount = conferenceParticipantDropRoster?.participants.length ?? 0;
  const participantsLabel = participantsCount === 1 ? 'Participant' : 'Participants';
  const shouldShowParticipantsList = Boolean(conferenceParticipantDropRoster);
  const participantMenuTriggerRef = useRef<HTMLElement | null>(null);
  const callControlContainerRef = useRef<HTMLDivElement | null>(null);
  const customerDropDialogWasOpenRef = useRef(false);
  const participantPopoverRef = useRef<React.ElementRef<typeof Popover> | null>(null);
  const participantDropIsPending = pendingParticipantDropId !== null;
  const interactionId = currentTask.data.interaction.interactionId;
  const participantsTriggerId = `participants-trigger-${interactionId}`;
  const participantsPopoverId = `participants-popover-${interactionId}`;

  const customerName = currentTask?.data?.interaction?.callAssociatedDetails?.customerName;

  const ani = currentTask?.data?.interaction?.callAssociatedDetails?.ani;
  const isOutdial = currentTask?.data?.interaction?.outboundType === 'OUTDIAL';
  const dnis =
    currentTask?.data?.interaction?.callAssociatedDetails?.dnis ||
    currentTask?.data?.interaction?.callProcessingDetails?.dnis;
  const displayNumber = isOutdial ? dnis || ani : ani;

  const callAssociatedData = currentTask?.data?.interaction?.callAssociatedData as CallAssociatedDataMap | undefined;
  const latestGlobalVariables = getAgentViewableGlobalVariables(callAssociatedData);

  // Persist global variables across task updates — some store refreshes
  // replace currentTask with a snapshot that omits callAssociatedData,
  // which causes getAgentViewableGlobalVariables to return [].
  // We intentionally keep the previous values when length === 0 because
  // an empty array indicates missing data, not a legitimate clearing of
  // variables.  Variables are never cleared mid-call by the backend.
  // Reset when the interaction changes so stale CAD from a previous task
  // is never shown on a new call.
  const globalVariablesRef = useRef(latestGlobalVariables);
  const prevInteractionIdRef = useRef(interactionId);
  if (prevInteractionIdRef.current !== interactionId) {
    prevInteractionIdRef.current = interactionId;
    globalVariablesRef.current = latestGlobalVariables;
  } else if (latestGlobalVariables.length > 0) {
    globalVariablesRef.current = latestGlobalVariables;
  }
  const globalVariables = globalVariablesRef.current;

  const restoreCustomerDropFocusFallback = () => {
    // Closing the roster before opening the Dialog makes its Customer button unavailable for
    // focus restoration. Return focus to the stable participant trigger, or to end-call if
    // hydration removed the entire roster while the confirmation was open.
    participantPopoverRef.current?.hide();
    globalThis.setTimeout(() => {
      const participantMenuTrigger = participantMenuTriggerRef.current;
      const stableCallControl = callControlContainerRef.current?.querySelector<HTMLElement>(
        '[data-testid="call-control:end-call"]'
      );

      (participantMenuTrigger?.isConnected ? participantMenuTrigger : stableCallControl)?.focus();
    }, 0);
  };

  useEffect(() => {
    if (participantDropConfirmationTarget) {
      customerDropDialogWasOpenRef.current = true;
      return;
    }

    if (customerDropDialogWasOpenRef.current) {
      customerDropDialogWasOpenRef.current = false;
      restoreCustomerDropFocusFallback();
    }
  }, [participantDropConfirmationTarget]);

  const handleParticipantDropRequest = (target: ConferenceParticipantDropTarget) => {
    if (target.requiresConfirmation) {
      // Avoid stacking two focus-trapped Momentum overlays. The customer confirmation dialog
      // becomes the only active overlay and returns focus to the stable participant trigger.
      participantPopoverRef.current?.hide();
    }

    void requestParticipantDrop(target);
  };

  // Create unique IDs for tooltips
  const customerNameTriggerId = `customer-name-trigger-${currentTask.data.interaction.interactionId}`;
  const customerNameTooltipId = `customer-name-tooltip-${currentTask.data.interaction.interactionId}`;
  const phoneNumberTriggerId = `phone-number-trigger-${currentTask.data.interaction.interactionId}`;
  const phoneNumberTooltipId = `phone-number-tooltip-${currentTask.data.interaction.interactionId}`;

  // For telephony calls, ani is the originating number and dn is the destination.
  // Inbound: ani = caller's number, dn = entry point dialed by caller
  // Outdial: ani = agent's originating number (entry point), dn = customer's dialed number
  const renderCustomerName = () => {
    const customerText = isSocial ? customerName || NO_CUSTOMER_NAME : displayNumber || NO_CALLER_ID;

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
      <div ref={callControlContainerRef} className={`call-control-container ${callControlClassName || ''}`}>
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
                {shouldShowParticipantsList && (
                  <>
                    <Divider className="vertical-divider" orientation="vertical" />
                    <div className="participants-section">
                      <Button
                        ref={(element) => {
                          participantMenuTriggerRef.current = element as HTMLElement | null;
                        }}
                        id={participantsTriggerId}
                        aria-label="Conference participants"
                        data-testid="call-control:participants-trigger"
                        className="participants-select-button"
                        color="default"
                        variant="tertiary"
                        size={24}
                        postfix-icon="arrow-down-bold"
                      >
                        +{participantsCount} {participantsLabel}
                      </Button>
                      <Popover
                        ref={participantPopoverRef}
                        id={participantsPopoverId}
                        triggerID={participantsTriggerId}
                        trigger="click"
                        placement="bottom-end"
                        color="tonal"
                        delay="0,0"
                        offset={6}
                        showArrow={false}
                        interactive
                        focusTrap
                        hideOnEscape
                        hideOnOutsideClick
                        focusBackToTrigger
                        ariaLabelledby={participantsTriggerId}
                        className="participants-popover"
                        data-testid="call-control:participants-popover"
                      >
                        <div className="participants-menu">
                          {conferenceParticipantDropRoster?.customer && (
                            <ParticipantRosterSection
                              heading="Customer"
                              headingId={`${participantsPopoverId}-customer-heading`}
                              targets={[conferenceParticipantDropRoster.customer]}
                              pendingParticipantDropId={pendingParticipantDropId}
                              participantDropIsPending={participantDropIsPending}
                              rosterDropDisabled={Boolean(conferenceParticipantDropRoster.isDropDisabled)}
                              onParticipantDropRequest={handleParticipantDropRequest}
                            />
                          )}
                          {conferenceParticipantDropRoster?.customer &&
                            conferenceParticipantDropRoster.participants.length > 0 && (
                              <Divider className="participant-roster-divider" />
                            )}
                          {conferenceParticipantDropRoster?.participants.length ? (
                            <ParticipantRosterSection
                              heading="Participants"
                              headingId={`${participantsPopoverId}-participants-heading`}
                              targets={conferenceParticipantDropRoster.participants}
                              pendingParticipantDropId={pendingParticipantDropId}
                              participantDropIsPending={participantDropIsPending}
                              rosterDropDisabled={Boolean(conferenceParticipantDropRoster.isDropDisabled)}
                              onParticipantDropRequest={handleParticipantDropRequest}
                            />
                          ) : null}
                        </div>
                      </Popover>
                    </div>
                  </>
                )}
              </div>
              <div className="call-status">
                {!controls?.main?.wrapup?.isVisible && isHeld && (
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
        {!controls?.main?.wrapup?.isVisible && isTelephony && (
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
        </div>
        <GlobalVariablesPanel variables={globalVariables} className="cad-global-variables" />
      </div>
      <Dialog
        className="participant-drop-dialog"
        visible={Boolean(participantDropConfirmationTarget)}
        size="small"
        triggerID={
          participantDropConfirmationTarget || customerDropDialogWasOpenRef.current ? participantsTriggerId : undefined
        }
        headerText="Drop customer from conference?"
        descriptionText="The customer will be removed from this conference. The remaining participants can continue the call."
        closeButtonAriaLabel="Cancel customer Drop"
        data-testid="call-control:customer-drop-dialog"
        onClose={cancelParticipantDropConfirmation}
      >
        <div slot="footer" className="participant-drop-dialog-actions">
          <Button
            type="button"
            size={32}
            variant="secondary"
            color="default"
            data-testid="call-control:customer-drop-cancel"
            onClick={cancelParticipantDropConfirmation}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size={32}
            variant="primary"
            color="negative"
            disabled={participantDropConfirmationDisabled}
            data-testid="call-control:customer-drop-confirm"
            onClick={() => {
              if (!participantDropConfirmationDisabled) {
                void confirmParticipantDrop();
              }
            }}
          >
            Drop
          </Button>
        </div>
      </Dialog>
      {participantDropAnnouncement && (
        <div className="participant-drop-feedback">
          {participantDropAnnouncement.type === 'success' ? (
            <MomentumText
              tagname="p"
              type="body-midsize-regular"
              className="participant-drop-feedback-success"
              role="status"
              aria-live="polite"
              data-testid="call-control:participant-drop-success"
            >
              {participantDropAnnouncement.message}
            </MomentumText>
          ) : (
            <MomentumText
              tagname="p"
              type="body-midsize-regular"
              className="participant-drop-feedback-error"
              role="alert"
              aria-live="assertive"
              data-testid="call-control:participant-drop-error"
            >
              {participantDropAnnouncement.message}
            </MomentumText>
          )}
        </div>
      )}
      {(controls?.consult?.endConsult?.isVisible || controls?.main?.endConsult?.isVisible) &&
        !controls?.main?.wrapup?.isVisible && (
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
              controls={controls}
              toggleConsultMute={toggleMute}
              conferenceEnabled={conferenceEnabled}
            />
          </div>
        )}
    </>
  );
};

const CallControlCADComponentWithMetrics = withMetrics(CallControlCADComponent, 'CallControlCAD');
export default CallControlCADComponentWithMetrics;
