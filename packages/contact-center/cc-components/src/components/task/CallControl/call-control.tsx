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
    isHeld,
    setIsHeld,
    isRecording,
    setIsRecording,
    buddyAgents,
    loadBuddyAgents,
    transferCall,
    consultCall,
    consultInitiated,
    consultAccepted,
    callControlAudio,
    setConsultAgentName,
    setConsultAgentId,
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
    updateCallStateFromTask(currentTask, setIsHeld, setIsRecording, logger);
  }, [currentTask, logger]);

  const handletoggleHold = () => {
    handleToggleHoldUtil(isHeld, toggleHold, setIsHeld, logger);
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

  const handleTargetSelect = (id: string, name: string, type: DestinationType) => {
    handleTargetSelectUtil(
      id,
      name,
      type,
      agentMenuType,
      consultCall,
      transferCall,
      setConsultAgentId,
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
    isHeld,
    isRecording,
    isMuteButtonDisabled,
    currentMediaType,
    controlVisibility,
    handleMuteToggle,
    handletoggleHold,
    toggleRecording,
    endCall,
    logger
  );

  const filteredButtons = filterButtonsForConsultation(buttons, consultInitiated, isTelephony, logger);

  if (!currentTask) return null;

  return (
    <>
      <audio
        ref={(audioElement) => handleAudioRef(audioElement, callControlAudio, logger)}
        id="remote-audio"
        autoPlay
      ></audio>
      <div className="call-control-container" data-testid="call-control-container">
        {!(consultAccepted && isTelephony) && !controlVisibility.wrapup && (
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
                            disabled={button.disabled || (consultInitiated && isTelephony)}
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
                        onAgentSelect={(agentId, agentName) => handleTargetSelect(agentId, agentName, 'agent')}
                        onQueueSelect={(queueId, queueName) => handleTargetSelect(queueId, queueName, 'queue')}
                        onEntryPointSelect={(entryPointId, entryPointName) =>
                          handleTargetSelect(entryPointId, entryPointName, 'entryPoint')
                        }
                        onDialNumberSelect={(dialNumber) => handleTargetSelect(dialNumber, dialNumber, 'dialNumber')}
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
                      className={
                        button.className +
                        (button.disabled || (consultInitiated && isTelephony) ? ` ${button.className}-disabled` : '')
                      }
                      data-testid={button.dataTestId}
                      onPress={button.onClick}
                      disabled={button.disabled || (consultInitiated && isTelephony)}
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
        {controlVisibility.wrapup && (
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
