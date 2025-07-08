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
    });
  });
});
