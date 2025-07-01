import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import IncomingTaskComponent from '../../../../src/components/task/IncomingTask/incoming-task';

// This test suite is skipped because we have removed the :broken from the command
// line in the package.json scripts to run these tests in pipeline
describe.skip('IncomingTaskComponent', () => {
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
      reject: jest.fn(),
      isBrowser: true,
      isAnswered: false,
      isEnded: false,
      isMissed: false,
      logger: {
        log: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        trace: jest.fn(),
      },
    };

    render(<IncomingTaskComponent {...props} />);

    expect(screen.getAllByTestId('ListItemBase')).toHaveLength(1);
  });
});
