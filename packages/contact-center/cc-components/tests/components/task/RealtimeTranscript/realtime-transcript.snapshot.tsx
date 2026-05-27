import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import RealTimeTranscriptComponent from '../../../../src/components/task/RealTimeTranscript/real-time-transcript';

describe('RealTimeTranscriptComponent snapshots', () => {
  it('matches snapshot with transcript content', () => {
    const {container} = render(
      <RealTimeTranscriptComponent
        liveTranscriptEntries={[
          {
            id: '1',
            speaker: 'You',
            message: 'Hello there',
            timestamp: 1,
            displayTime: '11:26 AM',
          },
          {
            id: '2',
            speaker: 'Customer',
            message: 'Hi',
            timestamp: 2,
            displayTime: '11:27 AM',
            isCustomer: true,
          },
        ]}
      />
    );

    expect(container).toMatchSnapshot();
  });
});
