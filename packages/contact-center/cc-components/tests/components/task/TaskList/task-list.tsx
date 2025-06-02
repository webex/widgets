import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskListComponent from '../../../../src/components/task/TaskList/task-list';
import {TaskListComponentProps} from '../../../../src/components/task/task.types';

describe.skip('TaskListPresentational Component', () => {
  afterEach(cleanup);

  it('renders a list of tasks when taskList is not empty', () => {
    const props: TaskListComponentProps = {
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

    render(<TaskListComponent {...props} />);
    expect(screen.getAllByTestId('ListItemBase')).toHaveLength(2);
  });
});
