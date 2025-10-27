import React from 'react';
import {render} from '@testing-library/react';
import * as helper from '../../src/helper';
import {CallControl} from '../../src';
import store from '@webex/cc-store';
import {mockTask} from '@webex/test-fixtures';
import '@testing-library/jest-dom';

const onHoldResumeCb = jest.fn();
const onEndCb = jest.fn();
const onWrapUpCb = jest.fn();
const onRecordingToggleCb = jest.fn();

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
      transferCall: jest.fn(),
      consultCall: jest.fn(),
      endConsultCall: jest.fn(),
      consultTransfer: jest.fn(),
      consultAgentName: 'Consult Agent',
      setConsultAgentName: jest.fn(),
      holdTime: 0,
      startTimestamp: 0,
      lastTargetType: 'agent' as const,
      setLastTargetType: jest.fn(),
      controlVisibility: {
        accept: {isVisible: false, isEnabled: false},
        decline: {isVisible: false, isEnabled: false},
        end: {isVisible: false, isEnabled: false},
        muteUnmute: {isVisible: false, isEnabled: false},
        holdResume: {isVisible: true, isEnabled: true},
        consult: {isVisible: false, isEnabled: false},
        transfer: {isVisible: false, isEnabled: false},
        conference: {isVisible: false, isEnabled: false},
        wrapup: {isVisible: false, isEnabled: false},
        pauseResumeRecording: {isVisible: false, isEnabled: false},
        endConsult: {isVisible: false, isEnabled: false},
        consultTransfer: {isVisible: false, isEnabled: false},
        mergeConference: {isVisible: false, isEnabled: false},
        exitConference: {isVisible: false, isEnabled: false},
        recordingIndicator: {isVisible: false, isEnabled: false},
        isConferenceInProgress: false,
        isConsultInitiatedOrAccepted: false,
        hideCallControls: false,
        isHeld: false,
      },
      secondsUntilAutoWrapup: 0,
      cancelAutoWrapup: jest.fn(),
      toggleMute: jest.fn(),
      isMuted: false,
      consultConference: jest.fn(),
      exitConference: jest.fn(),
      conferenceParticipants: [],
      isConsultButtonDisabled: false,
      getAddressBookEntries: jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}}),
      getEntryPoints: jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}}),
      getQueuesFetcher: jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}}),
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
      multiPartyConferenceEnabled: true,
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
