import React from 'react';
import {render} from '@testing-library/react';
import * as helper from '../../src/helper';
import {CallControl} from '../../src';
import '@testing-library/jest-dom';

jest.mock('@webex/cc-components', () => {
  return {
    CallControlComponent: () => <div>CallControlComponent</div>,
  };
});

// Mock the store
jest.mock('@webex/cc-store', () => ({
  cc: {},
  deviceType: 'BROWSER',
  dialNumber: '12345',
  wrapupCodes: [],
  logger: {},
  currentTask: {
    data: {interactionId: 'mockInteractionId'},
    on: jest.fn(),
    off: jest.fn(),
    hold: jest.fn(() => Promise.resolve()),
    resume: jest.fn(() => Promise.resolve()),
    pauseRecording: jest.fn(() => Promise.resolve()),
    resumeRecording: jest.fn(() => Promise.resolve()),
    end: jest.fn(() => Promise.resolve()),
    wrapup: jest.fn(() => Promise.resolve()),
  },
  setTaskCallback: jest.fn(),
  removeTaskCallback: jest.fn(),
  TASK_EVENTS: {
    TASK_MEDIA: 'task:media',
  },
}));
const onHoldResumeCb = jest.fn();
const onEndCb = jest.fn();
const onWrapUpCb = jest.fn();

describe('CallControl Component', () => {
  it('renders CallControlPresentational with correct props', () => {
    const useCallControlSpy = jest.spyOn(helper, 'useCallControl').mockReturnValue({
      currentTask: {
        data: {interactionId: 'mockInteractionId'},
        on: jest.fn(),
        off: jest.fn(),
        hold: jest.fn(),
        resume: jest.fn(),
        pauseRecording: jest.fn(),
        resumeRecording: jest.fn(),
        end: jest.fn(),
        wrapup: jest.fn(),
      },
      audioRef: {current: null},
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
      transferCall: jest.fn(),
      consultCall: jest.fn(),
      holdTime: 0,
      consultInitiated: undefined,
      featureFlags: undefined,
      deviceType: 'BROWSER',
    });

    render(<CallControl onHoldResume={onHoldResumeCb} onEnd={onEndCb} onWrapUp={onWrapUpCb} />);

    // Assert that the useCallControl hook is called with the correct arguments
    expect(useCallControlSpy).toHaveBeenCalledWith({
      currentTask: {
        data: {interactionId: 'mockInteractionId'},
        on: expect.any(Function),
        off: expect.any(Function),
        hold: expect.any(Function),
        resume: expect.any(Function),
        pauseRecording: expect.any(Function),
        resumeRecording: expect.any(Function),
        end: expect.any(Function),
        wrapup: expect.any(Function),
      },
      onHoldResume: expect.any(Function),
      onEnd: expect.any(Function),
      onWrapUp: expect.any(Function),
      logger: {},
      consultInitiated: undefined,
      featureFlags: undefined,
      deviceType: 'BROWSER',
    });
  });
});
