import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Spinner} from '@momentum-ui/react';
import Webex from 'webex';
import {WebexMeeting, WebexMeetingControlBar, WebexMemberRoster, withAdapter, withMeeting} from '@webex/components';
import WebexSDKAdapter from '@webex/sdk-component-adapter';

import {DestinationType, MeetingState} from '@webex/component-adapter-interfaces';

import '@momentum-ui/core/css/momentum-ui.min.css';
import '@webex/components/dist/css/webex-components.css';
import './WebexMeeting.css';

const controls = (isActive) => isActive
    ? ['mute-audio', 'mute-video', 'share-screen', 'member-roster', 'leave-meeting']
    : ['mute-audio', 'mute-video', 'join-meeting'];

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

    return (
      <div className="webex-meeting-widget">
        {meeting.ID ? (
          <>
            <div className="webex-meeting-widget__body">
              <div className="webex-meeting-widget__meeting">
                <WebexMeeting meetingID={meeting.ID} />
              </div>
              {meeting.showRoster && meeting.state === MeetingState.JOINED && (
                <div className="webex-meeting-widget__roster">
                  <WebexMemberRoster destinationID={meeting.ID} destinationType={DestinationType.MEETING} />
                </div>
              )}
            </div>
            {meeting.state !== MeetingState.LEFT &&
              <div className="webex-meeting-widget__controls">
                <WebexMeetingControlBar meetingID={meeting.ID} controls={controls}/>
              </div>
            }
          </>
        ) : (
          <Spinner />
        )}
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
