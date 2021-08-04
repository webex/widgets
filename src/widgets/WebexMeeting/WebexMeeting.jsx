import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Spinner} from '@momentum-ui/react';
import Webex from 'webex';
import {WebexMediaAccess, WebexMeeting, withAdapter, withMeeting} from '@webex/components';
import WebexSDKAdapter from '@webex/sdk-component-adapter';

import '@momentum-ui/core/css/momentum-ui.min.css';
import '@webex/components/dist/css/webex-components.css';

/**
 * Webex meeting widget displays the default Webex meeting experience.
 *
 * @param {string} props.meetingDestination  ID of the virtual meeting location
 * @param {string} props.accessToken        access token to create the webex instance with
 * @returns {Object} JSX of the component
 */
class WebexMeetingWidget extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const meeting = this.props.meeting;
    const audioPermission = meeting.localAudio?.permission;
    const videoPermission = meeting.localVideo?.permission;
    let content;

    if (audioPermission === 'ASKING') {
      content = <WebexMediaAccess meetingID={meeting.ID} media="microphone" />;
    } else if (videoPermission === 'ASKING') {
      content = <WebexMediaAccess meetingID={meeting.ID} media="camera" />;
    } else {
      content = <WebexMeeting meetingID={meeting.ID} />;
    }

    return (
      <div className="webex-meeting-widget">
        {content}
      </div>
    );
  }
}

WebexMeetingWidget.propTypes = {
  accessToken: PropTypes.string.isRequired,
  meetingDestination: PropTypes.string.isRequired,
};

export default withAdapter(withMeeting(WebexMeetingWidget), (props) => {
  const webex = new Webex({
    credentials: props.accessToken,
  });

  return new WebexSDKAdapter(webex);
});
