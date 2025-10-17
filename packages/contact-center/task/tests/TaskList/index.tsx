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

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

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

  describe('ErrorBoundary Tests', () => {
    it('should render empty fragment when ErrorBoundary catches an error and onErrorCallback is defined', () => {
      const mockOnErrorCallback = jest.fn();
      store.onErrorCallback = mockOnErrorCallback;
      // Mock the useTaskList to throw an error
      jest.spyOn(helper, 'useTaskList').mockImplementation(() => {
        throw new Error('Test error in useTaskList');
      });

      const {container} = render(
        <TaskList onTaskAccepted={jest.fn()} onTaskDeclined={jest.fn()} onTaskSelected={jest.fn()} />
      );

      // The fallback should render an empty fragment (no content)
      expect(container.firstChild).toBeNull();
      expect(mockOnErrorCallback).toHaveBeenCalledWith('TaskList', expect.any(Error));
      expect(mockOnErrorCallback).toHaveBeenCalledTimes(1);
    });

    it('should render empty fragment when ErrorBoundary catches an error and onErrorCallback is undefined', () => {
      store.onErrorCallback = undefined;
      // Mock the useTaskList to throw an error
      jest.spyOn(helper, 'useTaskList').mockImplementation(() => {
        throw new Error('Test error without callback');
      });

      const {container} = render(
        <TaskList onTaskAccepted={jest.fn()} onTaskDeclined={jest.fn()} onTaskSelected={jest.fn()} />
      );

      // The fallback should render an empty fragment (no content)
      expect(container.firstChild).toBeNull();
      // Should not throw, just render empty
    });
  });
});
