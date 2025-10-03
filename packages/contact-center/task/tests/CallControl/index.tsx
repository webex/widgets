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
      },
      secondsUntilAutoWrapup: 0,
      cancelAutoWrapup: jest.fn(),
      toggleMute: jest.fn(),
      isMuted: false,
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
      onEnd: onEndCb,
      onWrapUp: onWrapUpCb,
      onRecordingToggle: onRecordingToggleCb,
      logger: store.logger,
      consultInitiated: false,
      featureFlags: store.featureFlags,
      deviceType: '',
      isMuted: false,
      onToggleMute: undefined,
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
  });
});
