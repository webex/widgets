import React, {useEffect, useState} from 'react';

import {CallControlPresentationalProps} from '../task.types';
import './call-control.styles.scss';
import {PopoverNext, SelectNext, TooltipNext, Text, ButtonCircle, ButtonPill} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';
import {Icon} from '@momentum-design/components/dist/react';

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
      icon: isHeld ? 'play-bold' : 'pause-bold',
      onClick: () => handletoggleHold(),
      tooltip: isHeld ? 'Resume the call' : 'Hold the call',
      className: 'call-control-button',
      disabled: false,
    },
    {
      icon: isRecording ? 'record-paused-bold' : 'record-bold',
      onClick: () => handletoggleRecording(),
      tooltip: isRecording ? 'Pause Recording' : 'Resume Recording',
      className: 'call-control-button',
      disabled: false,
    },
    {
      icon: 'cancel-regular',
      onClick: endCall,
      tooltip: 'End call',
      className: 'call-control-button-cancel',
      disabled: isHeld,
    },
  ];

  if (!currentTask) return null;

  return (
    <>
      <audio ref={audioRef} id="remote-audio" autoPlay></audio>
      {currentTask && (
        <div className="box call-control">
          <section className="section-box">
            <fieldset className="fieldset">
              <legend className="legend-box">Call Control</legend>
              <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <ButtonPill onPress={handletoggleHold} disabled={wrapupRequired} color={isHeld ? 'join' : 'cancel'}>
                    {isHeld ? 'Resume' : 'Hold'}
                  </ButtonPill>
                  <ButtonPill onPress={handletoggleRecording} disabled={wrapupRequired}>
                    {isRecording ? 'Pause Recording' : 'Resume Recording'}
                  </ButtonPill>
                  <ButtonPill onPress={endCall} disabled={wrapupRequired || isHeld}>
                    End
                  </ButtonPill>
                </div>
                <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                  <select className="select" onChange={handleWrapupChange} disabled={!wrapupRequired}>
                    <option value="">Select the wrap-up reason</option>
                    {wrapupCodes.map((wrapup: WrapupCodes) => (
                      <option key={wrapup.id} value={wrapup.id}>
                        {wrapup.name}
                      </option>
                    ))}
                  </select>
                  <ButtonPill onPress={handleWrapupCall} disabled={!wrapupRequired && !selectedWrapupReason}>
                    Wrap Up
                  </ButtonPill>
                </div>
              </div>
            </fieldset>
          </section>
        </div>
      )}
      <div className="call-control-container" data-testid="call-control-container">
        {!wrapupRequired && (
          <div className="button-group">
            {buttons.map((button, index) => (
              <TooltipNext
                key={index}
                color="primary"
                delay={[0, 0]}
                placement="bottom-start"
                triggerComponent={
                  <ButtonCircle className={button.className} onPress={button.onClick} disabled={button.disabled}>
                    <Icon className={button.className + '-icon'} name={button.icon} />
                  </ButtonCircle>
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

export default CallControlPresentational;
