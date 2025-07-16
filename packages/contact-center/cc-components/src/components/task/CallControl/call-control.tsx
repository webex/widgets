import React, {useEffect, useState} from 'react';

import {CallControlComponentProps, DestinationType, CallControlMenuType} from '../task.types';
import './call-control.styles.scss';
import {PopoverNext, TooltipNext, Text, ButtonCircle} from '@momentum-ui/react-collaboration';
import {Icon, Button, Select, Option} from '@momentum-design/components/dist/react';
import ConsultTransferPopoverComponent from './CallControlCustom/consult-transfer-popover';
import AutoWrapupTimer from '../AutoWrapupTimer/AutoWrapupTimer';
import type {MEDIA_CHANNEL as MediaChannelType} from '../task.types';
import {getMediaTypeInfo} from '../../../utils';
import {
  RESUME_CALL,
  HOLD_CALL,
  CONSULT_AGENT,
  TRANSFER,
  PAUSE_RECORDING,
  RESUME_RECORDING,
  END,
  WRAP_UP,
  WRAP_UP_INTERACTION,
  WRAP_UP_REASON,
  SELECT,
  SUBMIT_WRAP_UP,
  MUTE_CALL,
  UNMUTE_CALL,
} from '../constants';

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
    queues,
    loadQueues,
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
  } = props;

  useEffect(() => {
    if (!currentTask || !currentTask.data || !currentTask.data.interaction) return;

    const {interaction, mediaResourceId} = currentTask.data;
    const {media, callProcessingDetails} = interaction;
    const isHold = media && media[mediaResourceId] && media[mediaResourceId].isHold;
    setIsHeld(isHold);

    if (callProcessingDetails) {
      const {isPaused} = callProcessingDetails;
      setIsRecording(!isPaused);
    }
  }, [currentTask]);

  const handletoggleHold = () => {
    logger.info(`CC-Widgets: CallControl: is Call On Hold status is ${isHeld}`, {
      module: 'call-control.tsx',
      method: 'handletoggleHold',
    });
    toggleHold(!isHeld);
    setIsHeld(!isHeld);
  };

  const handleMuteToggle = () => {
    setIsMuteButtonDisabled(true);

    try {
      toggleMute();
    } catch (error) {
      logger.error('Mute toggle failed:', {
        error,
        module: 'call-control.tsx',
        method: 'handleMuteToggle',
      });
    } finally {
      // Re-enable button after operation
      setTimeout(() => {
        setIsMuteButtonDisabled(false);
      }, 500);
    }
  };

  const handleWrapupCall = () => {
    logger.info('CC-Widgets: CallControl: wrap-up submitted', {
      module: 'call-control.tsx',
      method: 'handleWrapupCall',
    });
    if (selectedWrapupReason && selectedWrapupId) {
      wrapupCall(selectedWrapupReason, selectedWrapupId);
      setSelectedWrapupReason(null);
      setSelectedWrapupId(null);
      logger.log('CC-Widgets: CallControl: wrapup completed', {
        module: 'call-control.tsx',
        method: 'handleWrapupCall',
      });
    }
  };

  const handleWrapupChange = (text, value) => {
    setSelectedWrapupReason(text);
    setSelectedWrapupId(value);
  };

  const handleTargetSelect = (id: string, name: string, type: DestinationType) => {
    logger.info('CC-Widgets: CallControl: handling target agent selected', {
      module: 'call-control.tsx',
      method: 'handleTargetSelect',
    });
    if (agentMenuType === 'Consult') {
      try {
        consultCall(id, type);
        setConsultAgentId(id);
        setConsultAgentName(name);
        setLastTargetType(type);
      } catch (error) {
        throw new Error('Error during consult call', error);
      }
    } else if (agentMenuType === 'Transfer') {
      try {
        transferCall(id, type);
      } catch (error) {
        throw new Error('Error during transfer call', error);
      }
    }
  };

  const handlePopoverOpen = (menuType: CallControlMenuType) => {
    logger.info('CC-Widgets: CallControl: opening call control popover', {
      module: 'call-control.tsx',
      method: 'handlePopoverOpen',
    });
    if (showAgentMenu && agentMenuType === menuType) {
      setShowAgentMenu(false);
      setAgentMenuType(null);
    } else {
      setAgentMenuType(menuType);
      setShowAgentMenu(true);
      loadBuddyAgents();
      loadQueues();
    }
  };

  const currentMediaType = getMediaTypeInfo(
    currentTask.data.interaction.mediaType as MediaChannelType,
    currentTask.data.interaction.mediaChannel as MediaChannelType
  );

  const mediaType = currentTask.data.interaction.mediaType as MediaChannelType;
  const isTelephony = mediaType === 'telephony';

  const buttons = [
    {
      id: 'mute',
      icon: isMuted ? 'microphone-muted-bold' : 'microphone-bold',
      onClick: handleMuteToggle,
      tooltip: isMuted ? UNMUTE_CALL : MUTE_CALL,
      className: `${isMuted ? 'call-control-button-muted' : 'call-control-button'}`,
      disabled: isMuteButtonDisabled,
      isVisible: controlVisibility.muteUnmute,
    },
    {
      id: 'hold',
      icon: isHeld ? 'play-bold' : 'pause-bold',
      onClick: () => handletoggleHold(),
      tooltip: isHeld ? RESUME_CALL : HOLD_CALL,
      className: 'call-control-button',
      disabled: false,
      isVisible: controlVisibility.holdResume,
      dataTestId: 'call-control:hold-toggle',
    },
    {
      id: 'consult',
      icon: 'headset-bold',
      tooltip: CONSULT_AGENT,
      className: 'call-control-button',
      disabled: false,
      menuType: 'Consult',
      isVisible: controlVisibility.consult,
      dataTestId: 'call-control:consult',
    },
    {
      id: 'transfer',
      icon: 'next-bold',
      tooltip: `${TRANSFER} ${currentMediaType.labelName}`,
      className: 'call-control-button',
      disabled: false,
      menuType: 'Transfer',
      isVisible: controlVisibility.transfer,
      dataTestId: 'call-control:transfer',
    },
    {
      id: 'record',
      icon: isRecording ? 'record-paused-bold' : 'record-bold',
      onClick: () => toggleRecording(),
      tooltip: isRecording ? PAUSE_RECORDING : RESUME_RECORDING,
      className: 'call-control-button',
      disabled: false,
      isVisible: controlVisibility.pauseResumeRecording,
      dataTestId: 'call-control:recording-toggle',
    },
    {
      id: 'end',
      icon: 'cancel-regular',
      onClick: endCall,
      tooltip: `${END} ${currentMediaType.labelName}`,
      className: 'call-control-button-cancel',
      disabled: isHeld,
      isVisible: controlVisibility.end,
      dataTestId: 'call-control:end-call',
    },
  ];

  const filteredButtons =
    consultInitiated && isTelephony ? buttons.filter((button) => !['hold', 'consult'].includes(button.id)) : buttons;

  if (!currentTask) return null;

  return (
    <>
      <audio
        ref={(audioElement) => {
          if (audioElement && callControlAudio) {
            audioElement.srcObject = callControlAudio;
          }
        }}
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
                      onPress: () => {
                        setShowAgentMenu(false);
                        setAgentMenuType(null);
                      },
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
                            onPress={() => handlePopoverOpen(button.menuType as CallControlMenuType)}
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
                        queues={queues}
                        onAgentSelect={(agentId, agentName) => handleTargetSelect(agentId, agentName, 'agent')}
                        onQueueSelect={(queueId, queueName) => handleTargetSelect(queueId, queueName, 'queue')}
                        allowConsultToQueue={allowConsultToQueue}
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
                onChange={(event: CustomEvent) => {
                  const key = event.detail.value;
                  const selectedItem = wrapupCodes?.find((code) => code.id === key);
                  handleWrapupChange(selectedItem.name, selectedItem.id);
                }}
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
                onClick={handleWrapupCall}
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

export default CallControlComponent;
