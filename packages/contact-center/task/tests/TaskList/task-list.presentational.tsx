import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskListPresentational from '../../src/TaskList/task-list.presentational';
import {TaskListPresentationalProps} from '../../src/task.types';

describe('TaskListPresentational Component', () => {
  afterEach(cleanup);

  it('renders "no task yet" when taskList is empty', () => {
    const props: TaskListPresentationalProps = {
      taskList: [],
    };

    render(<TaskListPresentational {...props} />);

    const noTaskHeading = screen.getByText(/no task yet/i);
    expect(noTaskHeading).toBeInTheDocument();
  });

  it('renders a list of tasks when taskList is not empty', () => {
    const props: TaskListPresentationalProps = {
      taskList: [
        {
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
        {
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
      ],
    };

    render(<TaskListPresentational {...props} />);

    // Ensure the task cards are rendered
    const taskItems = screen.getAllByRole('img', {name: 'phone'});
    expect(taskItems).toHaveLength(2);

    // Ensure the details for the first task are displayed correctly
    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('Sales Team')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();

    // Ensure the details for the second task are displayed correctly
    expect(screen.getByText('0987654321')).toBeInTheDocument();
    expect(screen.getByText('Support Team')).toBeInTheDocument();
    expect(screen.getByText('8765432109')).toBeInTheDocument();
  });
});
