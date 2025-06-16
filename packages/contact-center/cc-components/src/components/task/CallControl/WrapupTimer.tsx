import React from 'react';
import {Button, Icon, Text, ListItem} from '@momentum-design/components/dist/react';
import './AutoWrapupTimer.css';

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
    <>
      <ListItem className={containerClassName}>
        <Icon
          length-unit="rem"
          slot="leading-controls"
          className={iconClassName}
          name={isUrgent ? 'alert-active-bold' : 'recents-bold'}
          size={1.25}
        ></Icon>
        <Text slot="leading-controls" type="body-large-bold">
          {`${Math.floor(secondsUntilAutoWrapup / 60)
            .toString()
            .padStart(2, '0')}:${(secondsUntilAutoWrapup % 60).toString().padStart(2, '0')}`}
        </Text>
        <Text slot="leading-controls" type="body-large-regular">
          Until auto wrap-up
        </Text>
        {allowCancelAutoWrapup && (
          <Button slot="trailing-controls" variant="secondary" onClick={handleCancelWrapup}>
            Cancel
          </Button>
        )}
      </ListItem>
    </>
  );
};

export default WrapupTimer;
