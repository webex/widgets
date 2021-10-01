import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Webex from 'webex';
import {WebexMediaAccess, WebexMeeting, withAdapter, withMeeting} from '@webex/components';
import WebexSDKAdapter from '@webex/sdk-component-adapter';
import WebexLogo from './WebexLogo';

import '@webex/components/dist/css/webex-components.css';
import './WebexMeeting.css';

/**
 * Webex meeting widget displays the default Webex meeting experience.
 *
 * @param {string} props.meetingDestination  ID of the virtual meeting location
 * @param {string} props.accessToken        access token to create the webex instance with
 * @param {string} [props.className]        Custom CSS class to apply
 * @param {Function} [props.controls]         Controls to display
 * @param {number} [props.controlsCollapseRangeStart]  Zero-based index of the first collapsible control (can be negative)
 * @param {number} [props.controlsCollapseRangeEnd]  Zero-based index before the last collapsible control (can be negative)
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
    const logo = <WebexLogo />;
    let content;

    if (audioPermission === 'ASKING') {
      content = <WebexMediaAccess className="webex-meeting-widget__content" meetingID={meeting.ID} media="microphone" logo={logo} />;
    } else if (videoPermission === 'ASKING') {
      content = <WebexMediaAccess className="webex-meeting-widget__content" meetingID={meeting.ID} media="camera" logo={logo} />;
    } else {
      content = (
        <WebexMeeting 
          className="webex-meeting-widget__content" 
          meetingID={meeting.ID} 
          logo={logo} 
          controls={this.props.controls}
          controlsCollapseRangeStart={this.props.controlsCollapseRangeStart} 
          controlsCollapseRangeEnd={this.props.controlsCollapseRangeEnd} 
        />
      );
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
  controls: PropTypes.func,
  controlsCollapseRangeStart: PropTypes.number,
  controlsCollapseRangeEnd: PropTypes.number,
  meetingDestination: PropTypes.string.isRequired,
  style: PropTypes.shape(),
};

WebexMeetingWidget.defaultProps = {
  className: '',
  controls: undefined,
  controlsCollapseRangeStart: undefined,
  controlsCollapseRangeEnd: undefined,
  style: {},
};

const appName = process.env.NODE_ENV === 'production' ? 'webex-widgets-meeting' : 'webex-widgets-meeting-dev';

export default withAdapter(withMeeting(WebexMeetingWidget), (props) => {
  const webex = new Webex({
    credentials: {
      access_token: props.accessToken,
    },
    config: {
      appName,
      appVersion: __appVersion__,
    }
  });

  return new WebexSDKAdapter(webex);
});
