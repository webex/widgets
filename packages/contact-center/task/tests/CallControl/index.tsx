import React from 'react';
import {render} from '@testing-library/react';
import * as helper from '../../src/helper';
import {CallControl} from '../../src';
import store from '@webex/cc-store';
import {mockTask} from '@webex/test-fixtures';
import {TARGET_TYPE} from '../../src/task.types';
import '@testing-library/jest-dom';

const onHoldResumeCb = jest.fn();
const onEndCb = jest.fn();
const onWrapUpCb = jest.fn();
const onRecordingToggleCb = jest.fn();

const defaultVisibility = {
  isVisible: false,
  isEnabled: false,
};

describe('CallControl Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders CallControlPresentational with correct props', () => {
    const useCallControlSpy = jest.spyOn(helper, 'useCallControl').mockReturnValue({
      currentTask: mockTask,
      endCall: jest.fn(),
      toggleHold: jest.fn(),
      toggleRecording: jest.fn(),
      wrapupCall: jest.fn(),
      isRecording: false,
      setIsRecording: jest.fn(),
      buddyAgents: [],
      loadBuddyAgents: jest.fn(),
      loadingBuddyAgents: false,
      transferCall: jest.fn(),
      consultCall: jest.fn(),
      endConsultCall: jest.fn(),
      consultTransfer: jest.fn(),
      consultAgentName: 'Consult Agent',
      setConsultAgentName: jest.fn(),
      holdTime: 0,
      startTimestamp: 0,
      lastTargetType: TARGET_TYPE.AGENT,
      setLastTargetType: jest.fn(),
      controlVisibility: {
        accept: defaultVisibility,
        decline: defaultVisibility,
        end: defaultVisibility,
        muteUnmute: defaultVisibility,
        muteUnmuteConsult: defaultVisibility,
        holdResume: defaultVisibility,
        consult: defaultVisibility,
        transfer: defaultVisibility,
        conference: defaultVisibility,
        wrapup: defaultVisibility,
        pauseResumeRecording: defaultVisibility,
        endConsult: defaultVisibility,
        consultTransfer: defaultVisibility,
        mergeConference: defaultVisibility,
        mergeConferenceConsult: defaultVisibility,
        consultTransferConsult: defaultVisibility,
        switchToMainCall: defaultVisibility,
        switchToConsult: defaultVisibility,
        exitConference: defaultVisibility,
        recordingIndicator: defaultVisibility,
        isConferenceInProgress: false,
        isConsultInitiated: false,
        isConsultInitiatedAndAccepted: false,
        isConsultInitiatedOrAccepted: false,
        isConsultReceived: false,
        isHeld: false,
        consultCallHeld: false,
      },
      switchToMainCall: jest.fn(),
      switchToConsult: jest.fn(),
      secondsUntilAutoWrapup: 0,
      cancelAutoWrapup: jest.fn(),
      toggleMute: jest.fn(),
      isMuted: false,
      consultConference: jest.fn(),
      exitConference: jest.fn(),
      conferenceParticipants: [],
      getAddressBookEntries: jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}}),
      getEntryPoints: jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}}),
      getQueuesFetcher: jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}}),
      stateTimerLabel: null,
      stateTimerTimestamp: 0,
      consultTimerLabel: 'Consulting',
      consultTimerTimestamp: 0,
    });

    render(
      <CallControl
        onHoldResume={onHoldResumeCb}
        onEnd={onEndCb}
        onWrapUp={onWrapUpCb}
        onRecordingToggle={onRecordingToggleCb}
      />
    );

    // Assert that the useCallControl hook is called with the correct arguments
    expect(useCallControlSpy).toHaveBeenCalledWith({
      currentTask: null,
      onHoldResume: onHoldResumeCb,
      conferenceEnabled: true,
      onEnd: onEndCb,
      onWrapUp: onWrapUpCb,
      onRecordingToggle: onRecordingToggleCb,
      logger: store.logger,
      featureFlags: store.featureFlags,
      deviceType: '',
      isMuted: false,
      onToggleMute: undefined,
      agentId: store.agentId,
    });
  });

  describe('ErrorBoundary Tests', () => {
    it('should render empty fragment when ErrorBoundary catches an error', () => {
      const mockOnErrorCallback = jest.fn();
      store.onErrorCallback = mockOnErrorCallback;

      // Mock the useCallControl to throw an error
      jest.spyOn(helper, 'useCallControl').mockImplementation(() => {
        throw new Error('Test error in useCallControl');
      });

      const {container} = render(
        <CallControl
          onHoldResume={onHoldResumeCb}
          onEnd={onEndCb}
          onWrapUp={onWrapUpCb}
          onRecordingToggle={onRecordingToggleCb}
        />
      );

      // The fallback should render an empty fragment (no content)
      expect(container.firstChild).toBeNull();
      expect(mockOnErrorCallback).toHaveBeenCalledWith('CallControl', Error('Test error in useCallControl'));
    });

    it('should not throw when onErrorCallback is not set', () => {
      store.onErrorCallback = undefined;

      // Mock the useCallControl to throw an error
      jest.spyOn(helper, 'useCallControl').mockImplementation(() => {
        throw new Error('Test error in useCallControl');
      });

      const {container} = render(<CallControl onHoldResume={onHoldResumeCb} onEnd={onEndCb} onWrapUp={onWrapUpCb} />);

      // The fallback should still render an empty fragment
      expect(container.firstChild).toBeNull();
    });
  });
});
