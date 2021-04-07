import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Spinner} from '@momentum-ui/react';
import Webex from 'webex';
import {WebexMeeting, WebexDataProvider} from '@webex/components';
import WebexSDKAdapter from '@webex/sdk-component-adapter';

import '@momentum-ui/core/css/momentum-ui.min.css';
import '@webex/components/dist/css/webex-components.css';
import './WebexMeeting.css';
import {concatMap} from 'rxjs/operators';

/**
 * Webex meeting widget displays the default Webex meeting experience.
 *
 * @param {string} props.meetingDestination  ID of the virtual meeting location
 * @param {string} props.accessToken        access token to create the webex instance with
 * @returns {Object} JSX of the component
 */
export default class WebexMeetingWidget extends Component {
  constructor(props) {
    super(props);

    const webex = new Webex({
      credentials: props.accessToken,
    });
    this.state = {
      adapterConnected: false,
      meetingID: null,
    };
    this.adapter = new WebexSDKAdapter(webex);
    this.subscription = null;
  }

  async componentDidMount() {
    await this.adapter.connect();
    this.subscription = this.adapter.meetingsAdapter
      .createMeeting(this.props.meetingDestination)
      .pipe(concatMap(({ID}) => this.adapter.meetingsAdapter.getMeeting(ID)))
      .subscribe((data) => {
        this.setState({adapterConnected: true, meetingID: data.ID});
      });
  }

  async componentWillUnmount() {
    // On teardown, disconnect the adapter.
    await this.adapter.disconnect();
    if (this.subscription) {
      await this.subscription.unsubscribe();
    }
  }

  render() {
    const {adapterConnected, meetingID} = this.state;
    return (
      <div className="meeting-widget">
        {adapterConnected && meetingID ? (
          <WebexDataProvider adapter={this.adapter}>
            <div>Connected</div>
            <WebexMeeting meetingID={meetingID} />
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
