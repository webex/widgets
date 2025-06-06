import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import IncomingTaskComponent from '../../../../src/components/task/IncomingTask/incoming-task';

describe('IncomingTaskComponent', () => {
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
      incomingTask: mockTask,
      accept: jest.fn(),
      decline: jest.fn(),
      isBrowser: true,
      isAnswered: false,
      isEnded: false,
      isMissed: false,
    };

    render(<IncomingTaskComponent {...props} />);

    expect(screen.getAllByTestId('ListItemBase')).toHaveLength(1);
  });
});
