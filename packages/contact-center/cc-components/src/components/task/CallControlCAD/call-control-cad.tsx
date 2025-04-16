import React from 'react';
import CallControlComponent from '../CallControl/call-control';
import {CallControlComponentProps} from '../task.types';
import {Text} from '@momentum-ui/react-collaboration';
import {Icon} from '@momentum-design/components/dist/react';
import './call-control-cad.styles.scss';
import TaskTimer from '../TaskTimer/index';

const CallControlCADComponent: React.FC<CallControlComponentProps> = (props) => {
  const {currentTask, isHeld, isRecording, holdTime, wrapupRequired} = props;

  // Use the Web Worker-based hold timer

  const formatTime = (time: number): string => {
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentTask) return null;

  return (
    <div className="call-control-container">
      {/* Caller Information */}
      <div className="caller-info">
        <div className="call-icon-background">
          <Icon name="handset-filled" size={1} className="call-icon" />
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
              {!wrapupRequired && isHeld && (
                <>
                  <span className="dot">•</span>
                  <div className="on-hold">
                    <Icon name="call-hold-filled" size={1} className="call-hold-filled-icon" />
                    <span className="on-hold-chip-text">On hold - {formatTime(holdTime)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="recording-indicator">
        <Icon name={isRecording ? 'record-active-badge-filled' : 'record-paused-badge-filled'} size={1.3} />
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
    </div>
  );
};

export default CallControlCADComponent;
