import React, {useEffect, useState} from 'react';

import {CallControlComponentProps, DestinationType, CallControlMenuType} from '../task.types';
import './call-control.styles.scss';
import {PopoverNext, SelectNext, TooltipNext, Text, ButtonCircle, ButtonPill} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';
import {Icon} from '@momentum-design/components/dist/react';
import ConsultTransferPopoverComponent from './CallControlCustom/consult-transfer-popover';
import CallControlConsultComponent from './CallControlCustom/call-control-consult';

function CallControlComponent(props: CallControlComponentProps) {
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [agentMenuType, setAgentMenuType] = useState<CallControlMenuType | null>(null);
  const [lastTargetType, setLastTargetType] = useState<'agent' | 'queue'>('agent');

  const {
    currentTask,
    toggleHold,
    toggleRecording,
    endCall,
    wrapupCall,
    wrapupCodes,
    wrapupRequired,
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
    endConsultCall,
    consultTransfer,
    consultInitiated,
    consultCompleted,
    consultAccepted,
    consultStartTimeStamp,
    callControlAudio,
    consultAgentName,
    setConsultAgentName,
    consultAgentId,
    setConsultAgentId,
    isEndConsultEnabled,
    allowConsultToQueue,
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
    toggleHold(!isHeld);
    setIsHeld(!isHeld);
  };

  const handleWrapupCall = () => {
    if (selectedWrapupReason && selectedWrapupId) {
      wrapupCall(selectedWrapupReason, selectedWrapupId);
      setSelectedWrapupReason(null);
      setSelectedWrapupId(null);
    }
  };

  const handleWrapupChange = (text, value) => {
    setSelectedWrapupReason(text);
    setSelectedWrapupId(value);
  };

  const handleTargetSelect = (id: string, name: string, type: DestinationType) => {
    if (agentMenuType === 'Consult') {
      try {
        consultCall(id, type);
        setConsultAgentId(id);
        setConsultAgentName(name);
        setLastTargetType(type);
      } catch (error) {
        throw new Error('Error during consult call', error);
      }
    } else {
      try {
        transferCall(id, type);
      } catch (error) {
        throw new Error('Error during transfer call', error);
      }
    }
  };

  const handlePopoverOpen = (menuType: CallControlMenuType) => {
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

  const buttons = [
    {
      id: 'hold',
      icon: isHeld ? 'play-bold' : 'pause-bold',
      onClick: () => handletoggleHold(),
      tooltip: isHeld ? 'Resume the call' : 'Hold the call',
      className: 'call-control-button',
      disabled: false,
    },
    {
      id: 'consult',
      icon: 'headset-bold',
      tooltip: 'Consult with another agent',
      className: 'call-control-button',
      disabled: false,
      menuType: 'Consult',
    },
    {
      id: 'transfer',
      icon: 'next-bold',
      tooltip: 'Transfer call',
      className: 'call-control-button',
      disabled: false,
      menuType: 'Transfer',
    },
    {
      id: 'record',
      icon: isRecording ? 'record-paused-bold' : 'record-bold',
      onClick: () => toggleRecording(),
      tooltip: isRecording ? 'Pause Recording' : 'Resume Recording',
      className: 'call-control-button',
      disabled: false,
    },
    {
      id: 'end',
      icon: 'cancel-regular',
      onClick: endCall,
      tooltip: 'End call',
      className: 'call-control-button-cancel',
      disabled: isHeld,
    },
  ];

  const filteredButtons = consultInitiated
    ? buttons.filter((button) => !['hold', 'consult'].includes(button.id))
    : buttons;

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
        {!consultAccepted && !wrapupRequired && (
          <div className="button-group">
            {filteredButtons.map((button, index) => {
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
                            disabled={button.disabled || consultInitiated}
                            data-testid="ButtonCircle"
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
                      className={button.className}
                      onPress={button.onClick}
                      disabled={button.disabled || consultInitiated}
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
        {wrapupRequired && (
          <div className="wrapup-group">
            <PopoverNext
              color="primary"
              delay={[0, 0]}
              placement="bottom-start"
              showArrow
              trigger="click"
              triggerComponent={
                <ButtonPill className="wrapup-button">
                  Wrap up
                  <Icon name="arrow-down-bold" />
                </ButtonPill>
              }
              variant="medium"
              interactive
              offsetDistance={2}
              className="wrapup-popover"
            >
              <Text className="wrapup-header" tagName={'small'} type="body-large-bold">
                Wrap-up Interaction
              </Text>
              <Text className="wrapup-header" tagName={'small'} type="body-secondary">
                Wrap-up reason
              </Text>
              <SelectNext
                aria-label="wrapup-reason"
                className="wrapup-select"
                onSelectionChange={(key) => {
                  const selectedItem = wrapupCodes?.find((code) => code.id === key);
                  handleWrapupChange(selectedItem.name, selectedItem.id);
                }}
                items={wrapupCodes}
                showBorder={false}
                placeholder="Select"
              >
                {(item) => (
                  <Item key={item.id} textValue={item.name}>
                    <Text className="wrapup-name" tagName={'small'}>
                      {item.name}
                    </Text>
                  </Item>
                )}
              </SelectNext>
              <Icon className="wrapup-select-arrow-icon" name="arrow-down-bold" title="" />
              <ButtonPill
                className="submit-wrapup-button"
                onPress={handleWrapupCall}
                disabled={selectedWrapupId && selectedWrapupReason ? false : true}
                aria-label="Submit wrap-up"
              >
                Submit & Wrap up
              </ButtonPill>
            </PopoverNext>
          </div>
        )}

        {(consultAccepted || consultInitiated) && !wrapupRequired && (
          <div className={`call-control-consult-container ${consultAccepted ? 'no-border' : ''}`}>
            <CallControlConsultComponent
              agentName={consultAgentName}
              startTimeStamp={consultStartTimeStamp}
              endConsultCall={endConsultCall}
              onTransfer={() => consultTransfer(consultAgentId || currentTask.data.destAgentId, lastTargetType)}
              consultCompleted={consultCompleted}
              showTransfer={!consultAccepted}
              isEndConsultEnabled={isEndConsultEnabled}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default CallControlComponent;
