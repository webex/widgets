import React, { useEffect, useState } from 'react';

import { CallControlComponentProps } from '../task.types';
import './call-control.styles.scss';
import { PopoverNext, TooltipNext, Text, ButtonCircle, ButtonPill, ChipNext, ComboBoxNext, SelectNext } from '@momentum-ui/react-collaboration';
import { Item } from '@react-stately/collections';
import { Icon } from '@momentum-design/components/dist/react';

function CallControlComponentNew(props: CallControlComponentProps) {
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);

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
  } = props;

  useEffect(() => {
    if (!currentTask || !currentTask.data || !currentTask.data.interaction) return;
    console.log('current task is', currentTask.data.interaction);
    const { interaction, mediaResourceId } = currentTask.data;
    const { media, callProcessingDetails } = interaction;
    const isHold = media && media[mediaResourceId] && media[mediaResourceId].isHold;
    setIsHeld(isHold);

    if (callProcessingDetails) {
      const { isPaused } = callProcessingDetails;
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

  const [holdTime, setHoldTime] = useState<number>(0);
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isHeld) {
      const timer = setInterval(() => {
        setHoldTime((prevTime) => prevTime + 1);
      }, 1000);
      setHoldTimer(timer);
    } else {
      if (holdTimer) {
        clearInterval(holdTimer);
        setHoldTimer(null);
        setHoldTime(0);
      }
    }
    return () => {
      if (holdTimer) {
        clearInterval(holdTimer);
      }
    };
  }, [isHeld]);

  useEffect(() => {
    const dotElement = document.querySelector('.dot') as HTMLElement;
    if (dotElement) {
      dotElement.style.display = isHeld ? 'inline' : 'none';
    }
  }, [isHeld]);


  const formatTime = (time: number): string => {
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
      onClick: () => toggleRecording(),
      tooltip: isRecording ? 'Pause Recording' : 'Resume Recording',
      className: 'call-control-button',
      disabled: false,
    },
    {
      icon: 'cancel-bold',
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
      <div className="call-control-container" data-testid="call-control-container">
        {/* Caller Info */}
        <div className="caller-info">
          {/* Call Icon */}
          <div className="call-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="16" cy="16" r="16" fill="black" fillOpacity="0.07" />
              <path
                d="M23.3789 19.5902L21.6252 17.8364C21.2694 17.4819 20.7875 17.283 20.2853 17.2834C19.7831 17.2837 19.3015 17.4832 18.9461 17.8381C18.9461 17.8381 18.0077 18.7926 17.816 18.9947C17.1795 19.0053 16.5473 18.8872 15.9575 18.6476C15.3677 18.408 14.8324 18.0518 14.3835 17.6003C13.4877 16.6963 12.9778 15.4798 12.961 14.2072C13.1925 13.9752 14.1458 13.038 14.1475 13.0363C14.3233 12.8605 14.4629 12.6518 14.5581 12.4222C14.6533 12.1925 14.7023 11.9463 14.7023 11.6976C14.7023 11.449 14.6533 11.2028 14.5581 10.9731C14.4629 10.7434 14.3233 10.5347 14.1475 10.359L12.3935 8.6054C12.0313 8.25982 11.55 8.06702 11.0494 8.06702C10.5488 8.06702 10.0675 8.25982 9.7053 8.6054L8.76752 9.54265C8.0709 10.2393 7.86931 11.7531 8.25296 13.3993C8.59581 14.8712 9.55599 17.1764 12.1816 19.8025C14.8072 22.4287 17.113 23.3885 18.5842 23.7316C19.1053 23.8558 19.6388 23.9201 20.1744 23.9234C20.9924 23.9844 21.8029 23.7317 22.4411 23.2165L23.3789 22.2791C23.5555 22.1026 23.6956 21.893 23.7912 21.6623C23.8867 21.4316 23.9359 21.1844 23.9359 20.9347C23.9359 20.685 23.8867 20.4377 23.7912 20.2071C23.6956 19.9764 23.5555 19.7668 23.3789 19.5903V19.5902Z"
                fill="#1D805F"
              />
            </svg>
          </div>

          {/* Customer Info */}
          <div className="customer-info">
            <Text className="customer-id" type="body-large-bold" tagName={'small'}>
              {currentTask?.data?.interaction?.callAssociatedDetails?.dn || '%Customer ID%'}
            </Text>
            <div className="call-details">
              <Text className="call-timer" type="body-secondary" tagName={'small'}>
                Call - {formatTime(holdTime)}
              </Text>
              {isHeld && (
                <>
                  <span className="dot">•</span>
                  <div className="onhold-chip">
                    <Icon name="call-hold-filled" size={1} className="md-icon" />
                    <span>On hold - {formatTime(holdTime)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Call Control Buttons */}
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

        {/* CAD Variables */}
        <div className="cad-variables">
          <Text className="queue" type="body-secondary" tagName={'small'}>
            <strong>Queue:</strong> <span>{currentTask?.data?.interaction?.callAssociatedDetails?.virtualTeamName || 'No Team Name'}</span>
          </Text>
          <Text className="phone-number" type="body-secondary" tagName={'small'}>
            <strong>Phone number:</strong> <span>{currentTask?.data?.interaction?.callAssociatedDetails?.ani || 'No Phone Number'}</span>
          </Text>
          <Text className="rona" type="body-secondary" tagName={'small'}>
            <strong>RONA:</strong> <span>{currentTask?.data?.interaction?.callAssociatedDetails?.ronaTimeout || 'No RONA'}</span>
          </Text>
        </div>

        {/* Adding Recording Indicator */}
        <div className="recording-indicator">
          {isRecording ? (
            <svg
              className="recording-icon pulse"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 9.55555C8.85911 9.55555 9.55556 8.85911 9.55556 8C9.55556 7.14089 8.85911 6.44444 8 6.44444C7.14089 6.44444 6.44445 7.14089 6.44445 8C6.44445 8.85911 7.14089 9.55555 8 9.55555Z"
                fill="#DB1F2E"
              />
              <path
                d="M8 1C6.61553 1 5.26215 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32121C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C14.998 6.14411 14.2598 4.3648 12.9475 3.05249C11.6352 1.74017 9.85589 1.00203 8 1ZM8 10.5926C7.48723 10.5926 6.98598 10.4405 6.55963 10.1557C6.13329 9.87078 5.80099 9.46587 5.60476 8.99214C5.40853 8.51841 5.35719 7.99712 5.45722 7.49421C5.55726 6.9913 5.80418 6.52934 6.16676 6.16676C6.52934 5.80418 6.9913 5.55726 7.49421 5.45722C7.99713 5.35719 8.51841 5.40853 8.99214 5.60476C9.46588 5.80098 9.87078 6.13328 10.1557 6.55963C10.4405 6.98598 10.5926 7.48723 10.5926 8C10.5918 8.68735 10.3184 9.34631 9.83235 9.83234C9.34632 10.3184 8.68735 10.5918 8 10.5926Z"
                fill="#DB1F2E"
              />
            </svg>
          ) : (
            <svg
              className="recording-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.75 8C14.75 11.7279 11.7279 14.75 8 14.75C4.27208 14.75 1.25 11.7279 1.25 8C1.25 4.27208 4.27208 1.25 8 1.25C11.7279 1.25 14.75 4.27208 14.75 8ZM9 6.25V9.75C9 10.1642 9.33579 10.5 9.75 10.5C10.1642 10.5 10.5 10.1642 10.5 9.75V6.25C10.5 5.83579 10.1642 5.5 9.75 5.5C9.33579 5.5 9 5.83579 9 6.25ZM6.25 5.5C5.83579 5.5 5.5 5.83579 5.5 6.25V9.75C5.5 10.1642 5.83579 10.5 6.25 10.5C6.66421 10.5 7 10.1642 7 9.75V6.25C7 5.83579 6.66421 5.5 6.25 5.5Z"
                fill="#C94403"
              />
            </svg>
          )}
        </div>

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

export default CallControlComponentNew;
