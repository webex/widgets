import React from 'react';
import {render} from '@testing-library/react';
import * as helper from '../../src/helper';
import {CallControl} from '../../src';
import '@testing-library/jest-dom';

jest.mock('@momentum-ui/react-collaboration', () => ({
  ButtonPill: () => <div data-testid="ButtonPill" />,
}));

// Mock the store
jest.mock('@webex/cc-store', () => ({
  cc: {},
  deviceType: 'BROWSER',
  wrapupCodes: [],
  logger: {},
  currentTask: {
    on: jest.fn(),
    off: jest.fn(),
    hold: jest.fn(() => Promise.resolve()),
    resume: jest.fn(() => Promise.resolve()),
    pauseRecording: jest.fn(() => Promise.resolve()),
    resumeRecording: jest.fn(() => Promise.resolve()),
    end: jest.fn(() => Promise.resolve()),
    wrapup: jest.fn(() => Promise.resolve()),
  },
  TASK_EVENTS: {
    TASK_MEDIA: 'task:media',
  },
}));
const onHoldResumeCb = jest.fn();
const onEndCb = jest.fn();
const onWrapUpCb = jest.fn();

describe('CallControl Component', () => {
  it('renders CallControlPresentational with correct props', () => {
    const useCallControlSpy = jest.spyOn(helper, 'useCallControl');

    render(<CallControl onHoldResume={onHoldResumeCb} onEnd={onEndCb} onWrapUp={onWrapUpCb} />);

    // Assert that the useIncomingTask hook is called with the correct arguments
    expect(useCallControlSpy).toHaveBeenCalledWith({
      currentTask: expect.any(Object),
      onHoldResume: onHoldResumeCb,
      onEnd: onEndCb,
      onWrapUp: onWrapUpCb,
      logger: {},
      deviceType: 'BROWSER',
    });
  });
});
