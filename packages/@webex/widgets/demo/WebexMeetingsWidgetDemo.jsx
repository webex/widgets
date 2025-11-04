import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {Button, Input, Select, SelectOption} from '@momentum-ui/react';
import './WebexMeetingsWidgetDemo.scss';

import {WebexMeetingsWidget} from '../src';
import {deconstructHydraId} from '@webex/common';

export default function WebexMeetingsWidgetDemo({token, fedramp}) {
  const [destination, setDestination] = useState('');
  const [pinOrPass, setPinOrPass] = useState('');
  const [name, setName] = useState('');
  const [displayWidget, setDisplayWidget] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [layout, setLayout] = useState('Grid');
  const spaceIDErrorMessage = (
    <span>
      Using the space ID as a destination is no longer supported. Please refer to the{' '}
      <a href="https://github.com/webex/webex-js-sdk/wiki/Migration-to-Unified-Space-Meetings" target="_blank">
        migration guide
      </a>{' '}
      to migrate to use the meeting ID or SIP address.
    </span>
  );
  const [spaceIDError, setSpaceIDError] = useState('');
  const ON_IOS_15_1 = typeof navigator !== 'undefined'
  && navigator.userAgent.includes('iPhone OS 15_1');

  const displayButtonEnabled = token && destination && !displayWidget;

  const handleDisplayMeetingWidget = (event) => {
    event.preventDefault();
    // Extract the Hydra ID for check
    const hydraId = getHydraId(destination);
    // Check if it's a room or not then show the meeting widget
    if (!hydraId.room) {
      setDisplayWidget(true);
      // Clear the error message
      setSpaceIDError('');
    } else {
      // Set the space ID error message
      setSpaceIDError(spaceIDErrorMessage);
      setDisplayWidget(false);
    }
  };

  const handleHideMeetingWidget = (event) => {
    event.preventDefault();
    setDisplayWidget(false);
  };

  const handleChangeTheme = (selectedOptions) => {
    const selectedTheme = selectedOptions[0].value;
    setTheme(selectedTheme);
  };

  const handleChangeLayout = (selectedOptions) => {
    const selectedLayout = selectedOptions[0].value;
    setLayout(selectedLayout);
  };

  const handleFullscreen = () => {
    const demoWidget = document.querySelector('.webex-meeting-widget-demo');

    if (demoWidget.requestFullscreen) {
      demoWidget.requestFullscreen();
    } else if (demoWidget.webkitRequestFullscreen) {
      /* Safari */
      demoWidget.current.webkitRequestFullscreen();
    } else if (demoWidget.msRequestFullscreen) {
      /* IE11 */
      demoWidget.msRequestFullscreen();
    }
  };

  return (
    <>
      <h3>Webex Meetings Widget</h3>
      <h5>The Webex Meetings Widget allows you to create and join Webex meetings in your browser.</h5>
      {
        ON_IOS_15_1 &&
        <h5 className="webex-warning">We have disabled your camera because you're OS version does not support meeting with it enabled</h5>
      }
      <form className="webex-form">
        <Input
          htmlId="destination"
          label="Widget Destination (email, person ID, SIP)"
          name="destination"
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Widget Destination"
          readOnly={displayWidget}
          type="text"
          value={destination}
        />
        <Input
          htmlId="meetingPasswordOrPin"
          label="Meeting Pin or Password"
          name="meetingPasswordOrPin"
          onChange={(event) => setPinOrPass(event.target.value)}
          placeholder="Meeting Pin or Password"
          readOnly={displayWidget}
          type="text"
          value={pinOrPass}
        />
        <Input
          htmlId="participantName"
          label="Participant Name"
          name="participantName"
          onChange={(event) => setName(event.target.value)}
          placeholder="Participant Name"
          readOnly={displayWidget}
          type="text"
          value={name}
        />
        <Button
          type="submit"
          disabled={!displayButtonEnabled}
          onClick={handleDisplayMeetingWidget}
          ariaLabel="Display Meeting Widget"
        >
          Display Meeting Widget
        </Button>
        <Button disabled={!displayWidget} onClick={handleHideMeetingWidget} ariaLabel="Remove Meeting Widget">
          Remove Meeting Widget
        </Button>
        <Button disabled={!displayWidget} onClick={handleFullscreen} ariaLabel="Display meeting widget full screen">
          Fullscreen
        </Button>
        {spaceIDError &&
          <div className="webex-select-control">
            <div id="display-meeting-widget-status" className="webex-error">
              {spaceIDError}
            </div>
          </div>
        }
        <div className="webex-select-control">Theme</div>
        <Select defaultValue="Dark" onSelect={handleChangeTheme}>
          <SelectOption value="dark" label="Dark" />
          <SelectOption value="light" label="Light" />
        </Select>
        <div className="webex-select-control">Layout</div>
        <Select defaultValue="Grid" onSelect={handleChangeLayout}>
          <SelectOption value="Overlay" label="Overlay" />
          <SelectOption value="Grid" label="Grid" />
          <SelectOption value="Stack" label="Stack" />
          <SelectOption value="Prominent" label="Prominent" />
          <SelectOption value="Focus" label="Focus" />
        </Select>
      </form>
      {token && destination && displayWidget && (
        <WebexMeetingsWidget
          accessToken={token}
          meetingDestination={destination}
          meetingPasswordOrPin={pinOrPass}
          participantName={name}
          className={`webex-meeting-widget-demo wxc-theme-${theme}`}
          layout={layout}
          fedramp={fedramp}
        />
      )}
    </>
  );
}

const getHydraId = (destination) => {
  const { type, id, cluster } = deconstructHydraId(destination);
  const UUID_REG = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // Check if the id is a valid UUID and type is "ROOM"
  if (id && UUID_REG.test(id) && type === "ROOM") {
    return { room: true, destination: id, cluster };
  }

  return {};
};

WebexMeetingsWidgetDemo.propTypes = {
  token: PropTypes.string,
  fedramp: PropTypes.bool,
};

WebexMeetingsWidgetDemo.defaultProps = {
  token: '',
  fedramp: false,
};
