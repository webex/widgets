import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {TaskList} from '../../src/TaskList';
import * as helper from '../../src/helper';
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
  setTaskSelected: jest.fn(),
  isIncomingTask: jest.fn(),
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('TaskList Component', () => {
  const helperSpy = jest.spyOn(helper, 'useTaskList');
  afterEach(cleanup);

  it('renders TaskListPresentational with the correct props', () => {
    render(<TaskList onTaskAccepted={jest.fn()} onTaskDeclined={jest.fn()} onTaskSelected={jest.fn()} />);

    // Assert that `TaskListPresentational` is rendered.
    const taskListPresentational = screen.getByTestId('task-list');
    expect(taskListPresentational).toBeInTheDocument();

    // Verify that `useTaskList` is called with the correct arguments.
    expect(helperSpy).toHaveBeenCalledWith({
      cc: store.cc,
      deviceType: 'BROWSER',
      logger: store.logger,
      onTaskAccepted: expect.any(Function),
      onTaskDeclined: expect.any(Function),
      onTaskSelected: expect.any(Function),
      taskList: taskListMock,
    });
  });
});
