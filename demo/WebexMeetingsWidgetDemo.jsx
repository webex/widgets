import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {Button, Input, Select, SelectOption} from '@momentum-ui/react';
import './WebexMeetingsWidgetDemo.scss';

import {WebexMeetingsWidget} from '../src';

export default function WebexMeetingsWidgetDemo({token, fedramp}) {
  const [destination, setDestination] = useState('');
  const [displayWidget, setDisplayWidget] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [layout, setLayout] = useState('Grid');
  const ON_IOS_15_1 = typeof navigator !== 'undefined'
  && navigator.userAgent.includes('iPhone OS 15_1');

  const displayButtonEnabled = token && destination && !displayWidget;

  const handleDisplayMeetingWidget = (event) => {
    event.preventDefault();
    setDisplayWidget(true);
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
          label="Widget Destination (email, person ID, room ID, SIP)"
          name="destination"
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Widget Destination"
          readOnly={displayWidget}
          type="text"
          value={destination}
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
          className={`webex-meeting-widget-demo wxc-theme-${theme}`}
          layout={layout}
          fedramp={fedramp}
        />
      )}
    </>
  );
}

WebexMeetingsWidgetDemo.propTypes = {
  token: PropTypes.string,
  fedramp: PropTypes.bool,
};

WebexMeetingsWidgetDemo.defaultProps = {
  token: '',
  fedramp: false,
};
