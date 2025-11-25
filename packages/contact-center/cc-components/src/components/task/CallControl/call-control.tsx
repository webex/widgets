import React, {useEffect, useState} from 'react';

import {CallControlComponentProps, CallControlMenuType} from '../task.types';
import './call-control.styles.scss';
import {PopoverNext, TooltipNext, Text, ButtonCircle} from '@momentum-ui/react-collaboration';
import {Icon, Button, Select, Option} from '@momentum-design/components/dist/react';
import ConsultTransferPopoverComponent from './CallControlCustom/consult-transfer-popover';
import AutoWrapupTimer from '../AutoWrapupTimer/AutoWrapupTimer';
import type {MEDIA_CHANNEL as MediaChannelType} from '../task.types';
import {DestinationType} from '@webex/cc-store';
import {WRAP_UP, WRAP_UP_INTERACTION, WRAP_UP_REASON, SELECT, SUBMIT_WRAP_UP} from '../constants';
import {
  handleToggleHold as handleToggleHoldUtil,
  handleMuteToggle as handleMuteToggleUtil,
  handleWrapupCall as handleWrapupCallUtil,
  handleWrapupChange as handleWrapupChangeUtil,
  handleTargetSelect as handleTargetSelectUtil,
  handleCloseButtonPress,
  handleWrapupReasonChange,
  handleAudioRef,
  getMediaType,
  isTelephonyMediaType,
  buildCallControlButtons,
  filterButtonsForConsultation,
  updateCallStateFromTask,
} from './call-control.utils';
import {withMetrics} from '@webex/cc-ui-logging';

function CallControlComponent(props: CallControlComponentProps) {
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [agentMenuType, setAgentMenuType] = useState<CallControlMenuType | null>(null);
  const [isMuteButtonDisabled, setIsMuteButtonDisabled] = useState(false);

  const {
    currentTask,
    toggleHold,
    toggleRecording,
    toggleMute,
    isMuted,
    endCall,
    wrapupCall,
    wrapupCodes,
    isRecording,
    setIsRecording,
    buddyAgents,
    loadBuddyAgents,
    transferCall,
    consultCall,
    exitConference,
    switchToConsult,
    consultConference,
    consultTransfer,
    callControlAudio,
    setConsultAgentName,
    allowConsultToQueue,
    setLastTargetType,
    controlVisibility,
    logger,
    secondsUntilAutoWrapup,
    cancelAutoWrapup,
    getAddressBookEntries,
    getEntryPoints,
    getQueuesFetcher,
    consultTransferOptions,
  } = props;

  useEffect(() => {
    updateCallStateFromTask(currentTask, setIsRecording, logger);
  }, [currentTask, logger]);

  const handletoggleHold = () => {
    handleToggleHoldUtil(controlVisibility.isHeld, toggleHold, logger);
  };

  const handleMuteToggle = () => {
    handleMuteToggleUtil(toggleMute, setIsMuteButtonDisabled, logger);
  };

  const handleWrapupCallLocal = () => {
    handleWrapupCallUtil(
      selectedWrapupReason,
      selectedWrapupId,
      wrapupCall,
      setSelectedWrapupReason,
      setSelectedWrapupId,
      logger
    );
  };

  const handleWrapupChange = (text, value) => {
    handleWrapupChangeUtil(text, value, setSelectedWrapupReason, setSelectedWrapupId, logger);
  };

  const handleTargetSelect = (
    id: string,
    name: string,
    type: DestinationType,
    allowParticipantsToInteract: boolean
  ) => {
    handleTargetSelectUtil(
      id,
      name,
      type,
      allowParticipantsToInteract,
      agentMenuType,
      consultCall,
      transferCall,
      setConsultAgentName,
      setLastTargetType,
      logger
    );
  };

  const currentMediaType = getMediaType(
    currentTask.data.interaction.mediaType as MediaChannelType,
    currentTask.data.interaction.mediaChannel as MediaChannelType,
    logger
  );

  const mediaType = currentTask.data.interaction.mediaType as MediaChannelType;
  const isTelephony = isTelephonyMediaType(mediaType, logger);

  const buttons = buildCallControlButtons(
    isMuted,
    isRecording,
    isMuteButtonDisabled,
    currentMediaType,
    controlVisibility,
    handleMuteToggle,
    handletoggleHold,
    toggleRecording,
    endCall,
    exitConference,
    switchToConsult,
    consultTransfer,
    consultConference
  );

  const filteredButtons = filterButtonsForConsultation(
    buttons,
    controlVisibility.isConsultInitiatedOrAccepted,
    isTelephony,
    logger
  );

  if (!currentTask) return null;

  return (
    <>
      <audio
        ref={(audioElement) => handleAudioRef(audioElement, callControlAudio, logger)}
        id="remote-audio"
        autoPlay
      ></audio>
      <div className="call-control-container" data-testid="call-control-container">
        {!controlVisibility.isConsultReceived && !controlVisibility.wrapup.isVisible && (
          <div className="button-group">
            {filteredButtons.map((button, index) => {
              if (!button.isVisible) return null;

              if (button.menuType) {
                return (
                  <PopoverNext
                    key={index}
                    onShow={() => {
                      logger.info(`CC-Widgets: CallControl: showing consult-transfer popover`, {
                        module: 'call-control.tsx',
                        method: 'onShowPopover',
                      });
                      setShowAgentMenu(true);
                      setAgentMenuType(button.menuType as CallControlMenuType);
                      loadBuddyAgents();
                    }}
                    onHide={() => {
                      setShowAgentMenu(false);
                      setAgentMenuType(null);
                    }}
                    color="primary"
                    delay={[0, 0]}
                    placement="bottom"
                    showArrow
                    variant="medium"
                    interactive
                    offsetDistance={2}
                    className="agent-popover"
                    trigger="click"
                    closeButtonPlacement="top-right"
                    closeButtonProps={{
                      'aria-label': 'Close popover',
                      onPress: () => handleCloseButtonPress(setShowAgentMenu, setAgentMenuType, logger),
                      outline: true,
                    }}
                    triggerComponent={
                      <TooltipNext
                        key={index}
                        triggerComponent={
                          <ButtonCircle
                            className={button.className}
                            aria-label={button.tooltip}
                            disabled={button.disabled}
                            data-testid={button.dataTestId}
                          >
                            <Icon className={button.className + '-icon'} name={button.icon} />
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
                    }
                  >
                    {showAgentMenu && agentMenuType === button.menuType ? (
                      <ConsultTransferPopoverComponent
                        heading={button.menuType}
                        buttonIcon={button.icon}
                        buddyAgents={buddyAgents}
                        getAddressBookEntries={getAddressBookEntries}
                        getEntryPoints={getEntryPoints}
                        getQueues={getQueuesFetcher}
                        onAgentSelect={(agentId, agentName, allowParticipantsToInteract) =>
                          handleTargetSelect(agentId, agentName, 'agent', allowParticipantsToInteract)
                        }
                        onQueueSelect={(queueId, queueName, allowParticipantsToInteract) =>
                          handleTargetSelect(queueId, queueName, 'queue', allowParticipantsToInteract)
                        }
                        onEntryPointSelect={(entryPointId, entryPointName, allowParticipantsToInteract) =>
                          handleTargetSelect(entryPointId, entryPointName, 'entryPoint', allowParticipantsToInteract)
                        }
                        onDialNumberSelect={(dialNumber, allowParticipantsToInteract) =>
                          handleTargetSelect(dialNumber, dialNumber, 'dialNumber', allowParticipantsToInteract)
                        }
                        allowConsultToQueue={allowConsultToQueue}
                        consultTransferOptions={
                          isTelephony
                            ? consultTransferOptions
                            : {
                                ...consultTransferOptions,
                                showDialNumberTab: false,
                                showEntryPointTab: false,
                              }
                        }
                        isConferenceInProgress={controlVisibility.isConferenceInProgress}
                        logger={logger}
                      />
                    ) : null}
                  </PopoverNext>
                );
              }
              return (
                <TooltipNext
                  key={index}
                  triggerComponent={
                    <ButtonCircle
                      className={button.className + (button.disabled ? ` ${button.className}-disabled` : '')}
                      data-testid={button.dataTestId}
                      onPress={button.onClick}
                      disabled={button.disabled}
                      aria-label={button.tooltip}
                    >
                      <Icon className={button.className + '-icon'} name={button.icon} />
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
              );
            })}
          </div>
        )}
        {controlVisibility.wrapup.isVisible && (
          <div className="wrapup-group">
            <PopoverNext
              color="primary"
              delay={[0, 0]}
              placement="bottom-start"
              showArrow
              trigger="click"
              triggerComponent={
                <Button
                  size={28}
                  color="default"
                  variant="secondary"
                  postfix-icon="arrow-down-bold"
                  type="button"
                  role="button"
                  data-testid="call-control:wrapup-button"
                  id="call-control-wrapup-button"
                >
                  {WRAP_UP}
                </Button>
              }
              variant="medium"
              interactive
              offsetDistance={2}
              className="wrapup-popover"
            >
              {currentTask.autoWrapup && (
                <AutoWrapupTimer
                  secondsUntilAutoWrapup={secondsUntilAutoWrapup}
                  allowCancelAutoWrapup={false} // TODO: https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6752 change to currentTask.autoWrapup.allowCancelAutoWrapup when its made supported in multi session from SDK side
                  handleCancelWrapup={cancelAutoWrapup}
                />
              )}

              <Text className="wrapup-header" tagName={'small'} type="body-large-bold">
                {WRAP_UP_INTERACTION}
              </Text>
              <Select
                label={WRAP_UP_REASON}
                help-text-type=""
                height="auto"
                data-aria-label="wrapup-reason"
                toggletip-text=""
                toggletip-placement=""
                info-icon-aria-label=""
                name=""
                className="wrapup-select"
                data-testid="call-control:wrapup-select"
                placeholder={SELECT}
                onChange={(event: CustomEvent) =>
                  handleWrapupReasonChange(event, wrapupCodes, handleWrapupChange, logger)
                }
              >
                {wrapupCodes?.map((code) => (
                  <Option
                    key={code.id}
                    value={code.id}
                    data-testid={`call-control:wrapup-reason-${code.name.toLowerCase()}`}
                  >
                    {code.name}
                  </Option>
                ))}
              </Select>
              <Button
                onClick={handleWrapupCallLocal}
                variant="primary"
                className="submit-wrapup-button"
                data-testid="call-control:wrapup-submit"
                aria-label="Submit wrap-up"
                disabled={selectedWrapupId && selectedWrapupReason ? false : true}
              >
                {SUBMIT_WRAP_UP}
              </Button>
            </PopoverNext>
          </div>
        )}
      </div>
    </>
  );
}

const CallControlComponentWithMetrics = withMetrics(CallControlComponent, 'CallControl');
export default CallControlComponentWithMetrics;
