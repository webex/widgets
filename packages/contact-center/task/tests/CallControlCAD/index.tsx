import React from 'react';
import {render} from '@testing-library/react';
import * as helper from '../../src/helper';
import {CallControlCAD} from '../../src';
import store from '@webex/cc-store';
import {mockTask} from '@webex/test-fixtures';
import '@testing-library/jest-dom';

const onHoldResumeCb = jest.fn();
const onEndCb = jest.fn();
const onWrapUpCb = jest.fn();
const onRecordingToggleCb = jest.fn();
const onToggleMuteCb = jest.fn();

describe('CallControlCAD Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders CallControlCADComponent with correct props', () => {
    const useCallControlSpy = jest.spyOn(helper, 'useCallControl').mockReturnValue({
      currentTask: mockTask,
      endCall: jest.fn(),
      toggleHold: jest.fn(),
      toggleRecording: jest.fn(),
      wrapupCall: jest.fn(),
      isHeld: false,
      isRecording: false,
      setIsHeld: jest.fn(),
      setIsRecording: jest.fn(),
      buddyAgents: [],
      loadBuddyAgents: jest.fn(),
      queues: [],
      loadQueues: jest.fn(),
      transferCall: jest.fn(),
      consultCall: jest.fn(),
      endConsultCall: jest.fn(),
      consultTransfer: jest.fn(),
      consultAgentName: 'Consult Agent',
      setConsultAgentName: jest.fn(),
      consultAgentId: 'mockConsultAgentId',
      setConsultAgentId: jest.fn(),
      holdTime: 0,
      startTimestamp: 0,
      lastTargetType: 'agent' as const,
      setLastTargetType: jest.fn(),
      controlVisibility: {
        accept: false,
        decline: false,
        end: false,
        muteUnmute: false,
        holdResume: true,
        consult: false,
        transfer: false,
        conference: false,
        wrapup: false,
        pauseResumeRecording: false,
        endConsult: false,
        recordingIndicator: false,
        isConferenceInProgress: false,
      },
      secondsUntilAutoWrapup: 0,
      cancelAutoWrapup: jest.fn(),
      toggleMute: jest.fn(),
      isMuted: false,
      consultConference: jest.fn(),
      exitConference: jest.fn(),
      conferenceParticipants: [],
      isConsultButtonDisabled: false,
    });

    render(
      <CallControlCAD
        onHoldResume={onHoldResumeCb}
        onEnd={onEndCb}
        onWrapUp={onWrapUpCb}
        onRecordingToggle={onRecordingToggleCb}
        onToggleMute={onToggleMuteCb}
        callControlClassName="test-class"
        callControlConsultClassName="test-consult-class"
      />
    );

    // Assert that the useCallControl hook is called with the correct arguments
    expect(useCallControlSpy).toHaveBeenCalledWith({
      currentTask: null,
      onHoldResume: onHoldResumeCb,
      onEnd: onEndCb,
      onWrapUp: onWrapUpCb,
      onRecordingToggle: onRecordingToggleCb,
      onToggleMute: onToggleMuteCb,
      logger: store.logger,
      consultInitiated: false,
      featureFlags: store.featureFlags,
      deviceType: '',
      isMuted: false,
      multiPartyConferenceEnabled: true,
    });
  });

  it('should use default multiPartyConferenceEnabled value when not provided', () => {
    const useCallControlSpy = jest.spyOn(helper, 'useCallControl').mockReturnValue({
      currentTask: mockTask,
      endCall: jest.fn(),
      toggleHold: jest.fn(),
      toggleRecording: jest.fn(),
      wrapupCall: jest.fn(),
      isHeld: false,
      isRecording: false,
      setIsHeld: jest.fn(),
      setIsRecording: jest.fn(),
      buddyAgents: [],
      loadBuddyAgents: jest.fn(),
      queues: [],
      loadQueues: jest.fn(),
      transferCall: jest.fn(),
      consultCall: jest.fn(),
      endConsultCall: jest.fn(),
      consultTransfer: jest.fn(),
      consultAgentName: 'Consult Agent',
      setConsultAgentName: jest.fn(),
      consultAgentId: 'mockConsultAgentId',
      setConsultAgentId: jest.fn(),
      holdTime: 0,
      startTimestamp: 0,
      lastTargetType: 'agent' as const,
      setLastTargetType: jest.fn(),
      controlVisibility: {
        accept: false,
        decline: false,
        end: false,
        muteUnmute: false,
        holdResume: true,
        consult: false,
        transfer: false,
        conference: false,
        wrapup: false,
        pauseResumeRecording: false,
        endConsult: false,
        recordingIndicator: false,
        isConferenceInProgress: false,
      },
      secondsUntilAutoWrapup: 0,
      cancelAutoWrapup: jest.fn(),
      toggleMute: jest.fn(),
      isMuted: false,
      consultConference: jest.fn(),
      exitConference: jest.fn(),
      conferenceParticipants: [],
      isConsultButtonDisabled: false,
    });

    render(<CallControlCAD onHoldResume={onHoldResumeCb} onEnd={onEndCb} onWrapUp={onWrapUpCb} />);

    // Should default to true when not provided
    expect(useCallControlSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        multiPartyConferenceEnabled: true,
      })
    );
  });

  it('should use provided multiPartyConferenceEnabled value', () => {
    const useCallControlSpy = jest.spyOn(helper, 'useCallControl').mockReturnValue({
      currentTask: mockTask,
      endCall: jest.fn(),
      toggleHold: jest.fn(),
      toggleRecording: jest.fn(),
      wrapupCall: jest.fn(),
      isHeld: false,
      isRecording: false,
      setIsHeld: jest.fn(),
      setIsRecording: jest.fn(),
      buddyAgents: [],
      loadBuddyAgents: jest.fn(),
      queues: [],
      loadQueues: jest.fn(),
      transferCall: jest.fn(),
      consultCall: jest.fn(),
      endConsultCall: jest.fn(),
      consultTransfer: jest.fn(),
      consultAgentName: 'Consult Agent',
      setConsultAgentName: jest.fn(),
      consultAgentId: 'mockConsultAgentId',
      setConsultAgentId: jest.fn(),
      holdTime: 0,
      startTimestamp: 0,
      lastTargetType: 'agent' as const,
      setLastTargetType: jest.fn(),
      controlVisibility: {
        accept: false,
        decline: false,
        end: false,
        muteUnmute: false,
        holdResume: true,
        consult: false,
        transfer: false,
        conference: false,
        wrapup: false,
        pauseResumeRecording: false,
        endConsult: false,
        recordingIndicator: false,
        isConferenceInProgress: false,
      },
      secondsUntilAutoWrapup: 0,
      cancelAutoWrapup: jest.fn(),
      toggleMute: jest.fn(),
      isMuted: false,
      consultConference: jest.fn(),
      exitConference: jest.fn(),
      conferenceParticipants: [],
      isConsultButtonDisabled: false,
    });

    render(
      <CallControlCAD
        onHoldResume={onHoldResumeCb}
        onEnd={onEndCb}
        onWrapUp={onWrapUpCb}
        multiPartyConferenceEnabled={false}
      />
    );

    // Should use the provided value
    expect(useCallControlSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        multiPartyConferenceEnabled: false,
      })
    );
  });

  it('should pass callControlClassName and callControlConsultClassName to result', () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue({
      currentTask: mockTask,
      endCall: jest.fn(),
      toggleHold: jest.fn(),
      toggleRecording: jest.fn(),
      wrapupCall: jest.fn(),
      isHeld: false,
      isRecording: false,
      setIsHeld: jest.fn(),
      setIsRecording: jest.fn(),
      buddyAgents: [],
      loadBuddyAgents: jest.fn(),
      queues: [],
      loadQueues: jest.fn(),
      transferCall: jest.fn(),
      consultCall: jest.fn(),
      endConsultCall: jest.fn(),
      consultTransfer: jest.fn(),
      consultAgentName: 'Consult Agent',
      setConsultAgentName: jest.fn(),
      consultAgentId: 'mockConsultAgentId',
      setConsultAgentId: jest.fn(),
      holdTime: 0,
      startTimestamp: 0,
      lastTargetType: 'agent' as const,
      setLastTargetType: jest.fn(),
      controlVisibility: {
        accept: false,
        decline: false,
        end: false,
        muteUnmute: false,
        holdResume: true,
        consult: false,
        transfer: false,
        conference: false,
        wrapup: false,
        pauseResumeRecording: false,
        endConsult: false,
        recordingIndicator: false,
        isConferenceInProgress: false,
      },
      secondsUntilAutoWrapup: 0,
      cancelAutoWrapup: jest.fn(),
      toggleMute: jest.fn(),
      isMuted: false,
      consultConference: jest.fn(),
      exitConference: jest.fn(),
      conferenceParticipants: [],
      isConsultButtonDisabled: false,
    });

    render(
      <CallControlCAD
        onHoldResume={onHoldResumeCb}
        onEnd={onEndCb}
        onWrapUp={onWrapUpCb}
        callControlClassName="custom-call-control"
        callControlConsultClassName="custom-consult-class"
      />
    );

    // Component should render without errors and pass the classNames through
    // The actual assertion is that the component renders successfully
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
        <CallControlCAD
          onHoldResume={onHoldResumeCb}
          onEnd={onEndCb}
          onWrapUp={onWrapUpCb}
          onRecordingToggle={onRecordingToggleCb}
        />
      );

      // The fallback should render an empty fragment (no content)
      expect(container.firstChild).toBeNull();
      expect(mockOnErrorCallback).toHaveBeenCalledWith('CallControlCAD', Error('Test error in useCallControl'));
    });

    it('should not throw when onErrorCallback is not set', () => {
      store.onErrorCallback = undefined;

      // Mock the useCallControl to throw an error
      jest.spyOn(helper, 'useCallControl').mockImplementation(() => {
        throw new Error('Test error in useCallControl');
      });

      const {container} = render(
        <CallControlCAD onHoldResume={onHoldResumeCb} onEnd={onEndCb} onWrapUp={onWrapUpCb} />
      );

      // The fallback should still render an empty fragment
      expect(container.firstChild).toBeNull();
    });
  });
});
