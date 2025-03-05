import React, {useEffect, useState} from 'react';

import {CallControlPresentationalProps} from '../task.types';
import './call-control.styles.scss';
import {Button, Icon} from '@momentum-design/components/dist/react';
import {PopoverNext, SelectNext, TooltipNext, Text} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';

function CallControlPresentational(props: CallControlPresentationalProps) {
  const [isHeld, setIsHeld] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);

  const {currentTask, audioRef, toggleHold, toggleRecording, endCall, wrapupCall, wrapupCodes, wrapupRequired} = props;

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

  const handletoggleRecording = () => {
    toggleRecording(isRecording);
    setIsRecording(!isRecording);
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
      prefixIcon: isHeld ? 'play-bold' : 'pause-bold',
      onClick: () => handletoggleHold(),
      className: 'button',
      variant: 'secondary',
      tooltip: isHeld ? 'Resume the call' : 'Hold the call',
    },
    {
      prefixIcon: isRecording ? 'record-paused-bold' : 'record-bold',
      onClick: () => handletoggleRecording(),
      className: 'button',
      variant: 'secondary',
      tooltip: isRecording ? 'Pause Recording' : 'Resume Recording',
    },
    {
      prefixIcon: 'cancel-regular',
      onClick: endCall,
      className: 'button-cancel',
      variant: 'primary',
      tooltip: 'End call',
    },
  ];

  if (!currentTask) return null;

  return (
    <>
      <audio ref={audioRef} id="remote-audio" autoPlay></audio>

      <div className="call-control-container">
        {!wrapupRequired && (
          <div className="button-group">
            {buttons.map((button, index) => (
              <TooltipNext
                key={index}
                color="primary"
                delay={[0, 0]}
                placement="bottom-start"
                triggerComponent={
                  <Button
                    prefixIcon={button.prefixIcon}
                    onClick={button.onClick}
                    className={button.className}
                    variant={button.variant as 'primary' | 'secondary'}
                  />
                }
                type="description"
                variant="small"
                className="tooltip"
              >
                <p>{button.tooltip}</p>
              </TooltipNext>
            ))}
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
                <Button postfixIcon="arrow-down-bold" variant="secondary" onClick={handleWrapupCall}>
                  Wrap up
                </Button>
              }
              variant="medium"
              interactive
              offsetDistance={2}
              className="wrapup-popover"
            >
              <Text className="wrapup-header" tagName={'small'} type="subheader-primary">
                Wrap-up Interaction
              </Text>
              <div className="select-wrapper">
                <SelectNext
                  aria-label="wrapup-reason"
                  className="select"
                  onSelectionChange={(key) => {
                    const selectedItem = wrapupCodes?.find((code) => code.id === key);
                    handleWrapupChange(selectedItem.name, selectedItem.id);
                  }}
                  items={wrapupCodes}
                  showBorder={false}
                  placeholder="Select"
                  label="Wrap-up reason"
                >
                  {(item) => (
                    <Item key={item.id} textValue={item.name}>
                      <Text className="state-name" tagName={'small'}>
                        {item.name}
                      </Text>
                    </Item>
                  )}
                </SelectNext>
                <Icon className="select-arrow-icon" name="arrow-down-bold" title="" />
              </div>
              <Button
                onClick={() => wrapupCall(selectedWrapupReason, selectedWrapupId)}
                variant="primary"
                className="submit-wrapup-button"
                disabled={selectedWrapupId && selectedWrapupReason ? false : true}
              >
                submit & Wrapup
              </Button>
            </PopoverNext>
          </div>
        )}
      </div>
    </>
  );
}

export default CallControlPresentational;
