import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Webex from 'webex';
import {WebexMediaAccess, WebexMeeting, withAdapter, withMeeting} from '@webex/components';
import WebexSDKAdapter from '@webex/sdk-component-adapter';
import WebexLogo from './webex-logo.svg';

import '@momentum-ui/core/css/momentum-ui.min.css';
import '@webex/components/dist/css/webex-components.css';

/**
 * Webex meeting widget displays the default Webex meeting experience.
 *
 * @param {string} props.meetingDestination  ID of the virtual meeting location
 * @param {string} props.accessToken        access token to create the webex instance with
 * @param {string} [props.className]        Custom CSS class to apply
 * @param {string} [props.style]            Custom style to apply
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
    const logo = <img src={WebexLogo} />;
    let content;

    if (audioPermission === 'ASKING') {
      content = <WebexMediaAccess meetingID={meeting.ID} media="microphone" logo={logo} />;
    } else if (videoPermission === 'ASKING') {
      content = <WebexMediaAccess meetingID={meeting.ID} media="camera" logo={logo} />;
    } else {
      content = <WebexMeeting meetingID={meeting.ID} logo={logo} />;
    }

    return (
      <div className={`webex-meeting-widget ${this.props.className}`} style={this.props.style}>
        {content}
      </div>
    );
  }
}

WebexMeetingWidget.propTypes = {
  accessToken: PropTypes.string.isRequired,
  className: PropTypes.string,
  meetingDestination: PropTypes.string.isRequired,
  style: PropTypes.shape(),
};

WebexMeetingWidget.defaultProps = {
  className: '',
  style: {},
};

export default withAdapter(withMeeting(WebexMeetingWidget), (props) => {
  const webex = new Webex({
    credentials: props.accessToken,
  });

  return new WebexSDKAdapter(webex);
});
