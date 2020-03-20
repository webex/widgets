import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {Button, Input} from '@momentum-ui/react';

import {WebexMeetingWidget} from '../src';

export default function WebexMeetingWidgetDemo({token}) {
  const [destination, setDestination] = useState('');
  const [displayWidget, setDisplayWidget] = useState(false);

  const displayButtonEnabled = token && destination && !displayWidget;

  const handleDisplayMeetingWidget = (event) => {
    event.preventDefault();
    setDisplayWidget(true);
  };

  const handleHideMeetingWidget = (event) => {
    event.preventDefault();
    setDisplayWidget(false);
  };

  return (
    <React.Fragment>
      <h3>Webex Meeting Widget</h3>
      <h5>The Webex Meeting Widget allows you to create and join Webex meetings in your browser.</h5>
      <form>
        <Input
          htmlId="destination"
          label="Widget Destination (email, person ID, room ID, SIP)"
          name="destination"
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Widget Destination"
          readOnly={displayWidget}
          type="text"
          value={destination}
        />
        <Button type="submit" disabled={!displayButtonEnabled} onClick={handleDisplayMeetingWidget}>
          Display Meeting Widget
        </Button>
        <Button disabled={!displayWidget} onClick={handleHideMeetingWidget}>
          Remove Meeting Widget
        </Button>
      </form>
      {token && destination && displayWidget && (
        <WebexMeetingWidget accessToken={token} meetingDestination={destination} />
      )}
    </React.Fragment>
  );
}

WebexMeetingWidgetDemo.propTypes = {
  token: PropTypes.string,
};

WebexMeetingWidgetDemo.defaultProps = {
  token: '',
};
