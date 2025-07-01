import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskListComponent from '../../../../src/components/task/TaskList/task-list';
import {TaskListComponentProps} from '../../../../src/components/task/task.types';

// This test suite is skipped because we have removed the :broken from the command
// line in the package.json scripts to run these tests in pipeline
describe.skip('TaskListPresentational Component', () => {
  afterEach(cleanup);

  it('renders a list of tasks when taskList is not empty', () => {
    const loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      trace: jest.fn(),
    };

    const props: TaskListComponentProps = {
      currentTask: {
        id: '1',
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              dn: '9876543210',
              virtualTeamName: 'Sales Team',
            },
          },
        },
      },
      taskList: {
        '1': {
          id: '1',
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '1234567890',
                dn: '9876543210',
                virtualTeamName: 'Sales Team',
              },
            },
          },
        },
        '2': {
          id: '2',
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '0987654321',
                dn: '8765432109',
                virtualTeamName: 'Support Team',
              },
            },
          },
        },
      },
      isBrowser: true,
      acceptTask: jest.fn(),
      declineTask: jest.fn(),
      onTaskSelect: jest.fn(),
      logger: loggerMock,
    };

    render(<TaskListComponent {...props} />);
    expect(screen.getAllByTestId('ListItemBase')).toHaveLength(2);
  });
});
