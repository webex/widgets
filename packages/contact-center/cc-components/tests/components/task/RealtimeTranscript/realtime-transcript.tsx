import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import RealTimeTranscriptComponent from '../../../../src/components/task/RealTimeTranscript/real-time-transcript';
import {RealTimeTranscriptComponentProps} from '../../../../src/components/task/task.types';

describe('RealTimeTranscriptComponent', () => {
  const defaultProps: RealTimeTranscriptComponentProps = {
    liveTranscriptEntries: [
      {
        id: '2',
        speaker: '%Customer%',
        message: 'Customer message',
        timestamp: 2,
        displayTime: '00:02',
        isCustomer: true,
      },
      {
        id: '1',
        speaker: '%You%',
        message: 'Agent message',
        timestamp: 1,
        displayTime: '00:01',
      },
    ],
  };

  it('renders live transcript entries and sorts by timestamp', () => {
    render(<RealTimeTranscriptComponent {...defaultProps} />);

    const messages = screen.getAllByTestId('real-time-transcript:item');
    expect(messages).toHaveLength(2);
    expect(messages[0]).toHaveTextContent('Agent message');
    expect(messages[1]).toHaveTextContent('Customer message');
  });

  it('renders empty state when there are no transcript entries', () => {
    render(<RealTimeTranscriptComponent liveTranscriptEntries={[]} />);
    expect(screen.getByText('No live transcript available.')).toBeInTheDocument();
  });
});
