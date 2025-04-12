import React, {useEffect, useState} from 'react';
import CallControlComponent from '../CallControl/call-control';
import {CallControlComponentProps} from '../task.types';
import {Text} from '@momentum-ui/react-collaboration';
import {Icon} from '@momentum-design/components/dist/react';
import {useHoldTimer} from '../CallControlCAD/on-hold-timer';
import './call-control-cad.styles.scss';
import TaskTimer from '../TaskTimer/index';

const CallControlCADComponent: React.FC<CallControlComponentProps> = (props) => {
  const [isDotVisible, setIsDotVisible] = useState(false);
  const {currentTask, isHeld, isRecording, wrapupRequired} = props;

  // Use the Web Worker-based hold timer
  const holdTime = useHoldTimer(isHeld);

  useEffect(() => {
    setIsDotVisible(isHeld);
  }, [isHeld]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentTask) return null;

  return (
    <div className="call-control-container">
      {/* Caller Information */}
      {!wrapupRequired && (
        <>
          <div className="caller-info">
            <div className="call-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="black" fillOpacity="0.07" />
                <path
                  d="M23.3789 19.5902L21.6252 17.8364C21.2694 17.4819 20.7875 17.283 20.2853 17.2834C19.7831 17.2837 19.3015 17.4832 18.9461 17.8381C18.9461 17.8381 18.0077 18.7926 17.816 18.9947C17.1795 19.0053 16.5473 18.8872 15.9575 18.6476C15.3677 18.408 14.8324 18.0518 14.3835 17.6003C13.4877 16.6963 12.9778 15.4798 12.961 14.2072C13.1925 13.9752 14.1458 13.038 14.1475 13.0363C14.3233 12.8605 14.4629 12.6518 14.5581 12.4222C14.6533 12.1925 14.7023 11.9463 14.7023 11.6976C14.7023 11.449 14.6533 11.2028 14.5581 10.9731C14.4629 10.7434 14.3233 10.5347 14.1475 10.359L12.3935 8.6054C12.0313 8.25982 11.55 8.06702 11.0494 8.06702C10.5488 8.06702 10.0675 8.25982 9.7053 8.6054L8.76752 9.54265C8.0709 10.2393 7.86931 11.7531 8.25296 13.3993C8.59581 14.8712 9.55599 17.1764 12.1816 19.8025C14.8072 22.4287 17.113 23.3885 18.5842 23.7316C19.1053 23.8558 19.6388 23.9201 20.1744 23.9234C20.9924 23.9844 21.8029 23.7317 22.4411 23.2165L23.3789 22.2791C23.5555 22.1026 23.6956 21.893 23.7912 21.6623C23.8867 21.4316 23.9359 21.1844 23.9359 20.9347C23.9359 20.685 23.8867 20.4377 23.7912 20.2071C23.6956 19.9764 23.5555 19.7668 23.3789 19.5903V19.5902Z"
                  fill="#1D805F"
                />
              </svg>
            </div>

            <div className="customer-info">
              <Text className="customer-id" type="body-large-bold" tagName={'small'}>
                {currentTask?.data?.interaction?.callAssociatedDetails?.ani || 'No Caller ID'}
              </Text>
              <div className="call-details">
                <Text className="call-timer" type="body-secondary" tagName={'small'}>
                  Call - <TaskTimer startTimeStamp={currentTask?.data?.interaction?.startTime} />
                </Text>
                <div className="call-status">
                  {isDotVisible && <span className="dot">•</span>}
                  {isHeld && (
                    <div className="onhold">
                      <Icon name="call-hold-filled" size={1} className="call-hold-filled-icon" />
                      <span className="onhold-chip-text">On hold - {formatTime(holdTime)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="recording-indicator">
            <Icon name={isRecording ? 'record-active-badge-filled' : 'record-paused-badge-filled'} size={2} />
          </div>

          <CallControlComponent {...props} />

          <div className="cad-variables">
            <Text className="queue" type="body-secondary" tagName={'small'}>
              <strong>Queue:</strong>{' '}
              <span>{currentTask?.data?.interaction?.callAssociatedDetails?.virtualTeamName || 'No Team Name'}</span>
            </Text>
            <Text className="phone-number" type="body-secondary" tagName={'small'}>
              <strong>Phone number:</strong>{' '}
              <span>{currentTask?.data?.interaction?.callAssociatedDetails?.ani || 'No Phone Number'}</span>
            </Text>
            <Text className="rona" type="body-secondary" tagName={'small'}>
              <strong>RONA:</strong>{' '}
              <span>{currentTask?.data?.interaction?.callAssociatedDetails?.ronaTimeout || 'No RONA'}</span>
            </Text>
          </div>
        </>
      )}
      {wrapupRequired && <CallControlComponent {...props} />}
    </div>
  );
};

export default CallControlCADComponent;
