import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import {TaskTranscript} from '../../src/TaskTranscript';
import * as helper from '../../src/helper';
import store from '@webex/cc-store';

jest.mock('@webex/cc-store', () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('TaskTranscript Widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes props to useTaskTranscript hook', () => {
    const spy = jest.spyOn(helper, 'useTaskTranscript');

    render(
      <TaskTranscript
        ivrTranscript="ivr"
        liveTranscriptEntries={[{id: '1', speaker: 'Agent', message: 'Hello', timestamp: 1}]}
      />
    );

    expect(spy).toHaveBeenCalledWith({
      ivrTranscript: 'ivr',
      liveTranscriptEntries: [{id: '1', speaker: 'Agent', message: 'Hello', timestamp: 1}],
    });
    expect(screen.getByTestId('task-transcript:root')).toBeInTheDocument();
  });

  it('renders fallback when an error is thrown', () => {
    const mockOnErrorCallback = jest.fn();
    store.onErrorCallback = mockOnErrorCallback;
    jest.spyOn(helper, 'useTaskTranscript').mockImplementation(() => {
      throw new Error('TaskTranscript test error');
    });

    const {container} = render(<TaskTranscript />);
    expect(container.firstChild).toBeNull();
    expect(mockOnErrorCallback).toHaveBeenCalledWith('TaskTranscript', expect.any(Error));
  });
});
