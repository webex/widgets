import React from 'react';
import {Icon} from '@momentum-design/components/dist/react';
import {Text, ButtonPill} from '@momentum-ui/react-collaboration';
import './WrapupTimer.css';

interface WrapupTimerProps {
  secondsUntilAutoWrapup: number;
  allowCancelAutoWrapup?: boolean;
  handleCancelWrapup: () => void;
}

const WrapupTimer: React.FC<WrapupTimerProps> = ({
  secondsUntilAutoWrapup,
  allowCancelAutoWrapup,
  handleCancelWrapup,
}) => {
  const isUrgent = secondsUntilAutoWrapup <= 10;
  const containerClassName = isUrgent ? 'wrapup-timer-container urgent' : 'wrapup-timer-container';
  const iconClassName = isUrgent ? 'wrapup-timer-icon urgent' : 'wrapup-timer-icon';
  return (
    <div className={containerClassName}>
      <Icon name={isUrgent ? 'alert-active-bold' : 'recents-bold'} title="" className={iconClassName} />
      <div className="wrapup-timer-content">
        <Text className="wrapup-header wrapup-time" tagName={'small'} type="body-large-bold">
          {`${Math.floor(secondsUntilAutoWrapup / 60)
            .toString()
            .padStart(2, '0')}:${(secondsUntilAutoWrapup % 60).toString().padStart(2, '0')}`}
        </Text>
        <Text className="wrapup-header wrapup-text" tagName={'small'} type="body-large-regular">
          Until auto wrap-up
        </Text>
      </div>
      {allowCancelAutoWrapup && (
        <ButtonPill
          className="wrapup-cancel-button"
          onPress={handleCancelWrapup}
          aria-label="cancel"
          size={24}
          outline
          ghost
        >
          Cancel
        </ButtonPill>
      )}
    </div>
  );
};

export default WrapupTimer;
