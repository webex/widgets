import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {TaskList} from '../../src/TaskList';
import * as helper from '../../src/helper';
import * as components from '@webex/cc-components';
import store from '@webex/cc-store';

// Mock `@webex/cc-store`.
const taskListMock = [
  {id: 1, data: {interaction: {callAssociatedDetails: {ani: '1234567890'}}}},
  {id: 2, data: {interaction: {callAssociatedDetails: {ani: '9876543210'}}}},
];
jest.mock('@webex/cc-store', () => ({
  cc: {},
  deviceType: 'BROWSER',
  dialNumber: '12345',
  onAccepted: jest.fn(),
  onDeclined: jest.fn(),
  taskList: taskListMock,
  setTaskAssigned: jest.fn(),
  setTaskRejected: jest.fn(),
}));

describe('TaskList Component', () => {
  const taskListComponentSpy = jest.spyOn(components, 'TaskListComponent');
  const helperSpy = jest.spyOn(helper, 'useTaskList');
  afterEach(cleanup);

  it('renders TaskListPresentational with the correct props', () => {
    render(<TaskList onTaskAccepted={jest.fn()} onTaskDeclined={jest.fn()} />);

    // Assert that `TaskListPresentational` is rendered.
    const taskListPresentational = screen.getByTestId('task-list');
    expect(taskListPresentational).toBeInTheDocument();

    // Verify that `TaskListPresentational` is called with the correct props.
    expect(taskListComponentSpy).toHaveBeenCalledWith(
      {
        currentTask: undefined,
        isBrowser: true,
        taskList: taskListMock,
        acceptTask: expect.any(Function),
        declineTask: expect.any(Function),
        onTaskSelect: expect.any(Function),
      },
      {}
    );

    // Verify that `useTaskList` is called with the correct arguments.
    expect(helperSpy).toHaveBeenCalledWith({
      cc: store.cc,
      deviceType: 'BROWSER',
      logger: undefined,
      onTaskAccepted: expect.any(Function),
      onTaskDeclined: expect.any(Function),
      taskList: taskListMock,
    });
  });
});
