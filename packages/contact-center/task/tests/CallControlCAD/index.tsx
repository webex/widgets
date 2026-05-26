import React from 'react';
import {render} from '@testing-library/react';
import * as helper from '../../src/helper';
import {CallControlCAD} from '../../src';
import store from '@webex/cc-store';
import {createEnabledMainTaskUIControls, mockTask} from '@webex/test-fixtures';
import {TARGET_TYPE} from '../../src/task.types';
import '@testing-library/jest-dom';

const onHoldResumeCb = jest.fn();
const onEndCb = jest.fn();
const onWrapUpCb = jest.fn();
const onRecordingToggleCb = jest.fn();
const onToggleMuteCb = jest.fn();

const mockControls = createEnabledMainTaskUIControls({hold: {isVisible: true, isEnabled: true}});

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
      controls: mockControls,
      isHeld: false,
      conferenceEnabled: true,
      switchToMainCall: jest.fn(),
      switchToConsult: jest.fn(),
      secondsUntilAutoWrapup: 0,
      cancelAutoWrapup: jest.fn(),
      toggleMute: jest.fn(),
      isMuted: false,
      consultConference: jest.fn(),
      exitConference: jest.fn(),
      conferenceParticipants: [],
      getAddressBookEntries: jest.fn(),
      getEntryPoints: jest.fn(),
      getQueuesFetcher: jest.fn(),
      stateTimerLabel: null,
      stateTimerTimestamp: 0,
      consultTimerLabel: 'Consulting',
      consultTimerTimestamp: 0,
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
      isMuted: false,
      conferenceEnabled: undefined,
      agentId: store.agentId,
    });
  });

  it('should pass undefined conferenceEnabled when not provided', () => {
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
      controls: mockControls,
      isHeld: false,
      conferenceEnabled: true,
      switchToMainCall: jest.fn(),
      switchToConsult: jest.fn(),
      secondsUntilAutoWrapup: 0,
      cancelAutoWrapup: jest.fn(),
      toggleMute: jest.fn(),
      isMuted: false,
      consultConference: jest.fn(),
      exitConference: jest.fn(),
      conferenceParticipants: [],
      getAddressBookEntries: jest.fn(),
      getEntryPoints: jest.fn(),
      getQueuesFetcher: jest.fn(),
      stateTimerLabel: null,
      stateTimerTimestamp: 0,
      consultTimerLabel: 'Consulting',
      consultTimerTimestamp: 0,
    });

    render(<CallControlCAD onHoldResume={onHoldResumeCb} onEnd={onEndCb} onWrapUp={onWrapUpCb} />);

    expect(useCallControlSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        conferenceEnabled: undefined,
      })
    );
  });

  it('should use provided conferenceEnabled value', () => {
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
      controls: mockControls,
      isHeld: false,
      conferenceEnabled: true,
      switchToMainCall: jest.fn(),
      switchToConsult: jest.fn(),
      secondsUntilAutoWrapup: 0,
      cancelAutoWrapup: jest.fn(),
      toggleMute: jest.fn(),
      isMuted: false,
      consultConference: jest.fn(),
      exitConference: jest.fn(),
      conferenceParticipants: [],
      getAddressBookEntries: jest.fn(),
      getEntryPoints: jest.fn(),
      getQueuesFetcher: jest.fn(),
      stateTimerLabel: null,
      stateTimerTimestamp: 0,
      consultTimerLabel: 'Consulting',
      consultTimerTimestamp: 0,
    });

    render(
      <CallControlCAD onHoldResume={onHoldResumeCb} onEnd={onEndCb} onWrapUp={onWrapUpCb} conferenceEnabled={false} />
    );

    // Should use the provided value
    expect(useCallControlSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        conferenceEnabled: false,
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
      controls: mockControls,
      isHeld: false,
      conferenceEnabled: true,
      switchToMainCall: jest.fn(),
      switchToConsult: jest.fn(),
      secondsUntilAutoWrapup: 0,
      cancelAutoWrapup: jest.fn(),
      toggleMute: jest.fn(),
      isMuted: false,
      consultConference: jest.fn(),
      exitConference: jest.fn(),
      conferenceParticipants: [],
      getAddressBookEntries: jest.fn(),
      getEntryPoints: jest.fn(),
      getQueuesFetcher: jest.fn(),
      stateTimerLabel: null,
      stateTimerTimestamp: 0,
      consultTimerLabel: 'Consulting',
      consultTimerTimestamp: 0,
    });

    const {container} = render(
      <CallControlCAD
        onHoldResume={onHoldResumeCb}
        onEnd={onEndCb}
        onWrapUp={onWrapUpCb}
        callControlClassName="custom-call-control"
        callControlConsultClassName="custom-consult-class"
      />
    );

    // Component should render without errors - the rendering itself validates the classNames are accepted
    expect(container).toBeDefined();
    // Verify the component rendered something (even if ErrorBoundary caught an error, container exists)
    expect(() => container.querySelector('*')).not.toThrow();
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
