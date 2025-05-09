import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Webex from 'webex';
import {WebexMediaAccess, WebexMeeting, withAdapter, withMeeting} from '@webex/components';
import WebexSDKAdapter from '@webex/sdk-component-adapter';
import WebexLogo from './WebexLogo';

import '@webex/components/dist/css/webex-components.css';
import './WebexMeetings.css';

/**
 * Webex meeting widget presents a Webex meeting experience.
 *
 * @param {string} props.meetingDestination  ID of the virtual meeting location
 * @param {string} props.meetingPasswordOrPin  Password or pin of the virtual meeting location
 * @param {string} props.participantName     Name of the participant joining the meeting from the widget
 * @param {string} props.accessToken         Access token of the joining user
 * @param {string} [props.layout]            Layout for remote video (e.g. grid, focus, stack, etc)
 * @param {Function} [props.controls]        Meeting controls to display
 * @param {number} [props.controlsCollapseRangeStart]  Zero-based index of the first collapsible control (can be negative)
 * @param {number} [props.controlsCollapseRangeEnd]    Zero-based index before the last collapsible control (can be negative)
 * @param {string} [props.style]            Custom style to apply
 * @param {string} [props.className]        Custom CSS class to apply
 * @returns {Object} JSX of the component
 */
class WebexMeetingsWidget extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const meeting = this.props.meeting;
    const audioPermission = meeting.localAudio?.permission;
    const videoPermission = meeting.localVideo?.permission;
    const logo = <WebexLogo />;
    const contentClass = 'webex-meetings-widget__content';

    let content = undefined;

    if (audioPermission === 'ASKING') {
      content = <WebexMediaAccess meetingID={meeting.ID} media="microphone" logo={logo} className={contentClass} />;
    } else if (videoPermission === 'ASKING') {
      content = <WebexMediaAccess meetingID={meeting.ID} media="camera" logo={logo} className={contentClass} />;
    } else {
      content = (
        <WebexMeeting
          meetingID={meeting.ID}
          meetingPasswordOrPin={this.props.meetingPasswordOrPin}
          participantName={this.props.participantName}
          logo={logo}
          layout={this.props.layout}
          controls={this.props.controls}
          controlsCollapseRangeStart={this.props.controlsCollapseRangeStart}
          controlsCollapseRangeEnd={this.props.controlsCollapseRangeEnd}
          className={contentClass}
        />
      );
    }

    return (
      <div className={`webex-meetings-widget ${this.props.className}`} style={this.props.style}>
        {content}
      </div>
    );
  }
}

WebexMeetingsWidget.propTypes = {
  accessToken: PropTypes.string.isRequired,
  className: PropTypes.string,
  controls: PropTypes.func,
  controlsCollapseRangeStart: PropTypes.number,
  controlsCollapseRangeEnd: PropTypes.number,
  fedramp: PropTypes.bool,
  meetingDestination: PropTypes.string.isRequired,
  meetingPasswordOrPin: PropTypes.string,
  participantName: PropTypes.string,
  style: PropTypes.shape(),
  layout: PropTypes.string,
};

WebexMeetingsWidget.defaultProps = {
  className: '',
  controls: undefined,
  controlsCollapseRangeStart: undefined,
  controlsCollapseRangeEnd: undefined,
  fedramp: false,
  layout: 'Grid',
  meetingPasswordOrPin: '',
  participantName: '',
  style: {},
};

const appName = process.env.NODE_ENV === 'production' ? 'webex-widgets-meetings' : 'webex-widgets-meetings-dev';

export default withAdapter(withMeeting(WebexMeetingsWidget), (props) => {
  const webex = new Webex({
    credentials: {
      access_token: props.accessToken,
    },
    config: {
      appName,
      appVersion: __appVersion__,
      fedramp: props.fedramp,
      meetings: {
        experimental: {
          enableUnifiedMeetings: true,
          enableAdhocMeetings: true
        },
      },
    },
  });

  return new WebexSDKAdapter(webex);
});
