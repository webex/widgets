import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Spinner} from '@momentum-ui/react';
import Webex from 'webex';
import {WebexMeeting, WebexDataProvider, withMeeting} from '@webex/components';
import WebexSDKAdapter from '@webex/sdk-component-adapter';

import '@momentum-ui/core/css/momentum-ui.min.css';
import '@webex/components/dist/css/webex-components.css';
import './WebexMeeting.css';


  //the enhanced meeting component
  const Content = withMeeting(function(props) {
    return props.meeting.ID ?
      <WebexMeeting meetingID={props.meeting.ID} />
      : <Spinner />
  });


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
    const webex = new Webex({
      credentials: props.accessToken,
    });
    this.state = {
      adapterConnected: false,
    };
    this.adapter = new WebexSDKAdapter(webex);
  }

  async componentDidMount() {
    await this.adapter.connect();
    // Once adapter connects, set our app state to ready.
    this.setState({adapterConnected: true});
  }

  async componentWillUnmount() {
    // On teardown, disconnect the adapter.
    await this.adapter.disconnect();
  }

  render() {
    return (
      <div className="meeting-widget">
        {this.state.adapterConnected ? (
          <WebexDataProvider adapter={this.adapter}>
            <Content {...this.props} />
          </WebexDataProvider>
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

export default WebexMeetingWidget;
