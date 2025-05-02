import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {TaskList} from '../../src/TaskList';
import * as helper from '../../src/helper';
import {TaskListComponent} from '@webex/cc-components';
import store from '@webex/cc-store';

jest.mock('@webex/cc-components', () => {
  return {
    TaskListComponent: jest.fn(() => <div data-testid="task-list-presentational">TaskListComponent</div>),
  };
});

// Mock `@webex/cc-store`.
jest.mock('@webex/cc-store', () => ({
  cc: {},
  deviceType: 'BROWSER',
  dialNumber: '12345',
  onAccepted: jest.fn(),
  onDeclined: jest.fn(),
}));

// Mock `useTaskList`.
jest.mock('../../src/helper', () => ({
  useTaskList: jest.fn(),
}));

describe('TaskList Component', () => {
  afterEach(cleanup);

  it('renders TaskListPresentational with the correct props', () => {
    const taskListMock = [
      {id: 1, data: {interaction: {callAssociatedDetails: {ani: '1234567890'}}}},
      {id: 2, data: {interaction: {callAssociatedDetails: {ani: '9876543210'}}}},
    ];

    // Mock the return value of `useTaskList`.
    const useTaskListMock = jest.spyOn(helper, 'useTaskList');
    useTaskListMock.mockReturnValue({
      taskList: taskListMock,
    });

    render(<TaskList />);

    // Assert that `TaskListPresentational` is rendered.
    const taskListPresentational = screen.getByTestId('task-list-presentational');
    expect(taskListPresentational).toBeInTheDocument();

    // Verify that `TaskListPresentational` is called with the correct props.
    expect(TaskListComponent).toHaveBeenCalledWith({taskList: taskListMock}, {});

    // Verify that `useTaskList` is called with the correct arguments.
    expect(helper.useTaskList).toHaveBeenCalledWith({cc: store.cc, deviceType: 'BROWSER'});
  });
});
