import React, {useEffect, useState} from 'react';
import {PopoverNext, SelectNext, TooltipNext, Text, ButtonCircle, ButtonPill} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';
import {Icon} from '@momentum-design/components/dist/react';

import './call-control.styles.scss';
import {CallControlComponentProps} from '../task.types';
import ConsultTransferPopoverComponent from './CallControlCustom/consult-transfer-popover';
import {getControlsVisibility} from '../../../utils/task-util';

function CallControlComponent(props: CallControlComponentProps) {
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [agentMenuType, setAgentMenuType] = useState<'Consult' | 'Transfer' | null>(null);

  const {
    currentTask,
    audioRef,
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
    transferCall,
    consultCall,
    deviceType,
    featureFlags,
  } = props;

  const visibleCtrl = getControlsVisibility(deviceType, featureFlags, currentTask);

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

  const buttons = [
    {
      icon: isHeld ? 'play-bold' : 'pause-bold',
      onClick: () => handletoggleHold(),
      tooltip: isHeld ? 'Resume the call' : 'Hold the call',
      className: 'call-control-button',
      disabled: false,
      isVisible: visibleCtrl.holdResume,
    },
    {
      icon: 'headset-bold',
      tooltip: 'Consult with another agent',
      className: 'call-control-button',
      disabled: false,
      menuType: 'Consult',
      isVisible: visibleCtrl.consult,
    },
    {
      icon: 'next-bold',
      tooltip: 'Transfer call',
      className: 'call-control-button',
      disabled: false,
      menuType: 'Transfer',
      isVisible: visibleCtrl.transfer,
    },
    {
      icon: isRecording ? 'record-paused-bold' : 'record-bold',
      onClick: () => toggleRecording(),
      tooltip: isRecording ? 'Pause Recording' : 'Resume Recording',
      className: 'call-control-button',
      disabled: false,
      isVisible: visibleCtrl.pauseResumeRecording,
    },
    {
      icon: 'cancel-regular',
      onClick: endCall,
      tooltip: 'End call',
      className: 'call-control-button-cancel',
      disabled: isHeld,
      isVisible: visibleCtrl.end,
    },
  ];

  if (!currentTask) return null;

  return (
    <>
      <audio ref={audioRef} id="remote-audio" autoPlay></audio>
      <div className="call-control-container" data-testid="call-control-container">
        {!wrapupRequired && (
          <div className="button-group">
            {buttons.map((button, index) => {
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
                            disabled={button.disabled}
                            data-testid="ButtonCircle"
                            onPress={() => {
                              // If popover is already visible, we close it
                              if (showAgentMenu && agentMenuType === button.menuType) {
                                setShowAgentMenu(false);
                                setAgentMenuType(null);
                              } else {
                                setAgentMenuType(button.menuType as 'Consult' | 'Transfer');
                                setShowAgentMenu(true);
                                loadBuddyAgents();
                              }
                            }}
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
                        onAgentSelect={(agentId) => {
                          setShowAgentMenu(false);
                          if (agentMenuType === 'Consult') {
                            consultCall();
                          } else {
                            // Adding agent for now by default, will update once we have queues
                            transferCall(agentId, 'agent');
                          }
                          setAgentMenuType(null);
                        }}
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
        {wrapupRequired && visibleCtrl.wrapup && (
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
      </div>
    </>
  );
}

export default CallControlComponent;
