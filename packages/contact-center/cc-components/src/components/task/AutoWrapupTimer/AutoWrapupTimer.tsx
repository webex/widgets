import React from 'react';
import {Button, Icon, Text, ListItem} from '@momentum-design/components/dist/react';
import './AutoWrapupTimer.css';
import {AutoWrapupTimerProps} from '../task.types';
import {UNTIL_AUTO_WRAPUP, CANCEL} from '../constants';
import {getTimerUIState} from './AutoWrapupTimer.utils';

const AutoWrapupTimer: React.FC<AutoWrapupTimerProps> = ({
  secondsUntilAutoWrapup,
  allowCancelAutoWrapup,
  handleCancelWrapup,
}) => {
  const {containerClassName, iconClassName, iconName, formattedTime} = getTimerUIState(secondsUntilAutoWrapup);
  return (
    <>
      <ListItem className={containerClassName}>
        <Icon length-unit="rem" slot="leading-controls" className={iconClassName} name={iconName} size={1.25}></Icon>
        <div slot="leading-controls" className="wrapup-timer-label">
          <Text slot="leading-controls" type="body-large-bold">
            {formattedTime}
          </Text>
          <Text slot="leading-controls" type="body-large-regular">
            {UNTIL_AUTO_WRAPUP}
          </Text>
        </div>
        {allowCancelAutoWrapup && (
          <Button slot="trailing-controls" variant="secondary" onClick={handleCancelWrapup}>
            {CANCEL}
          </Button>
        )}
      </ListItem>
    </>
  );
};

export default AutoWrapupTimer;
