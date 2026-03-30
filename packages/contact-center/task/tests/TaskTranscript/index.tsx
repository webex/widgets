import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import {RealtimeTranscript} from '../../src/index';
import * as helper from '../../src/helper';
import store from '@webex/cc-store';

jest.mock('@webex/cc-store', () => ({
  currentTask: {
    data: {
      interactionId: 'test-interaction-id',
    },
  },
  realtimeTranscriptLines: [],
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('RealtimeTranscript Widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes props to useRealtimeTranscript hook', () => {
    const spy = jest.spyOn(helper, 'useRealtimeTranscript');
    const transcriptProps = {
      ivrTranscript: 'ivr',
      liveTranscriptEntries: [{id: '1', speaker: 'Agent', message: 'Hello', timestamp: 1}],
    };

    render(<RealtimeTranscript {...transcriptProps} />);

    expect(spy).toHaveBeenCalledWith({
      ...transcriptProps,
      currentTaskId: 'test-interaction-id',
      realtimeTranscriptLines: [],
    });
    expect(screen.getByTestId('real-time-transcript:root')).toBeInTheDocument();
  });

  it('renders fallback when an error is thrown', () => {
    const mockOnErrorCallback = jest.fn();
    store.onErrorCallback = mockOnErrorCallback;
    jest.spyOn(helper, 'useRealtimeTranscript').mockImplementation(() => {
      throw new Error('RealtimeTranscript test error');
    });

    const {container} = render(<RealtimeTranscript />);
    expect(container.firstChild).toBeNull();
    expect(mockOnErrorCallback).toHaveBeenCalledWith('RealtimeTranscript', expect.any(Error));
  });
});
