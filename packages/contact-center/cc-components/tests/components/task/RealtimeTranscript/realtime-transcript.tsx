import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import RealTimeTranscriptComponent from '../../../../src/components/task/RealTimeTranscript/real-time-transcript';
import {RealtimeTranscriptComponentProps} from '../../../../src/components/task/task.types';

describe('RealTimeTranscriptComponent', () => {
  const defaultProps: RealtimeTranscriptComponentProps = {
    ivrTranscript: 'IVR summary text',
    activeTab: 'live',
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

  it('renders ivr content when ivr tab active', () => {
    render(<RealTimeTranscriptComponent {...defaultProps} activeTab="ivr" />);
    expect(screen.getByTestId('real-time-transcript:ivr-content')).toHaveTextContent('IVR summary text');
  });

  it('calls onTabChange when live tab clicked', () => {
    const onTabChange = jest.fn();
    render(<RealTimeTranscriptComponent {...defaultProps} onTabChange={onTabChange} />);

    fireEvent.click(screen.getByTestId('real-time-transcript:live-tab'));
    expect(onTabChange).toHaveBeenCalledWith('live');
  });
});
