import React from 'react';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import IncomingTaskPresentational from '../../src/IncomingTask/incoming-task.presentational';

describe('IncomingTaskPresentational', () => {
  afterEach(cleanup);

  it('renders "no task yet" when there is no current task', () => {
    const props = {
      currentTask: null,
      accept: jest.fn(),
      decline: jest.fn(),
      isBrowser: true,
      answered: false,
      ended: false,
      missed: false,
    };

    render(<IncomingTaskPresentational {...props} />);

    const message = screen.getByText('no task yet');
    expect(message).toBeInTheDocument();
  });

  it('renders incoming call details and buttons for browser option', () => {
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
      answered: false,
      ended: false,
      missed: false,
    };

    render(<IncomingTaskPresentational {...props} />);

    const callInfo = screen.getByTestId('incoming-task-ani');
    expect(callInfo).toHaveTextContent('1234567890');
  });
});
