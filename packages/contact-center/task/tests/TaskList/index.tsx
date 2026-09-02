import React from 'react';
import {render, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {TaskList} from '../../src/TaskList';
import * as helper from '../../src/helper';
import store from '@webex/cc-store';

Object.defineProperty(global, 'Worker', {
  writable: true,
  value: class MockWorker {
    constructor() {}
    postMessage = jest.fn();
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    terminate = jest.fn();
  },
});

Object.defineProperty(global, 'URL', {
  writable: true,
  value: {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn(),
  },
});

jest.mock('@webex/cc-store', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory cannot reference module-scope ES imports
  const {makeMockTask, mockTask} = require('@webex/test-fixtures');
  const mockTaskList = {
    [mockTask.data.interactionId]: mockTask,
    'interaction-456': makeMockTask({interactionId: 'interaction-456'}),
  };

  return {
    __esModule: true,
    default: {
      cc: {},
      deviceType: 'BROWSER',
      dialNumber: '12345',
      currentTask: null,
      agentId: 'agent1',
      isDeclineButtonEnabled: true,
      onAccepted: jest.fn(),
      onDeclined: jest.fn(),
      taskList: mockTaskList,
      setTaskAssigned: jest.fn(),
      setTaskRejected: jest.fn(),
      setTaskSelected: jest.fn(),
      setCurrentTask: jest.fn(),
      isIncomingTask: jest.fn(),
      acceptedCampaignIds: new Set(),
      offerActionErrors: {},
      setOfferActionError: jest.fn(),
      clearOfferActionError: jest.fn(),
      pruneOfferActionErrors: jest.fn(),
      CAMPAIGN_PREVIEW_OUTBOUND_TYPES: ['STANDARD_PREVIEW_CAMPAIGN', 'DIRECT_PREVIEW_CAMPAIGN'],
      CAMPAIGN_PREVIEW_CAMPAIGN_TYPES: ['preview_standard', 'preview_direct'],
      logger: {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
      },
    },
  };
});

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

    // Verify that `useTaskList` is called with the correct arguments.
    expect(helperSpy).toHaveBeenCalledWith({
      cc: store.cc,
      logger: store.logger,
      onTaskAccepted: expect.any(Function),
      onTaskDeclined: expect.any(Function),
      onTaskSelected: expect.any(Function),
      taskList: store.taskList,
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
