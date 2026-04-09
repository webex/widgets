import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import * as helper from '../../src/helper';
import store from '@webex/cc-store';
import {RealTimeTranscript} from '../../src/RealTimeTranscript';

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

describe('RealTimeTranscript Widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes props to useRealtimeTranscript hook', () => {
    const spy = jest.spyOn(helper, 'useRealTimeTranscript');
    const transcriptProps = {
      liveTranscriptEntries: [{id: '1', speaker: 'Agent', message: 'Hello', timestamp: 1}],
    };

    render(<RealTimeTranscript {...transcriptProps} />);

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
    jest.spyOn(helper, 'useRealTimeTranscript').mockImplementation(() => {
      throw new Error('RealTimeTranscript test error');
    });

    const {container} = render(<RealTimeTranscript />);
    expect(container.firstChild).toBeNull();
    expect(mockOnErrorCallback).toHaveBeenCalledWith('RealTimeTranscript', expect.any(Error));
  });
});
