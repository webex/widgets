import React from 'react';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import IncomingTaskPresentational from '../../src/IncomingTask/incoming-task.presentational';

describe('IncomingTaskPresentational', () => {
  afterEach(cleanup);

  it('renders incoming call for browser option', () => {
    const mockTask = {
      data: {
        interaction: {
          callAssociatedDetails: {
            ani: '1234567890',
            dn: '987654321',
            virtualTeamName: 'Sales Team',
          },
        },
      },
    };

    const props = {
      currentTask: mockTask,
      accept: jest.fn(),
      decline: jest.fn(),
      isBrowser: true,
      isAnswered: false,
      isEnded: false,
      isMissed: false,
    };

    render(<IncomingTaskPresentational {...props} />);

    const callInfo = screen.getByTestId('incoming-task-ani');
    expect(callInfo).toHaveTextContent('1234567890');
  });
});
