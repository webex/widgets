import React, {Component} from 'react';
import {render, fireEvent, act} from '@testing-library/react';
import '@testing-library/jest-dom';

let capturedAdapterFactory;

jest.mock('@webex/components', () => ({
  WebexMediaAccess: (props) => (
    <div
      data-testid="webex-media-access"
      className={props.className}
      data-media={props.media}
      data-meeting-id={props.meetingID}
    />
  ),
  WebexMeeting: (props) => (
    <div
      data-testid="webex-meeting"
      className={props.className}
      data-meeting-id={props.meetingID}
      data-password={props.meetingPasswordOrPin}
      data-participant={props.participantName}
      data-layout={props.layout}
      data-collapse-start={props.controlsCollapseRangeStart}
      data-collapse-end={props.controlsCollapseRangeEnd}
    />
  ),
  withAdapter: (WrappedComponent, factory) => {
    capturedAdapterFactory = factory;
    return WrappedComponent;
  },
  withMeeting: (WrappedComponent) => WrappedComponent,
}));

jest.mock('@webex/components/dist/css/webex-components.css', () => {});

jest.mock('webex', () => jest.fn((config) => ({__mockWebex: true, ...config})));
jest.mock('@webex/sdk-component-adapter', () => jest.fn((webex) => ({__mockAdapter: true, webex})));

const Webex = require('webex');
const WebexSDKAdapter = require('@webex/sdk-component-adapter');

const WebexMeetingsWidget = require('../../src/widgets/WebexMeetings/WebexMeetings').default;

class TestErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false};
  }

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error) {
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

const baseMeeting = {
  ID: 'meeting-123',
  localAudio: {permission: 'GRANTED'},
  localVideo: {permission: 'GRANTED'},
};

const baseProps = {
  accessToken: 'test-token',
  meetingDestination: 'test@webex.com',
  meeting: baseMeeting,
};

describe('WebexMeetingsWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders wrapper div with class "webex-meetings-widget" and tabIndex 0', () => {
      const {container} = render(<WebexMeetingsWidget {...baseProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('webex-meetings-widget');
      expect(wrapper).toHaveAttribute('tabindex', '0');
    });

    it('renders WebexMediaAccess for microphone when audioPermission is ASKING', () => {
      const meeting = {...baseMeeting, localAudio: {permission: 'ASKING'}};
      const {getByTestId, queryByTestId} = render(
        <WebexMeetingsWidget {...baseProps} meeting={meeting} />
      );

      expect(getByTestId('webex-media-access')).toBeInTheDocument();
      expect(getByTestId('webex-media-access')).toHaveAttribute('data-media', 'microphone');
      expect(queryByTestId('webex-meeting')).not.toBeInTheDocument();
    });

    it('renders WebexMediaAccess for camera when videoPermission is ASKING', () => {
      const meeting = {...baseMeeting, localVideo: {permission: 'ASKING'}};
      const {getByTestId, queryByTestId} = render(
        <WebexMeetingsWidget {...baseProps} meeting={meeting} />
      );

      expect(getByTestId('webex-media-access')).toBeInTheDocument();
      expect(getByTestId('webex-media-access')).toHaveAttribute('data-media', 'camera');
      expect(queryByTestId('webex-meeting')).not.toBeInTheDocument();
    });

    it('audio ASKING takes priority over video ASKING', () => {
      const meeting = {
        ...baseMeeting,
        localAudio: {permission: 'ASKING'},
        localVideo: {permission: 'ASKING'},
      };
      const {getByTestId} = render(<WebexMeetingsWidget {...baseProps} meeting={meeting} />);

      expect(getByTestId('webex-media-access')).toHaveAttribute('data-media', 'microphone');
    });

    it('passes correct meetingID to WebexMediaAccess (microphone case)', () => {
      const meeting = {...baseMeeting, localAudio: {permission: 'ASKING'}};
      const {getByTestId} = render(<WebexMeetingsWidget {...baseProps} meeting={meeting} />);

      expect(getByTestId('webex-media-access')).toHaveAttribute('data-meeting-id', 'meeting-123');
    });

    it('passes correct meetingID to WebexMediaAccess (camera case)', () => {
      const meeting = {...baseMeeting, localVideo: {permission: 'ASKING'}};
      const {getByTestId} = render(<WebexMeetingsWidget {...baseProps} meeting={meeting} />);

      expect(getByTestId('webex-media-access')).toHaveAttribute('data-meeting-id', 'meeting-123');
    });

    it('renders WebexMeeting when no permission is ASKING', () => {
      const {getByTestId, queryByTestId} = render(<WebexMeetingsWidget {...baseProps} />);

      expect(getByTestId('webex-meeting')).toBeInTheDocument();
      expect(queryByTestId('webex-media-access')).not.toBeInTheDocument();
    });

    it('passes correct props to WebexMeeting', () => {
      const controlsFn = jest.fn();
      const props = {
        ...baseProps,
        meetingPasswordOrPin: 'secret123',
        participantName: 'Test User',
        layout: 'Focus',
        controls: controlsFn,
        controlsCollapseRangeStart: 1,
        controlsCollapseRangeEnd: -1,
      };
      const {getByTestId} = render(<WebexMeetingsWidget {...props} />);

      const meetingEl = getByTestId('webex-meeting');
      expect(meetingEl).toHaveAttribute('data-meeting-id', 'meeting-123');
      expect(meetingEl).toHaveAttribute('data-password', 'secret123');
      expect(meetingEl).toHaveAttribute('data-participant', 'Test User');
      expect(meetingEl).toHaveAttribute('data-layout', 'Focus');
      expect(meetingEl).toHaveAttribute('data-collapse-start', '1');
      expect(meetingEl).toHaveAttribute('data-collapse-end', '-1');
    });

    it('applies custom className to wrapper', () => {
      const {container} = render(<WebexMeetingsWidget {...baseProps} className="my-custom" />);

      expect(container.firstChild).toHaveClass('webex-meetings-widget');
      expect(container.firstChild).toHaveClass('my-custom');
    });

    it('applies custom style to wrapper', () => {
      const customStyle = {backgroundColor: 'red', width: '500px'};
      const {container} = render(<WebexMeetingsWidget {...baseProps} style={customStyle} />);

      expect(container.firstChild).toHaveStyle({backgroundColor: 'red', width: '500px'});
    });
  });

  describe('Default Props', () => {
    it('layout defaults to Grid', () => {
      const {getByTestId} = render(<WebexMeetingsWidget {...baseProps} />);

      expect(getByTestId('webex-meeting')).toHaveAttribute('data-layout', 'Grid');
    });

    it('className defaults to empty string', () => {
      const {container} = render(<WebexMeetingsWidget {...baseProps} />);

      expect(container.firstChild.className).toBe('webex-meetings-widget ');
    });

    it('meetingPasswordOrPin defaults to empty string', () => {
      const {getByTestId} = render(<WebexMeetingsWidget {...baseProps} />);

      expect(getByTestId('webex-meeting')).toHaveAttribute('data-password', '');
    });

    it('participantName defaults to empty string', () => {
      const {getByTestId} = render(<WebexMeetingsWidget {...baseProps} />);

      expect(getByTestId('webex-meeting')).toHaveAttribute('data-participant', '');
    });
  });

  describe('Error Handling', () => {
    it('should render null when the widget throws due to invalid meeting prop', () => {
      const onError = jest.fn();
      const {container} = render(
        <TestErrorBoundary onError={onError}>
          <WebexMeetingsWidget {...baseProps} meeting={null} />
        </TestErrorBoundary>
      );

      expect(container.firstChild).toBeNull();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Accessibility - Focus Management', () => {
    it('on widget focus, sets tabIndex on media containers', () => {
      const {container} = render(<WebexMeetingsWidget {...baseProps} />);
      const wrapper = container.firstChild;

      const mediaContainer = document.createElement('div');
      mediaContainer.classList.add('wxc-interstitial-meeting__media-container');
      wrapper.querySelector('.webex-meetings-widget__content').appendChild(mediaContainer);

      act(() => {
        fireEvent.focus(wrapper);
        jest.advanceTimersByTime(0);
      });

      expect(mediaContainer.tabIndex).toBe(0);
    });

    it('on widget focus, falls back to focusing join button when no media containers exist', () => {
      const {container} = render(<WebexMeetingsWidget {...baseProps} />);
      const wrapper = container.firstChild;

      const joinButton = document.createElement('button');
      joinButton.setAttribute('aria-label', 'Join meeting');
      joinButton.focus = jest.fn();
      wrapper.appendChild(joinButton);

      act(() => {
        fireEvent.focus(wrapper);
        jest.advanceTimersByTime(0);
      });

      expect(joinButton.focus).toHaveBeenCalled();
    });

    it('Tab on media container focuses join button', () => {
      const {container} = render(<WebexMeetingsWidget {...baseProps} />);
      const wrapper = container.firstChild;

      const mediaContainer = document.createElement('div');
      mediaContainer.classList.add('wxc-in-meeting__media-container');
      wrapper.querySelector('.webex-meetings-widget__content').appendChild(mediaContainer);

      act(() => {
        fireEvent.focus(wrapper);
        jest.advanceTimersByTime(0);
      });

      const joinButton = document.createElement('button');
      joinButton.setAttribute('aria-label', 'Join meeting');
      joinButton.focus = jest.fn();
      wrapper.appendChild(joinButton);

      Object.defineProperty(document, 'activeElement', {
        value: mediaContainer,
        writable: true,
        configurable: true,
      });

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(tabEvent, 'currentTarget', {value: mediaContainer});
      mediaContainer.dispatchEvent(tabEvent);

      expect(joinButton.focus).toHaveBeenCalled();
    });

    it('Shift+Tab on media container focuses widget container', () => {
      const {container} = render(<WebexMeetingsWidget {...baseProps} />);
      const wrapper = container.firstChild;

      const mediaContainer = document.createElement('div');
      mediaContainer.classList.add('wxc-interstitial-meeting__media-container');
      wrapper.querySelector('.webex-meetings-widget__content').appendChild(mediaContainer);

      act(() => {
        fireEvent.focus(wrapper);
        jest.advanceTimersByTime(0);
      });

      wrapper.focus = jest.fn();

      Object.defineProperty(document, 'activeElement', {
        value: mediaContainer,
        writable: true,
        configurable: true,
      });

      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(shiftTabEvent, 'currentTarget', {value: mediaContainer});
      mediaContainer.dispatchEvent(shiftTabEvent);

      expect(wrapper.focus).toHaveBeenCalled();
    });

    it('content div focus polls for inner meeting media container and focuses it', () => {
      const {container} = render(<WebexMeetingsWidget {...baseProps} />);
      const wrapper = container.firstChild;
      const contentDiv = wrapper.querySelector('.webex-meetings-widget__content');

      expect(contentDiv).toBeTruthy();

      const innerMeeting = document.createElement('div');
      innerMeeting.classList.add('wxc-in-meeting__media-container');
      innerMeeting.focus = jest.fn();

      contentDiv.dispatchEvent(new Event('focus'));

      contentDiv.appendChild(innerMeeting);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(innerMeeting.focus).toHaveBeenCalled();
      expect(innerMeeting.tabIndex).toBe(0);
    });

    it('content div focus attaches one-time Tab handler to move focus to first interactive element', () => {
      const {container} = render(<WebexMeetingsWidget {...baseProps} />);
      const wrapper = container.firstChild;
      const contentDiv = wrapper.querySelector('.webex-meetings-widget__content');

      expect(contentDiv).toBeTruthy();

      const innerMeeting = document.createElement('div');
      innerMeeting.classList.add('wxc-in-meeting__media-container');
      contentDiv.appendChild(innerMeeting);

      const interactiveBtn = document.createElement('button');
      interactiveBtn.focus = jest.fn();
      innerMeeting.appendChild(interactiveBtn);

      contentDiv.dispatchEvent(new Event('focus'));

      act(() => {
        jest.advanceTimersByTime(0);
      });

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      innerMeeting.dispatchEvent(tabEvent);

      expect(interactiveBtn.focus).toHaveBeenCalled();
    });

    it('arrow keys cycle through control buttons', () => {
      const {container} = render(<WebexMeetingsWidget {...baseProps} />);
      const wrapper = container.firstChild;

      const controlBar = document.createElement('div');
      controlBar.classList.add('wxc-meeting-control-bar__controls');

      const btn1 = document.createElement('button');
      btn1.focus = jest.fn();
      const btn2 = document.createElement('button');
      btn2.focus = jest.fn();
      const btn3 = document.createElement('button');
      btn3.focus = jest.fn();

      controlBar.appendChild(btn1);
      controlBar.appendChild(btn2);
      controlBar.appendChild(btn3);
      wrapper.appendChild(controlBar);

      act(() => {
        jest.advanceTimersByTime(700);
      });

      act(() => {
        btn1.onkeydown({key: 'ArrowRight', preventDefault: jest.fn()});
      });
      expect(btn2.focus).toHaveBeenCalled();

      act(() => {
        btn1.onkeydown({key: 'ArrowLeft', preventDefault: jest.fn()});
      });
      expect(btn3.focus).toHaveBeenCalled();
    });

    it('MutationObserver re-attaches listeners on DOM changes', () => {
      let observerCallback;
      const OriginalMutationObserver = window.MutationObserver;

      window.MutationObserver = class MockMutationObserver {
        constructor(callback) {
          observerCallback = callback;
        }
        observe() {}
        disconnect() {}
      };

      const {container} = render(<WebexMeetingsWidget {...baseProps} />);
      const wrapper = container.firstChild;

      const controlBar = document.createElement('div');
      controlBar.classList.add('wxc-meeting-control-bar__controls');

      const btn1 = document.createElement('button');
      controlBar.appendChild(btn1);
      wrapper.appendChild(controlBar);

      act(() => {
        jest.advanceTimersByTime(700);
      });

      expect(btn1.onkeydown).toBeTruthy();

      const newBtn = document.createElement('button');
      newBtn.focus = jest.fn();
      controlBar.appendChild(newBtn);

      act(() => {
        observerCallback();
      });

      expect(newBtn.onkeydown).toBeTruthy();

      window.MutationObserver = OriginalMutationObserver;
    });
  });

  describe('Cleanup', () => {
    it('disconnects MutationObserver on unmount', () => {
      const disconnectSpy = jest.fn();
      const OriginalMutationObserver = window.MutationObserver;

      window.MutationObserver = class MockMutationObserver {
        constructor(callback) {
          this.callback = callback;
        }
        observe() {}
        disconnect() {
          disconnectSpy();
        }
      };

      const {unmount} = render(<WebexMeetingsWidget {...baseProps} />);

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();

      window.MutationObserver = OriginalMutationObserver;
    });
  });

  describe('Adapter Factory', () => {
    it('creates Webex with correct access_token', () => {
      capturedAdapterFactory({accessToken: 'my-token', fedramp: false});

      expect(Webex).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: {access_token: 'my-token'},
        })
      );
    });

    it('passes fedramp config', () => {
      capturedAdapterFactory({accessToken: 'token', fedramp: true});

      expect(Webex).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({fedramp: true}),
        })
      );
    });

    it('passes meeting experimental config', () => {
      capturedAdapterFactory({accessToken: 'token', fedramp: false});

      expect(Webex).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            meetings: {
              experimental: {
                enableUnifiedMeetings: true,
                enableAdhocMeetings: true,
              },
            },
          }),
        })
      );
    });

    it('passes appVersion from __appVersion__ global', () => {
      capturedAdapterFactory({accessToken: 'token', fedramp: false});

      expect(Webex).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({appVersion: '1.0.0-test'}),
        })
      );
    });

    it('creates WebexSDKAdapter from Webex instance', () => {
      capturedAdapterFactory({accessToken: 'token', fedramp: false});

      expect(WebexSDKAdapter).toHaveBeenCalledTimes(1);
      const webexInstance = Webex.mock.results[Webex.mock.results.length - 1].value;
      expect(WebexSDKAdapter).toHaveBeenCalledWith(webexInstance);
    });

    it('uses dev appName when NODE_ENV is not production', () => {
      capturedAdapterFactory({accessToken: 'token', fedramp: false});

      expect(Webex).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({appName: 'webex-widgets-meetings-dev'}),
        })
      );
    });
  });
});