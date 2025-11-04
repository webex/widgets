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
/**
 * Temporary custom accessibility fix:
 * - Redirects focus to the first actionable control inside the meeting
 * - Makes video layout focusable and supports left/right arrow navigation
 * - Prevents focus from escaping to the browser URL bar
 *
 * NOTE: This is a workaround because the base @webex/components WebexMeeting
 * does not yet support these accessibility features.
 * Once the upstream component is fixed, we must remove this custom code
 * from our repo to avoid duplication and ensure long-term maintainability.
 */
  componentDidMount() {
    // When focus comes to the widget container, move to the correct media container before and after joining
    if (this.widgetDiv) {
      if (!this._mediaContainerTabHandler) {
            this._mediaContainerTabHandler = (evt) => {
              const mediaContainer = evt.currentTarget;
              // Only handle if the media container itself is focused
              if ((evt.code === 'Tab' || evt.key === 'Tab') && document.activeElement === mediaContainer) {
                if (!evt.shiftKey) {
                  evt.preventDefault();
                  let joinButton = this.widgetDiv.querySelector('button[aria-label="Join meeting"]');
                  if (!joinButton) {
                    joinButton = this.widgetDiv.querySelector('.wxc-meeting-control button, .wxc-meeting-control [tabindex]:not([tabindex="-1"])');
                  }
                  if (joinButton) {
                    joinButton.focus();
                  }
                } else {
                  evt.preventDefault();
                  // Move focus back to the widget container
                  if (this.widgetDiv) {
                    this.widgetDiv.tabIndex = 0;
                    this.widgetDiv.focus();
                  }
                }
              }
            };
      }
      this.widgetDiv.addEventListener('focus', () => {
        setTimeout(() => {
          // Attach handler to both possible media containers if they exist
          const containers = [
            ...this.widgetDiv.querySelectorAll('.wxc-interstitial-meeting__media-container, .wxc-in-meeting__media-container')
          ];
            if (containers.length > 0) {
              containers.forEach((mediaContainer) => {
                mediaContainer.tabIndex = 0;
                mediaContainer.removeEventListener('keydown', this._mediaContainerTabHandler, true);
                mediaContainer.addEventListener('keydown', this._mediaContainerTabHandler, true);
              });
            } else {
              // fallback to Join meeting button or first .wxc-meeting-control button
              let joinButton = this.widgetDiv.querySelector('button[aria-label="Join meeting"]');
              if (!joinButton) {
                joinButton = this.widgetDiv.querySelector('.wxc-meeting-control button, .wxc-meeting-control [tabindex]:not([tabindex="-1"])');
              }
              if (joinButton) {
                joinButton.focus();
              }
            }
        }, 0);
      });

      // Arrow key navigation for all meeting control buttons, with MutationObserver
      const attachArrowNav = () => {
        // Gather all focusable meeting controls, including Join meeting button if present
        let buttons = [];
        const controlBar = this.widgetDiv.querySelector('.wxc-meeting-control-bar__controls');
        if (controlBar) {
          buttons = Array.from(controlBar.querySelectorAll('button, [tabindex]:not([tabindex="-1"])'));
        }
        // Add Join meeting button if present and not already in the list
        const joinButton = this.widgetDiv.querySelector('button[aria-label="Join meeting"]');
        if (joinButton && !buttons.includes(joinButton)) {
          buttons = [joinButton, ...buttons];
        }
        // Remove any previous listeners to avoid duplicates
        buttons.forEach((btn) => {
          btn.onkeydown = null;
        });
        // Attach arrow key listeners to all buttons (including Join meeting)
        buttons.forEach((btn, idx) => {
          btn.onkeydown = (evt) => {
            if (evt.key === 'ArrowRight') {
              evt.preventDefault();
              const next = buttons[(idx + 1) % buttons.length];
              if (next) next.focus();
            } else if (evt.key === 'ArrowLeft') {
              evt.preventDefault();
              const prev = buttons[(idx - 1 + buttons.length) % buttons.length];
              if (prev) prev.focus();
            }
          };
        });
      };
      // Initial setup
      setTimeout(attachArrowNav, 700);

      // Observe DOM changes to re-attach listeners if buttons change
      const observer = new window.MutationObserver(() => {
        attachArrowNav();
      });
      observer.observe(this.widgetDiv, { childList: true, subtree: true });
      // Clean up observer on unmount
      this._arrowNavObserver = observer;
    }

    // When focus comes to the content, wait for .wxc-meeting__inner-meeting and move focus
    if (this.widgetDiv) {
      const contentDiv = this.widgetDiv.querySelector('.webex-meetings-widget__content');
      if (contentDiv) {
        contentDiv.addEventListener('focus', () => {
          // Poll for .wxc-meeting__inner-meeting up to 500ms
          let attempts = 0;
          const tryFocusInnerMeeting = () => {
            const innerMeeting = contentDiv.querySelector('.wxc-in-meeting__media-container');
            if (innerMeeting) {
              innerMeeting.tabIndex = 0;
              innerMeeting.focus();
              // On Tab, move to first interactive element
              const handleTab = (evt) => {
                if (evt.key === 'Tab' && !evt.shiftKey) {
                  evt.preventDefault();
                  const nextInteractive = innerMeeting.querySelector('button, [tabindex]:not([tabindex="-1"])');
                  if (nextInteractive) {
                    nextInteractive.focus();
                  }
                  innerMeeting.removeEventListener('keydown', handleTab);
                }
              };
              innerMeeting.addEventListener('keydown', handleTab);
            } else if (attempts < 10) {
              attempts++;
              setTimeout(tryFocusInnerMeeting, 50);
            }
          };
          tryFocusInnerMeeting();
        });
      }
    }
  }

  render() {
    const meeting = this.props.meeting;
    const audioPermission = meeting.localAudio?.permission;
    const videoPermission = meeting.localVideo?.permission;
    const logo = <WebexLogo />;
    const contentClass = 'webex-meetings-widget__content';

    let content;

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
      <div className={`webex-meetings-widget ${this.props.className}`} style={this.props.style} ref={(div) => { this.widgetDiv = div; }} tabIndex={0}>
        {content}
      </div>
    );
  }

  componentWillUnmount() {
    // Clean up MutationObserver if present
    if (this._arrowNavObserver) {
      this._arrowNavObserver.disconnect();
      this._arrowNavObserver = null;
    }
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
