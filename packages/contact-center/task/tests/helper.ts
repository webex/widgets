import {renderHook, act, waitFor} from '@testing-library/react';
import {useIncomingTask, useTaskList, useCallControl, useOutdialCall} from '../src/helper';
import * as taskUtils from '../src/Utils/task-util';
import {AddressBookEntriesResponse, EntryPointListResponse, TASK_EVENTS, IContactCenter} from '@webex/cc-store';
import {mockAgents, mockCC, mockQueueDetails, mockTask} from '@webex/test-fixtures';
import store from '@webex/cc-store';
import React from 'react';
const mockGetControlsVisibility = jest.spyOn(taskUtils, 'getControlsVisibility');

const taskMock = {
  ...mockTask,
  data: {
    ...mockTask.data,
    interactionId: 'interaction1',
  },
  accept: jest.fn().mockResolvedValue('Accepted'),
  decline: jest.fn().mockResolvedValue('Declined'),
  on: jest.fn(),
  off: jest.fn(),
};

const onAccepted = jest.fn();
const onDeclined = jest.fn();
const onTaskAccepted = jest.fn().mockImplementation(() => {});
const onTaskDeclined = jest.fn();
const onTaskSelected = jest.fn().mockImplementation(() => {});

const logger = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  trace: jest.fn(),
};

// Override the wrapupCodes property before your tests run
beforeAll(() => {
  store.setDeviceType('BROWSER');
  store.setWrapupCodes([{id: '123', name: 'Wrap reason'}]);
  store.store.featureFlags = {
    isEndCallEnabled: true,
    isEndConsultEnabled: true,
    webRtcEnabled: true,
  };
  store.store.cc = {
    ...mockCC,
    taskManager: {
      getAllTasks: jest.fn().mockReturnValue({
        [taskMock.data.interactionId]: taskMock,
      }),
    },
  } as IContactCenter;
});

describe('useIncomingTask Hook', () => {
  const onRejected = jest.fn();
  afterEach(() => {
    jest.clearAllMocks();
    logger.error.mockRestore();
  });

  it('shouldnt setup event listeners is not incoming call', async () => {
    const onSpy = jest.spyOn(taskMock, 'on');
    renderHook(() =>
      useIncomingTask({
        incomingTask: undefined,
        onAccepted: onTaskAccepted,
        onRejected: onTaskDeclined,
        deviceType: 'BROWSER',
        logger,
      })
    );
    expect(onSpy).not.toHaveBeenCalled();
  });

  it('should setup event listeners for the incoming call', async () => {
    store.refreshTaskList();
    const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');
    const removeTaskCallbackSpy = jest.spyOn(store, 'removeTaskCallback');

    // Mock the implementation of setTaskCallback to also call the onSpy for testing
    setTaskCallbackSpy.mockImplementation((event, callback) => {
      // Register on task mock
      taskMock.on(event, callback);
    });

    // Mock the implementation of removeTaskCallback to also call the offSpy for testing
    removeTaskCallbackSpy.mockImplementation((event, callback) => {
      // Make sure off is called on the task mock
      taskMock.off(event, callback);
    });

    const {unmount} = renderHook(() =>
      useIncomingTask({
        incomingTask: taskMock,
        onAccepted: onTaskAccepted,
        onRejected: onTaskDeclined,
        deviceType: 'BROWSER',
        logger,
      })
    );

    expect(setTaskCallbackSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function), 'interaction1');
    expect(setTaskCallbackSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_REJECT, expect.any(Function), 'interaction1');
    expect(setTaskCallbackSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function), 'interaction1');
    expect(setTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.TASK_CONSULT_ACCEPTED,
      expect.any(Function),
      'interaction1'
    );
    expect(setTaskCallbackSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_CONSULT_END, expect.any(Function), 'interaction1');
    expect(setTaskCallbackSpy).toHaveBeenCalledTimes(5);

    // Clean up
    act(() => {
      unmount();
    });

    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function), 'interaction1');
    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_REJECT, expect.any(Function), 'interaction1');
    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function), 'interaction1');
    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.TASK_CONSULT_ACCEPTED,
      expect.any(Function),
      'interaction1'
    );
    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.TASK_CONSULT_END,
      expect.any(Function),
      'interaction1'
    );
    expect(removeTaskCallbackSpy).toHaveBeenCalledTimes(5);
  });

  it('should call onAccepted if it is provided', async () => {
    // Mock store.setTaskCallback to capture the callback
    let assignedCallback;
    jest.spyOn(store, 'setTaskCallback').mockImplementation((event, callback) => {
      if (event === TASK_EVENTS.TASK_ASSIGNED) {
        assignedCallback = callback;
      }
      taskMock.on(event, callback);
    });

    renderHook(() =>
      useIncomingTask({
        incomingTask: taskMock,
        onAccepted: onTaskAccepted,
        onRejected: onTaskDeclined,
        deviceType: 'BROWSER',
        logger,
      })
    );

    // Call the callback directly instead of trying to find it
    act(() => {
      assignedCallback();
    });

    await waitFor(() => {
      expect(onTaskAccepted).toHaveBeenCalledWith({task: taskMock});
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should call onRejected if it is provided', async () => {
    renderHook(() =>
      useIncomingTask({
        incomingTask: taskMock,
        onAccepted: onTaskAccepted,
        onRejected: onTaskDeclined,
        deviceType: 'BROWSER',
        logger,
      })
    );

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_REJECT)?.[1]();
    });

    await waitFor(() => {
      expect(onTaskDeclined).toHaveBeenCalledWith({task: taskMock});
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should return if there is no taskId for incoming task', async () => {
    // Reset the mock first
    onTaskDeclined.mockClear();

    const noIdTask = {
      ...taskMock,
      data: {
        ...taskMock.data,
        interactionId: undefined, // Simulate no taskId
      },
      accept: jest.fn(),
      reject: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };
    const {result} = renderHook(() =>
      useIncomingTask({
        incomingTask: noIdTask,
        onAccepted: onTaskAccepted,
        onRejected: onTaskDeclined,
        deviceType: 'BROWSER',
        logger,
      })
    );

    act(() => {
      result.current.accept();
    });

    expect(noIdTask.accept).not.toHaveBeenCalled();
    expect(onTaskAccepted).not.toHaveBeenCalled();

    act(() => {
      result.current.reject();
    });

    expect(noIdTask.reject).not.toHaveBeenCalled();
    expect(onTaskDeclined).not.toHaveBeenCalled();
  });

  it('should not call onAccepted if it is not provided', async () => {
    renderHook(() =>
      useIncomingTask({
        incomingTask: taskMock,
        deviceType: 'BROWSER',
        logger,
      })
    );

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_ASSIGNED)?.[1]();
    });

    await waitFor(() => {
      expect(onAccepted).not.toHaveBeenCalled();
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not call onDeclined if it is not provided', async () => {
    renderHook(() =>
      useIncomingTask({
        incomingTask: taskMock,
        deviceType: 'BROWSER',
        logger,
      })
    );

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_REJECT)?.[1]();
    });

    await waitFor(() => {
      expect(onDeclined).not.toHaveBeenCalled();
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should handle errors when accepting a task', async () => {
    const failingTask = {
      ...taskMock,
      accept: jest.fn().mockRejectedValue('Error'),
      decline: jest.fn(), // No-op for decline in this test
    };

    const {result} = renderHook(() =>
      useIncomingTask({incomingTask: failingTask, onAccepted, deviceType: 'BROWSER', logger})
    );

    act(() => {
      result.current.accept();
    });

    await waitFor(() => {
      expect(failingTask.accept).toHaveBeenCalled();
    });

    // Ensure errors are logged in the console
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Error accepting incoming task: Error', {
      module: 'widget-cc-task#helper.ts',
      method: 'useIncomingTask#accept',
    });
  });

  it('should handle errors when declining a task', async () => {
    const failingTask = {
      ...taskMock,
      accept: jest.fn(), // No-op for accept in this test
      decline: jest.fn().mockRejectedValue('Error'),
    };

    const {result} = renderHook(() =>
      useIncomingTask({incomingTask: failingTask, onRejected, deviceType: 'BROWSER', logger})
    );

    act(() => {
      result.current.reject();
    });

    await waitFor(() => {
      expect(failingTask.decline).toHaveBeenCalled();
    });

    // Ensure errors are logged in the console
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Error rejecting incoming task: Error', {
      module: 'widget-cc-task#helper.ts',
      method: 'useIncomingTask#reject',
    });
  });
  describe('useIncomingTask Error Handling', () => {
    const onRejected = jest.fn();
    it('should handle errors in taskAssignCallback', () => {
      const errorOnAccepted = jest.fn().mockImplementation(() => {
        throw new Error('Test error in onAccepted');
      });

      const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');

      renderHook(() =>
        useIncomingTask({
          onAccepted: errorOnAccepted,
          onRejected,
          deviceType: 'BROWSER',
          incomingTask: taskMock,
          logger,
        })
      );

      // Find the taskAssignCallback
      const taskAssignCallback = setTaskCallbackSpy.mock.calls.find(
        (call) => call[0] === TASK_EVENTS.TASK_ASSIGNED
      )?.[1];

      act(() => {
        taskAssignCallback();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in TASK_ASSIGNED callback - Test error in onAccepted',
        {
          module: 'useIncomingTask',
          method: 'TASK_ASSIGNED_callback',
        }
      );
    });

    it('should handle errors in accept method', () => {
      const mockErrorTask = {
        ...taskMock,
        accept: jest.fn().mockImplementation(() => {
          throw new Error('Accept synchronous error');
        }),
      };

      const {result} = renderHook(() =>
        useIncomingTask({
          onAccepted,
          onRejected,
          deviceType: 'BROWSER',
          incomingTask: mockErrorTask,
          logger,
        })
      );

      act(() => {
        result.current.accept();
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in accept - Accept synchronous error', {
        module: 'useIncomingTask',
        method: 'accept',
      });
    });
  });
});

describe('useTaskList Hook', () => {
  const mockTaskList = {
    mockId1: taskMock,
    mockId2: taskMock,
  };
  afterEach(() => {
    jest.clearAllMocks();
    logger.error.mockRestore();
  });

  it('should call onTaskAccepted callback when provided', async () => {
    // Reset the mock first
    onTaskAccepted.mockClear();

    // Mock the callback registration
    store.setTaskAssigned = jest.fn((callback) => {
      // Store the callback
      store.onTaskAssigned = callback;
    });

    renderHook(() => useTaskList({cc: mockCC, deviceType: '', onTaskAccepted, logger, taskList: mockTaskList}));

    // Manually trigger the stored callback with the task
    act(() => {
      store.onTaskAssigned(taskMock);
    });

    expect(onTaskAccepted).toHaveBeenCalledWith(taskMock);

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should return if not task is passed while calling acceptTask', async () => {
    // This test is purely to improve the coverage report, as the acceptTask function cannot be called without a task
    const {result} = renderHook(() =>
      useTaskList({cc: mockCC, deviceType: '', onTaskAccepted, logger, taskList: mockTaskList})
    );

    act(() => {
      result.current.acceptTask(taskMock);
    });

    await waitFor(() => {
      expect(onTaskAccepted).not.toHaveBeenCalledWith(taskMock);
    });
  });

  it('should return if not task is passed while calling acceptTask', async () => {
    // This test is purely to improve the coverage report, as the acceptTask function cannot be called without a task
    const {result} = renderHook(() =>
      useTaskList({cc: mockCC, deviceType: '', onTaskDeclined, logger, taskList: mockTaskList})
    );

    act(() => {
      result.current.declineTask(taskMock);
    });

    await waitFor(() => {
      expect(onTaskDeclined).not.toHaveBeenCalledWith(taskMock);
    });
  });

  it('should call onTaskDeclined callback when provided', async () => {
    // Reset the mock first
    onTaskDeclined.mockClear();

    // Mock the callback registration
    store.setTaskRejected = jest.fn((callback) => {
      // Store the callback
      store.onTaskRejected = callback;
    });

    renderHook(() => useTaskList({cc: mockCC, deviceType: '', onTaskDeclined, logger, taskList: mockTaskList}));

    // Manually trigger the stored callback with the task
    act(() => {
      store.onTaskRejected(taskMock, 'test-reason');
    });

    expect(onTaskDeclined).toHaveBeenCalledWith(taskMock, 'test-reason');

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should call onTaskSelected callback when provided', async () => {
    // Reset the mock first
    onTaskSelected.mockClear();

    // Mock the callback registration
    store.setTaskSelected = jest.fn((callback) => {
      // Store the callback
      store.onTaskSelected = callback;
    });

    renderHook(() => useTaskList({cc: mockCC, deviceType: '', onTaskSelected, logger, taskList: mockTaskList}));

    // Manually trigger the stored callback with the task
    act(() => {
      store.onTaskSelected(taskMock, true);
    });

    expect(onTaskSelected).toHaveBeenCalledWith({task: taskMock, isClicked: true});

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should handle errors when accepting a task', async () => {
    const failingTask = {
      ...taskMock,
      accept: jest.fn().mockRejectedValue('Error'),
      decline: jest.fn(), // No-op for decline in this test
    };

    const {result} = renderHook(() =>
      useTaskList({cc: mockCC, onTaskAccepted, deviceType: 'BROWSER', logger, taskList: mockTaskList})
    );

    act(() => {
      result.current.acceptTask(failingTask);
    });

    await waitFor(() => {
      expect(failingTask.accept).toHaveBeenCalled();
    });

    // Ensure errors are logged in the console
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Error accepting task: Error', {
      module: 'widget-cc-task#helper.ts',
      method: 'useTaskList#acceptTask',
    });
  });

  it('should handle errors when declining a task', async () => {
    const failingTask = {
      ...taskMock,
      accept: jest.fn(), // No-op for accept in this test
      decline: jest.fn().mockRejectedValue('Error'),
    };

    const {result} = renderHook(() =>
      useTaskList({cc: mockCC, onTaskDeclined, deviceType: 'BROWSER', logger, taskList: mockTaskList})
    );

    act(() => {
      result.current.declineTask(failingTask);
    });

    await waitFor(() => {
      expect(failingTask.decline).toHaveBeenCalled();
    });

    // Ensure errors are logged in the console
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Error declining task: Error', {
      module: 'widget-cc-task#helper.ts',
      method: 'useTaskList#declineTask',
    });
  });

  it('should not call onTaskAccepted if it is not provided', async () => {
    const {result} = renderHook(() =>
      useTaskList({
        cc: mockCC,
        logger,
        deviceType: 'BROWSER',
        taskList: mockTaskList,
      })
    );

    act(() => {
      result.current.acceptTask(taskMock);
    });

    await waitFor(() => {
      expect(onTaskAccepted).not.toHaveBeenCalled();
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not call onTaskDeclined if it is not provided', async () => {
    const {result} = renderHook(() =>
      useTaskList({
        cc: mockCC,
        logger,
        deviceType: '',
        taskList: mockTaskList,
      })
    );

    act(() => {
      result.current.declineTask(taskMock);
    });

    await waitFor(() => {
      expect(onTaskDeclined).not.toHaveBeenCalled();
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });
  describe('useTaskList Error Handling', () => {
    it('should handle errors in taskAssigned callback', () => {
      const errorOnTaskAccepted = jest.fn().mockImplementation(() => {
        throw new Error('Test error in onTaskAccepted');
      });

      const setTaskAssignedSpy = jest.spyOn(store, 'setTaskAssigned');

      renderHook(() =>
        useTaskList({
          onTaskAccepted: errorOnTaskAccepted,
          onTaskDeclined,
          onTaskSelected,
          logger,
          taskList: {},
          deviceType: 'BROWSER',
          cc: mockCC,
        })
      );

      // Trigger the callback
      const taskAssignedCallback = setTaskAssignedSpy.mock.calls[0][0];
      act(() => {
        taskAssignedCallback(taskMock);
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in taskAssigned callback - Test error in onTaskAccepted',
        {
          module: 'useTaskList',
          method: 'setTaskAssigned',
        }
      );
    });

    it('should handle errors in taskSelected callback', () => {
      const errorOnTaskSelected = jest.fn().mockImplementation(() => {
        throw new Error('Test error in onTaskSelected');
      });

      const setTaskSelectedSpy = jest.spyOn(store, 'setTaskSelected');

      renderHook(() =>
        useTaskList({
          onTaskAccepted: onTaskAccepted,
          onTaskDeclined,
          onTaskSelected: errorOnTaskSelected,
          logger,
          taskList: {},
          deviceType: 'BROWSER',
          cc: mockCC,
        })
      );

      // Trigger the callback
      const taskSelectedCallback = setTaskSelectedSpy.mock.calls[0][0];
      act(() => {
        taskSelectedCallback(taskMock, true);
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in taskSelected callback - Test error in onTaskSelected',
        {
          module: 'useTaskList',
          method: 'setTaskSelected',
        }
      );
    });

    it('should handle errors in acceptTask', () => {
      const mockErrorTask = {
        ...taskMock,
        accept: jest.fn().mockImplementation(() => {
          throw new Error('Task accept error');
        }),
      };

      const {result} = renderHook(() =>
        useTaskList({
          onTaskAccepted,
          onTaskDeclined,
          onTaskSelected,
          logger,
          taskList: {},
          deviceType: 'BROWSER',
          cc: mockCC,
        })
      );

      act(() => {
        result.current.acceptTask(mockErrorTask);
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in acceptTask - Task accept error', {
        module: 'useTaskList',
        method: 'acceptTask',
      });
    });

    it('should handle errors in onTaskSelect', () => {
      const originalSetCurrentTask = store.setCurrentTask;
      store.setCurrentTask = jest.fn().mockImplementation(() => {
        throw new Error('setCurrentTask error');
      });

      const {result} = renderHook(() =>
        useTaskList({
          onTaskAccepted,
          onTaskDeclined,
          onTaskSelected,
          logger,
          taskList: {},
          deviceType: 'BROWSER',
          cc: mockCC,
        })
      );

      act(() => {
        result.current.onTaskSelect(taskMock);
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in onTaskSelect - setCurrentTask error', {
        module: 'useTaskList',
        method: 'onTaskSelect',
      });

      store.setCurrentTask = originalSetCurrentTask;
    });
  });
});

describe('useCallControl', () => {
  let originalWorker: typeof Worker;

  const mockCurrentTask = {
    ...mockTask,
    data: {
      ...mockTask.data,
      interactionId: 'someMockInteractionId',
    },
    on: jest.fn(),
    off: jest.fn(),
    hold: jest.fn(() => Promise.resolve()),
    resume: jest.fn(() => Promise.resolve()),
    pauseRecording: jest.fn(() => Promise.resolve()),
    resumeRecording: jest.fn(() => Promise.resolve()),
    end: jest.fn(() => Promise.resolve()),
    wrapup: jest.fn(() => Promise.resolve()),
    cancelAutoWrapupTimer: jest.fn(),
    consultTransfer: jest.fn(() => Promise.resolve()),
    consult: jest.fn(() => Promise.resolve()),
    endConsult: jest.fn(() => Promise.resolve()),
    toggleMute: jest.fn(() => Promise.resolve()),
  };

  const mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
  };

  const mockOnHoldResume = jest.fn();
  const mockOnEnd = jest.fn();
  const mockOnWrapUp = jest.fn();

  beforeEach(() => {
    store.refreshTaskList();
    // Mock the MediaStreamTrack and MediaStream classes for the test environment
    global.MediaStreamTrack = jest.fn().mockImplementation(() => ({
      kind: 'audio', // Simulating an audio track
      enabled: true,
      id: 'track-id',
    }));

    global.MediaStream = jest.fn().mockImplementation((tracks) => ({
      getTracks: () => tracks,
    }));

    // Mock the Worker class
    originalWorker = global.Worker;
    global.Worker = jest.fn().mockImplementation(() => ({
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null,
    }));

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn().mockImplementation(() => 'mocked-worker-url');
    jest.clearAllMocks();

    mockGetControlsVisibility.mockClear();

    const mockControlVisibility = {
      muteUnmute: true,
      holdResume: true,
      transfer: true,
      consult: true,
      end: true,
      accept: true,
      decline: true,
      pauseResumeRecording: true,
      recordingIndicator: true,
      wrapup: false,
      endConsult: false,
      conference: false,
    };
    mockGetControlsVisibility.mockReturnValue(mockControlVisibility);
  });

  afterEach(() => {
    // Restore the original Worker class and URL.createObjectURL
    global.Worker = originalWorker;
    delete global.URL.createObjectURL;
    jest.clearAllMocks();
    logger.error.mockRestore();
  });

  it('should add event listeners on task object', () => {
    const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');
    const onSpy = jest.spyOn(mockCurrentTask, 'on');

    // Mock the implementation of setTaskCallback to also call the onSpy for testing
    setTaskCallbackSpy.mockImplementation((event, callback) => {
      // Skip calling original implementation to avoid recursion
      // Just register directly on task for test visibility
      mockCurrentTask.on(event, callback);
    });

    const {unmount} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    expect(onSpy).toHaveBeenCalledTimes(6);
    // Additional expectations...

    // Unmount the component
    act(() => {
      unmount();
    });
  });

  it('should not call any call backs if callbacks are not provided', async () => {
    mockCurrentTask.hold.mockRejectedValueOnce(new Error('Hold error'));

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        logger: mockLogger,
        onHoldResume: jest.fn(),
        onEnd: jest.fn(),
        onWrapUp: jest.fn(),
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.toggleHold(true);
    });

    await act(async () => {
      await result.current.toggleHold(false);
    });

    await act(async () => {
      await result.current.endCall();
    });

    await act(async () => {
      await result.current.wrapupCall('Wrap reason', '123');
    });

    expect(mockOnHoldResume).not.toHaveBeenCalled();
    expect(mockOnEnd).not.toHaveBeenCalled();
    expect(mockOnWrapUp).not.toHaveBeenCalled();
  });

  it('should call onHoldResume with hold=true and handle success', async () => {
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.toggleHold(true);
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_HOLD)?.[1]();
    });

    expect(mockCurrentTask.hold).toHaveBeenCalled();
    expect(mockOnHoldResume).toHaveBeenCalledWith({isHeld: true, task: mockCurrentTask});
  });

  it('should call onHoldResume with hold=false and handle success', async () => {
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.toggleHold(false);
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_RESUME)?.[1]();
    });

    expect(mockCurrentTask.resume).toHaveBeenCalled();
    expect(mockOnHoldResume).toHaveBeenCalledWith({isHeld: false, task: mockCurrentTask});
  });

  it('should log an error if hold fails', async () => {
    mockCurrentTask.hold.mockRejectedValueOnce(new Error('Hold error'));

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.toggleHold(true);
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_HOLD)?.[1]();
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Hold failed: Error: Hold error', expect.any(Object));
  });

  it('should log an error if resume fails', async () => {
    mockCurrentTask.resume.mockRejectedValueOnce(new Error('Resume error'));

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.toggleHold(false);
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_RESUME)?.[1]();
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Resume failed: Error: Resume error', expect.any(Object));
  });

  it('should call endCall and handle success', async () => {
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.endCall();
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_END)?.[1]();
    });

    expect(mockCurrentTask.end).toHaveBeenCalled();
    expect(mockOnEnd).toHaveBeenCalled();
  });

  it('should call endCall and handle failure', async () => {
    mockCurrentTask.end.mockRejectedValueOnce(new Error('End error'));
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.endCall();
    });

    expect(mockCurrentTask.end).toHaveBeenCalled();
    expect(mockOnEnd).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith('endCall failed: Error: End error', expect.any(Object));
  });

  it('should call wrapupCall ', async () => {
    store.setCurrentTask = jest.fn();
    store.setState = jest.fn();

    jest.spyOn(store, 'taskList', 'get').mockReturnValue({
      anotherInteractionId: mockCurrentTask,
      [mockCurrentTask.data.interactionId]: mockCurrentTask,
    });

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.wrapupCall('Wrap reason', '123');
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.AGENT_WRAPPEDUP)?.[1]({
        wrapUpAuxCodeId: '123',
      });
    });

    expect(mockCurrentTask.wrapup).toHaveBeenCalledWith({wrapUpReason: 'Wrap reason', auxCodeId: '123'});
    expect(mockOnWrapUp).toHaveBeenCalledWith({
      task: mockCurrentTask,
      wrapUpReason: 'Wrap reason',
    });
    expect(store.setCurrentTask).toHaveBeenCalledWith(mockCurrentTask);
    expect(store.setState).toHaveBeenCalledWith({
      developerName: 'ENGAGED',
      name: 'Engaged',
    });
  });

  it('should log an error if wrapup fails', async () => {
    mockCurrentTask.wrapup.mockRejectedValueOnce(new Error('Wrapup error'));

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.wrapupCall('Wrap reason', '123');
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Error wrapping up call: Error: Wrapup error', expect.any(Object));
  });

  it('should pause the recording when pauseResume is called with true', async () => {
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );
    await waitFor(() => {
      result.current.setIsRecording(true);
    });

    await act(async () => {
      await result.current.toggleRecording();
    });

    expect(mockCurrentTask.pauseRecording).toHaveBeenCalledWith();
  });

  it('should fail and log error if pause failed', async () => {
    mockCurrentTask.pauseRecording.mockRejectedValueOnce(new Error('Pause error'));
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await waitFor(() => {
      result.current.setIsRecording(true);
    });

    await act(async () => {
      await result.current.toggleRecording();
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.CONTACT_RECORDING_PAUSED)?.[1]();
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Error pausing recording: Error: Pause error', expect.any(Object));
  });

  it('should resume the recording when pauseResume is called with false', async () => {
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await waitFor(() => {
      result.current.setIsRecording(false);
    });

    await act(async () => {
      await result.current.toggleRecording();
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.CONTACT_RECORDING_RESUMED)?.[1]();
    });

    expect(mockCurrentTask.resumeRecording).toHaveBeenCalledWith({autoResumed: false});
  });

  it('should fail and log if resume failed', async () => {
    mockCurrentTask.resumeRecording.mockRejectedValueOnce(new Error('Resume error'));
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );
    await waitFor(() => {
      result.current.setIsRecording(false);
    });

    await act(async () => {
      await result.current.toggleRecording();
    });

    expect(mockCurrentTask.resumeRecording).toHaveBeenCalledWith({autoResumed: false});
    expect(mockLogger.error).toHaveBeenCalledWith('Error resuming recording: Error: Resume error', expect.any(Object));
  });

  it('should not add media events if task is not available', async () => {
    renderHook(() =>
      useCallControl({
        currentTask: undefined,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );
    // Ensure no event handler is set
    expect(taskMock.on).not.toHaveBeenCalled();
  });

  it('should not add media listeners if device type is not BROWSER', async () => {
    const mockAudioElement = {current: {srcObject: null}};
    jest.spyOn(React, 'useRef').mockReturnValue(mockAudioElement);

    renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );
    // Ensure no event handler is set
    expect(taskMock.on).not.toHaveBeenCalled();
  });

  it('should load buddy agents successfully', async () => {
    const getBuddyAgentsSpy = jest.spyOn(store, 'getBuddyAgents').mockResolvedValue(mockAgents);
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );
    await act(async () => {
      await result.current.loadBuddyAgents();
    });
    expect(result.current.buddyAgents).toEqual(mockAgents);
    getBuddyAgentsSpy.mockRestore();
  });

  it('should call transferCall successfully', async () => {
    const transferSpy = jest.fn().mockResolvedValue('Transferred');
    const currentTaskSuccess = {...mockCurrentTask, transfer: transferSpy};
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: currentTaskSuccess,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );
    await act(async () => {
      await result.current.transferCall('test_id', 'agent');
    });
    expect(transferSpy).toHaveBeenCalledWith({
      to: 'test_id',
      destinationType: 'agent',
    });
  });

  it('should handle rejection when loading buddy agents', async () => {
    const getBuddyAgentsSpy = jest
      .spyOn(store, 'getBuddyAgents')
      .mockRejectedValue(new Error('Buddy agents loading failed'));
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );
    await act(async () => {
      await result.current.loadBuddyAgents();
    });
    expect(result.current.buddyAgents).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'CC-Widgets: Task: Error loading buddy agents - Buddy agents loading failed',
      {
        module: 'useCallControl',
        method: 'loadBuddyAgents',
      }
    );
    getBuddyAgentsSpy.mockRestore();
  });

  it('should handle rejection when transferring call', async () => {
    const transferError = new Error('Transfer failed');
    const transferSpy = jest.fn().mockRejectedValue(transferError);
    const currentTaskFailure = {...mockCurrentTask, transfer: transferSpy};
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: currentTaskFailure,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await expect(result.current.transferCall('test_transfer', 'agent')).rejects.toThrow(transferError);
    expect(transferSpy).toHaveBeenCalledWith({to: 'test_transfer', destinationType: 'agent'});
    expect(mockLogger.error).toHaveBeenCalledWith('Error transferring call: Error: Transfer failed', {
      module: 'useCallControl',
      method: 'transferCall',
    });
  });

  it('should call consultCall successfully', async () => {
    mockCurrentTask.consult = jest.fn().mockResolvedValue('Consulted');
    const setConsultInitiatedSpy = jest.spyOn(store, 'setConsultInitiated');
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );
    await act(async () => {
      await result.current.consultCall('dest123', 'agent');
    });
    expect(mockCurrentTask.consult).toHaveBeenCalledWith({to: 'dest123', destinationType: 'agent'});
    expect(setConsultInitiatedSpy).toHaveBeenCalledWith(true);
    setConsultInitiatedSpy.mockRestore();
  });

  it('should handle errors when calling consultCall', async () => {
    const consultError = new Error('Consult failed');
    mockCurrentTask.consult = jest.fn().mockRejectedValue(consultError);
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await expect(result.current.consultCall('dest123', 'agent')).rejects.toThrow(consultError);
    expect(mockCurrentTask.consult).toHaveBeenCalledWith({to: 'dest123', destinationType: 'agent'});
    expect(mockLogger.error).toHaveBeenCalledWith('Error consulting call: Error: Consult failed', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#consultCall',
    });
  });

  it('should call endConsultCall successfully', async () => {
    mockCurrentTask.endConsult = jest.fn().mockResolvedValue('ConsultEnded');
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: true,
        isMuted: false,
      })
    );
    await act(async () => {
      await result.current.endConsultCall();
    });
    expect(mockCurrentTask.endConsult).toHaveBeenCalledWith({
      isConsult: true,
      taskId: mockCurrentTask.data.interactionId,
    });
  });

  it('should initialize secondsUntilAutoWrapup to null when auto wrap-up is not active', () => {
    mockCurrentTask.endConsult = jest.fn().mockResolvedValue('ConsultEnded');
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    expect(result.current.secondsUntilAutoWrapup).toBeNull();
  });

  it('should handle errors when calling endConsultCall', async () => {
    const endConsultError = new Error('End consult failed');
    mockCurrentTask.endConsult = jest.fn().mockRejectedValue(endConsultError);
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: true,
        isMuted: false,
      })
    );

    await expect(result.current.endConsultCall()).rejects.toThrow(endConsultError);
    expect(mockCurrentTask.endConsult).toHaveBeenCalledWith({
      isConsult: true,
      taskId: mockCurrentTask.data.interactionId,
    });
    expect(mockLogger.error).toHaveBeenCalledWith('Error ending consult call: Error: End consult failed', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#endConsultCall',
    });
  });

  it('should call consultTransfer successfully', async () => {
    mockCurrentTask.consultTransfer = jest.fn().mockResolvedValue('ConsultTransferred');
    const setConsultInitiatedSpy = jest.spyOn(store, 'setConsultInitiated');
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: true,
        isMuted: false,
      })
    );
    await act(async () => {
      await result.current.consultTransfer();
    });
    expect(mockCurrentTask.consultTransfer).toHaveBeenCalled();
    expect(setConsultInitiatedSpy).toHaveBeenCalledWith(true);
    setConsultInitiatedSpy.mockRestore();
  });

  it('should handle errors when calling consultTransfer', async () => {
    const transferError = new Error('Consult transfer failed');
    mockCurrentTask.consultTransfer = jest.fn().mockRejectedValue(transferError);
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await expect(result.current.consultTransfer()).rejects.toThrow(transferError);
    expect(mockCurrentTask.consultTransfer).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith('Error transferring consult call: Error: Consult transfer failed', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#consultTransfer',
    });
  });

  it('should extract consulting agent information correctly when initiating consult', async () => {
    // Mock store.cc.agentConfig.agentId for comparison
    const mockStoreCC = {
      ...mockCC,
      agentConfig: {
        ...mockCC.agentConfig,
        agentId: 'currentAgentId',
      },
    };
    jest.spyOn(store, 'cc', 'get').mockReturnValue(mockStoreCC);

    // Create a task with participant data
    const taskWithParticipants = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interactionId: 'someMockInteractionId',
        interaction: {
          ...mockCurrentTask.data.interaction,
          participants: {
            currentAgentId: {
              id: 'currentAgentId',
              name: 'Current Agent',
              pType: 'Agent',
            },
            consultAgentId: {
              id: 'consultAgentId',
              name: 'Jane Consultant',
              pType: 'Agent',
            },
            customerId: {
              id: 'customerId',
              name: 'Customer',
              pType: 'Customer',
            },
          },
        },
      },
      on: jest.fn(),
      off: jest.fn(),
      hold: jest.fn(() => Promise.resolve()),
      resume: jest.fn(() => Promise.resolve()),
    };

    // Render the hook with the task containing participants
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: taskWithParticipants,
        logger: mockLogger,
        consultInitiated: true,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
      })
    );

    // Wait for the consultAgentName to be updated
    await waitFor(() => {
      expect(result.current.consultAgentName).toBe('Jane Consultant');
    });

    // Verify the logger was called with the correct message
    expect(mockLogger.info).toHaveBeenCalledWith('Consulting agent detected: Jane Consultant consultAgentId', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#extractConsultingAgent',
    });
  });

  it('should extract consulting agent information correctly when receiving consult', async () => {
    // Mock store.cc.agentConfig.agentId for comparison
    const mockStoreCC = {
      ...mockCC,
      agentConfig: {
        ...mockCC.agentConfig,
        agentId: 'currentAgentId',
      },
    };
    jest.spyOn(store, 'cc', 'get').mockReturnValue(mockStoreCC);

    // Create a task with participant data
    const taskWithParticipants = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interactionId: 'someMockInteractionId',
        interaction: {
          ...mockCurrentTask.data.interaction,
          participants: {
            currentAgentId: {
              id: 'currentAgentId',
              name: 'Current Agent',
              pType: 'Agent',
            },
            consultAgentId: {
              id: 'consultAgentId',
              name: 'Jane Consultant',
              pType: 'Agent',
            },
            customerId: {
              id: 'customerId',
              name: 'Customer',
              pType: 'Customer',
            },
          },
        },
      },
      on: jest.fn(),
      off: jest.fn(),
      hold: jest.fn(() => Promise.resolve()),
      resume: jest.fn(() => Promise.resolve()),
    };

    // Render the hook with the task containing participants
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: taskWithParticipants,
        logger: mockLogger,
        consultInitiated: false,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
      })
    );

    // Wait for the consultAgentName to be updated
    await waitFor(() => {
      expect(result.current.consultAgentName).toBe('Jane Consultant');
    });

    // Verify the logger was called with the correct message
    expect(mockLogger.info).toHaveBeenCalledWith('Consulting agent detected: Jane Consultant consultAgentId', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#extractConsultingAgent',
    });
  });

  it('should not update consultAgentName when no consulting agent is found', async () => {
    // Mock store.cc.agentConfig.agentId for comparison
    const mockStoreCC = {
      ...mockCC,
      agentConfig: {
        ...mockCC.agentConfig,
        agentId: 'currentAgentId',
      },
    };
    jest.spyOn(store, 'cc', 'get').mockReturnValue(mockStoreCC);

    // Create a task with only current agent and customer
    const taskWithoutConsultAgent = {
      ...mockCurrentTask,
      data: {
        ...mockTask.data,
        interactionId: 'someMockInteractionId',
        interaction: {
          ...mockTask.data.interaction,
          participants: {
            currentAgentId: {
              id: 'currentAgentId',
              name: 'Current Agent',
              pType: 'Agent',
            },
            customerId: {
              id: 'customerId',
              name: 'Customer',
              pType: 'Customer',
            },
          },
        },
      },
      on: jest.fn(),
      off: jest.fn(),
    };

    // Set the initial consultAgentName to verify it doesn't change
    const {result} = renderHook(() => {
      const hook = useCallControl({
        currentTask: taskWithoutConsultAgent,
        logger: mockLogger,
        consultInitiated: true,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
      });
      return hook;
    });

    // Verify the consultAgentName remained unchanged
    expect(result.current.consultAgentName).toBe('Consult Agent');

    // Make sure no logging happened for consulting agent detection
    expect(mockLogger.info).not.toHaveBeenCalledWith(
      expect.stringContaining('Consulting agent detected:'),
      expect.any(Object)
    );
  });

  it('should handle missing interaction data gracefully', async () => {
    // Create a task with missing interaction data
    const taskWithNoInteraction = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interactionId: 'someMockInteractionId',
        // No interaction property
      },
      on: jest.fn(),
      off: jest.fn(),
    };

    // Set the initial consultAgentName to verify it doesn't change
    const {result} = renderHook(() => {
      const hook = useCallControl({
        currentTask: taskWithNoInteraction,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      });
      // Set initial value
      return hook;
    });

    // Verify the consultAgentName remained unchanged
    expect(result.current.consultAgentName).toBe('Consult Agent');
  });

  it('should initialize holdTime to 0', async () => {
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    expect(result.current.holdTime).toEqual(0);
  });

  it('should start the timer when holdTimestamp is present in the correct media object', () => {
    const now = Date.now();
    const holdTimestamp = now - 5000; // 5 seconds ago

    // Use the same mediaResourceId as interactionId for realism
    const mockTaskWithHold = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interaction: {
          ...mockCurrentTask.data.interaction,
          media: {
            someMockInteractionId: {
              mType: 'mainCall',
              mediaResourceId: 'some-resource-id',
              mediaType: 'telephony', // or one of: email, chat, telephony, social, sms, facebook, whatsapp
              mediaMgr: 'some-media-manager',
              participants: [],
              isHold: false,
              holdTimestamp: holdTimestamp,
            },
          },
        },
      },
    };

    const mockPostMessage = jest.fn();
    (global.Worker as jest.Mock).mockImplementation(() => ({
      postMessage: mockPostMessage,
      terminate: jest.fn(),
      onmessage: null,
    }));

    renderHook(() =>
      useCallControl({
        currentTask: mockTaskWithHold,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    // Should start the worker with the correct eventTime (holdTimestamp)
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'start',
      eventTime: holdTimestamp,
    });
  });

  it('should not start the timer when holdTimestamp is missing', () => {
    const mockTaskNoHold = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interaction: {
          ...mockCurrentTask.data.interaction,
          media: {
            someMockInteractionId: {
              mType: 'call',
              mediaResourceId: 'some-resource-id',
              mediaType: 'telephony', // or one of: email, chat, telephony, social, sms, facebook, whatsapp
              mediaMgr: 'some-media-manager',
              participants: [],
              isHold: false,
              // No holdTimestamp
              holdTimestamp: undefined,
            },
          },
        },
      },
    };

    const mockPostMessage = jest.fn();
    (global.Worker as jest.Mock).mockImplementation(() => ({
      postMessage: mockPostMessage,
      terminate: jest.fn(),
      onmessage: null,
    }));

    renderHook(() =>
      useCallControl({
        currentTask: mockTaskNoHold,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    // Should not start the worker
    expect(mockPostMessage).not.toHaveBeenCalledWith(expect.objectContaining({type: 'start'}));
  });

  it('should reset holdTime to 0 when holdTimestamp is removed', () => {
    const now = Date.now();
    const holdTimestamp = now - 5000; // 5 seconds ago

    const mockTaskWithHold = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interaction: {
          ...mockCurrentTask.data.interaction,
          media: {
            main: {
              mType: 'mainCall',
              holdTimestamp,
              mediaResourceId: 'some-resource-id',
              mediaMgr: 'some-media-manager',
              participants: [],
              isHold: false,
              mediaType: 'telephony', // or one of: email, chat, telephony, social, sms, facebook, whatsapp
            },
          },
          participants: {},
        },
      },
    };

    const {result, rerender} = renderHook(
      ({task}) =>
        useCallControl({
          currentTask: task,
          onHoldResume: mockOnHoldResume,
          onEnd: mockOnEnd,
          onWrapUp: mockOnWrapUp,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          consultInitiated: false,
          isMuted: false,
        }),
      {initialProps: {task: mockTaskWithHold}}
    );

    // Simulate removing holdTimestamp
    const mockTaskNoHold = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interaction: {
          ...mockCurrentTask.data.interaction,
          media: {
            main: {
              mType: 'call',
              mediaResourceId: 'some-resource-id',
              mediaType: 'telephony', // or one of: email, chat, telephony, social, sms, facebook, whatsapp
              mediaMgr: 'some-media-manager',
              participants: [],
              isHold: false,
              // holdTimestamp undefined
              holdTimestamp: undefined,
            },
          },
          participants: {},
        },
      },
    };

    rerender({task: mockTaskNoHold});
    expect(result.current.holdTime).toBe(0);
  });

  it('should calculate holdTime correctly from holdTimestamp', () => {
    const now = Date.now();
    const holdTimestamp = now - 7000; // 7 seconds ago

    const mockTaskWithHold = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interaction: {
          ...mockCurrentTask.data.interaction,
          media: {
            main: {
              mediaResourceId: 'some-resource-id',
              mediaType: 'telephony', // or one of: email, chat, telephony, social, sms, facebook, whatsapp
              mediaMgr: 'some-media-manager',
              participants: [],
              isHold: false,
              mType: 'mainCall',
              holdTimestamp,
            },
          },
          participants: {},
        },
      },
    };

    let setHoldTimeValue = 0;
    // @ts-expect-error Mock useState to capture the holdTime value
    jest.spyOn(React, 'useState').mockImplementation((init) => [init, (v) => (setHoldTimeValue = v)]);

    renderHook(() =>
      useCallControl({
        currentTask: mockTaskWithHold,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    // The initial holdTime should be about 7 seconds
    expect(setHoldTimeValue).toBeGreaterThanOrEqual(6);
    expect(setHoldTimeValue).toBeLessThanOrEqual(7);

    // Restore useState after this test so it doesn't affect others
    (React.useState as unknown as {mockRestore?: () => void}).mockRestore?.();
  });

  it('should reset holdTime to 0 when the worker sends stop', async () => {
    let onmessageCallback: ((event: MessageEvent) => void) | null = null;

    // Provide a valid holdTimestamp so the worker is created
    const now = Date.now();
    const holdTimestamp = now - 5000;
    const mockTaskWithHold = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interaction: {
          ...mockCurrentTask.data.interaction,
          media: {
            someMockInteractionId: {
              mediaResourceId: 'some-resource-id',
              mediaType: 'telephony', // or one of: email, chat, telephony, social, sms, facebook, whatsapp
              mediaMgr: 'some-media-manager',
              participants: [],
              isHold: false,
              mType: 'mainCall',
              holdTimestamp,
            },
          },
          participants: {},
        },
      },
    };

    (global.Worker as jest.Mock).mockImplementation(() => ({
      postMessage: jest.fn(),
      terminate: jest.fn(),
      set onmessage(callback) {
        onmessageCallback = callback;
      },
    }));

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockTaskWithHold,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    // Simulate a stop message from the worker
    act(() => {
      onmessageCallback?.({
        data: {type: 'stop'},
      } as MessageEvent);
    });

    // Wait for holdTime to be updated to 0
    await waitFor(() => {
      expect(result.current.holdTime).toBe(0);
    });
  });

  it('should terminate the worker on unmount', () => {
    const mockTerminate = jest.fn();

    // Provide a valid holdTimestamp so the worker is created
    const now = Date.now();
    const holdTimestamp = now - 5000;
    const mockTaskWithHold = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interaction: {
          ...mockCurrentTask.data.interaction,
          media: {
            someMockInteractionId: {
              mType: 'mainCall',
              holdTimestamp,
              isHold: false,
              mediaResourceId: 'some-resource-id',
              mediaType: 'telephony', // or one of: email, chat, telephony, social, sms, facebook, whatsapp
              mediaMgr: 'some-media-manager',
              participants: [],
            },
          },
          participants: {},
        },
      },
    };

    (global.Worker as jest.Mock).mockImplementation(() => ({
      postMessage: jest.fn(),
      terminate: mockTerminate,
      onmessage: null,
    }));

    const {unmount} = renderHook(() =>
      useCallControl({
        currentTask: mockTaskWithHold,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    // Unmount the hook
    unmount();

    expect(mockTerminate).toHaveBeenCalled();
  });

  it('should call consultCall with queue destination type correctly', async () => {
    mockCurrentTask.consult = jest.fn().mockResolvedValue('Consulted');
    const setIsQueueConsultInProgressSpy = jest.spyOn(store, 'setIsQueueConsultInProgress');
    const setCurrentConsultQueueIdSpy = jest.spyOn(store, 'setCurrentConsultQueueId');
    const setConsultInitiatedSpy = jest.spyOn(store, 'setConsultInitiated');

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.consultCall('queueId123', 'queue');
    });

    expect(mockCurrentTask.consult).toHaveBeenCalledWith({to: 'queueId123', destinationType: 'queue'});
    expect(setIsQueueConsultInProgressSpy).toHaveBeenCalledWith(true);
    expect(setCurrentConsultQueueIdSpy).toHaveBeenCalledWith('queueId123');
    expect(setIsQueueConsultInProgressSpy).toHaveBeenCalledWith(false);
    expect(setCurrentConsultQueueIdSpy).toHaveBeenCalledWith(null);

    setIsQueueConsultInProgressSpy.mockRestore();
    setCurrentConsultQueueIdSpy.mockRestore();
    setConsultInitiatedSpy.mockRestore();
  });

  it('should call endConsultCall with queue parameters when queue consult is in progress', async () => {
    mockCurrentTask.endConsult = jest.fn().mockResolvedValue('ConsultEnded');
    jest.spyOn(store, 'isQueueConsultInProgress', 'get').mockReturnValue(true);
    jest.spyOn(store, 'currentConsultQueueId', 'get').mockReturnValue('queueId123');

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: true,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.endConsultCall();
    });

    expect(mockCurrentTask.endConsult).toHaveBeenCalledWith({
      isConsult: true,
      taskId: mockCurrentTask.data.interactionId,
      queueId: 'queueId123',
    });
  });

  it('should load queues successfully', async () => {
    const getQueuesResponse: Awaited<ReturnType<typeof store.getQueues>> = {
      data: mockQueueDetails,
      meta: {page: 0, pageSize: mockQueueDetails.length, total: mockQueueDetails.length, totalPages: 1},
    };
    const getQueuesSpy = jest.spyOn(store, 'getQueues').mockResolvedValue(getQueuesResponse);

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    await act(async () => {
      await result.current.loadQueues();
    });

    expect(result.current.queues).toEqual(mockQueueDetails);
    getQueuesSpy.mockRestore();
  });

  it('should get address book entries via getAddressBookEntries', async () => {
    const mockResponse = {data: [{id: '1', name: 'Alice', number: '123'}], meta: {page: 0, totalPages: 1}};
    jest.spyOn(store, 'getAddressBookEntries').mockResolvedValue(mockResponse as AddressBookEntriesResponse);

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    const res = await result.current.getAddressBookEntries({page: 0, pageSize: 25});
    expect(res).toEqual(mockResponse);
  });

  it('should get entry points via getEntryPoints', async () => {
    const mockResponse = {data: [{id: 'ep1', name: 'Entry 1'}], meta: {page: 0, totalPages: 1}};
    jest.spyOn(store, 'getEntryPoints').mockResolvedValue(mockResponse as EntryPointListResponse);

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    const res = await result.current.getEntryPoints({page: 0, pageSize: 25});
    expect(res).toEqual(mockResponse);
  });

  it('should get queues via getQueuesFetcher (paginated)', async () => {
    const mockResponse: Awaited<ReturnType<typeof store.getQueues>> = {
      data: [mockQueueDetails[0]],
      meta: {page: 0, pageSize: 25, total: 1, totalPages: 1},
    };
    jest.spyOn(store, 'getQueues').mockResolvedValue(mockResponse);

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        consultInitiated: false,
        isMuted: false,
      })
    );

    const res = await result.current.getQueuesFetcher({page: 0, pageSize: 25});
    expect(res).toEqual(mockResponse);
  });

  it('should call cancelAutoWrapup successfully', async () => {
    const mockOnRecordingToggle = jest.fn();

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        onRecordingToggle: mockOnRecordingToggle,
        logger: mockLogger,
        consultInitiated: false,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
      })
    );

    await act(async () => {
      result.current.cancelAutoWrapup();
    });

    expect(mockCurrentTask.cancelAutoWrapupTimer).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('CC-Widgets: CallControl: wrap-up cancelled', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#cancelAutoWrapup',
    });
  });

  describe('toggleMute functionality', () => {
    const mockOnToggleMute = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();

      mockCurrentTask.toggleMute = jest.fn(() => Promise.resolve());

      jest.spyOn(store, 'setIsMuted').mockImplementation(() => {});
      jest.spyOn(store, 'isMuted', 'get').mockImplementation(() => false);

      mockOnToggleMute.mockClear();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should successfully toggle mute from unmuted to muted', async () => {
      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockCurrentTask,
          onToggleMute: mockOnToggleMute,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          consultInitiated: false,
        })
      );

      await act(async () => {
        await result.current.toggleMute();
      });

      expect(mockLogger.info).toHaveBeenCalledWith('toggleMute() called', {
        module: 'useCallControl',
        method: 'toggleMute',
      });
      expect(mockCurrentTask.toggleMute).toHaveBeenCalled();
      expect(store.setIsMuted).toHaveBeenCalledWith(true);
      expect(mockOnToggleMute).toHaveBeenCalledWith({
        isMuted: true,
        task: mockCurrentTask,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Mute state toggled to: true', {
        module: 'useCallControl',
        method: 'toggleMute',
      });
    });

    it('should successfully toggle mute from muted to unmuted', async () => {
      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockCurrentTask,
          onToggleMute: mockOnToggleMute,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: true,
          consultInitiated: false,
        })
      );

      await act(async () => {
        await result.current.toggleMute();
      });

      expect(mockLogger.info).toHaveBeenCalledWith('toggleMute() called', {
        module: 'useCallControl',
        method: 'toggleMute',
      });
      expect(mockCurrentTask.toggleMute).toHaveBeenCalled();
      expect(store.setIsMuted).toHaveBeenCalledWith(false);
      expect(mockOnToggleMute).toHaveBeenCalledWith({
        isMuted: false,
        task: mockCurrentTask,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Mute state toggled to: false', {
        module: 'useCallControl',
        method: 'toggleMute',
      });
    });

    it('should handle multiple rapid toggleMute calls correctly', async () => {
      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockCurrentTask,
          onToggleMute: mockOnToggleMute,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          consultInitiated: false,
        })
      );

      await act(async () => {
        await Promise.all([result.current.toggleMute(), result.current.toggleMute(), result.current.toggleMute()]);
      });

      expect(mockCurrentTask.toggleMute).toHaveBeenCalledTimes(3);
      expect(store.setIsMuted).toHaveBeenCalledTimes(3);
      expect(mockOnToggleMute).toHaveBeenCalledTimes(3);
    });

    it('should not call onToggleMute callback if not provided', async () => {
      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockCurrentTask,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          consultInitiated: false,
        })
      );

      await act(async () => {
        await result.current.toggleMute();
      });

      expect(mockCurrentTask.toggleMute).toHaveBeenCalled();
      expect(store.setIsMuted).toHaveBeenCalledWith(true);
      expect(mockOnToggleMute).not.toHaveBeenCalled();
    });

    it('should not call onToggleMute callback on error if not provided', async () => {
      const toggleMuteError = new Error('Toggle mute failed');
      mockCurrentTask.toggleMute = jest.fn().mockRejectedValue(toggleMuteError);

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockCurrentTask,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          consultInitiated: false,
        })
      );

      await act(async () => {
        await result.current.toggleMute();
      });

      expect(mockCurrentTask.toggleMute).toHaveBeenCalled();
      expect(store.setIsMuted).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('toggleMute failed: Error: Toggle mute failed', {
        module: 'useCallControl',
        method: 'toggleMute',
      });
      expect(mockOnToggleMute).not.toHaveBeenCalled();
    });

    it('should handle errors when toggleMute SDK call fails and call onToggleMute with current state', async () => {
      const toggleMuteError = new Error('SDK Toggle mute failed');
      mockCurrentTask.toggleMute = jest.fn().mockRejectedValue(toggleMuteError);

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockCurrentTask,
          onToggleMute: mockOnToggleMute,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: true,
          consultInitiated: false,
        })
      );

      await act(async () => {
        await result.current.toggleMute();
      });

      expect(mockLogger.info).toHaveBeenCalledWith('toggleMute() called', {
        module: 'useCallControl',
        method: 'toggleMute',
      });
      expect(mockCurrentTask.toggleMute).toHaveBeenCalled();
      expect(store.setIsMuted).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('toggleMute failed: Error: SDK Toggle mute failed', {
        module: 'useCallControl',
        method: 'toggleMute',
      });
      expect(mockOnToggleMute).toHaveBeenCalledWith({
        isMuted: true,
        task: mockCurrentTask,
      });
    });

    it('should return toggleMute function and isMuted state in hook result', () => {
      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockCurrentTask,
          onToggleMute: mockOnToggleMute,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          consultInitiated: false,
        })
      );

      expect(typeof result.current.toggleMute).toBe('function');
      expect(typeof result.current.isMuted).toBe('boolean');
    });

    it('should handle controlVisibility being undefined', async () => {
      jest.spyOn(taskUtils, 'getControlsVisibility').mockReturnValue(undefined);

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockCurrentTask,
          onToggleMute: mockOnToggleMute,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          consultInitiated: false,
        })
      );

      await act(async () => {
        await result.current.toggleMute();
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Mute control not available', {
        module: 'useCallControl',
        method: 'toggleMute',
      });
      expect(mockCurrentTask.toggleMute).not.toHaveBeenCalled();
    });
  });

  describe('useCallControl Error Handling', () => {
    const onHoldResume = jest.fn();
    const onEnd = jest.fn();
    const onWrapUp = jest.fn();
    const onRecordingToggle = jest.fn();
    const onToggleMute = jest.fn();
    const logger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      trace: jest.fn(),
    };

    it('should handle errors in extractConsultingAgent', () => {
      // Mock currentTask with problematic participants structure
      jest.spyOn(logger, 'info').mockImplementation(() => {
        throw new Error('Participants access error');
      });
      const problematicTask = {
        ...taskMock,
        data: {
          ...taskMock.data,
          interaction: {
            participants: {
              '123': {
                pType: 'Agent',
                id: '123',
                name: 'Agent 1',
              },
            },
          },
        },
      };

      renderHook(() =>
        useCallControl({
          currentTask: problematicTask,
          onHoldResume,
          onEnd,
          onWrapUp,
          onRecordingToggle,
          onToggleMute,
          logger,
          consultInitiated: false,
          deviceType: 'BROWSER',
          featureFlags: {webRtcEnabled: true},
          isMuted: false,
        })
      );

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in extractConsultingAgent - Participants access error',
        {
          module: 'useCallControl',
          method: 'extractConsultingAgent',
        }
      );
    });

    it('should handle errors in holdCallback', () => {
      const errorOnHoldResume = jest.fn().mockImplementation(() => {
        throw new Error('Hold resume callback error');
      });

      const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');

      renderHook(() =>
        useCallControl({
          currentTask: taskMock,
          onHoldResume: errorOnHoldResume,
          onEnd,
          onWrapUp,
          onRecordingToggle,
          onToggleMute,
          logger,
          consultInitiated: false,
          deviceType: 'BROWSER',
          featureFlags: {webRtcEnabled: true},
          isMuted: false,
        })
      );

      // Find the hold callback
      const holdCallback = setTaskCallbackSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_HOLD)?.[1];

      act(() => {
        holdCallback();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in holdCallback - Hold resume callback error',
        {
          module: 'useCallControl',
          method: 'holdCallback',
        }
      );
    });

    it('should handle errors in toggleHold', () => {
      const mockErrorTask = {
        ...taskMock,
        hold: jest.fn().mockImplementation(() => {
          throw new Error('Hold method error');
        }),
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockErrorTask,
          onHoldResume,
          onEnd,
          onWrapUp,
          onRecordingToggle,
          onToggleMute,
          logger,
          consultInitiated: false,
          deviceType: 'BROWSER',
          featureFlags: {webRtcEnabled: true},
          isMuted: false,
        })
      );

      act(() => {
        result.current.toggleHold(true);
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in toggleHold - Participants access error', {
        module: 'useCallControl',
        method: 'toggleHold',
      });
    });

    it('should handle errors in loadBuddyAgents', async () => {
      const originalGetBuddyAgents = store.getBuddyAgents;
      store.getBuddyAgents = jest.fn().mockImplementation(() => {
        throw new Error('getBuddyAgents error');
      });

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: taskMock,
          onHoldResume,
          onEnd,
          onWrapUp,
          onRecordingToggle,
          onToggleMute,
          logger,
          consultInitiated: false,
          deviceType: 'BROWSER',
          featureFlags: {webRtcEnabled: true},
          isMuted: false,
        })
      );

      await act(async () => {
        await result.current.loadBuddyAgents();
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error loading buddy agents - getBuddyAgents error', {
        module: 'useCallControl',
        method: 'loadBuddyAgents',
      });

      store.getBuddyAgents = originalGetBuddyAgents;
    });
  });
});

describe('useOutdialCall', () => {
  const ccMock = {
    ...mockCC,
    startOutdial: jest.fn().mockResolvedValue('Success'),
  };

  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  };

  const destination = '123456789';

  beforeEach(() => {
    global.alert = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    logger.error.mockRestore();
    logger.info.mockRestore();
  });

  it('should successfully start an outdial call', async () => {
    const {result} = renderHook(() =>
      useOutdialCall({
        cc: ccMock,
        logger,
      })
    );

    await act(async () => {
      await result.current.startOutdial(destination);
    });

    expect(ccMock.startOutdial).toHaveBeenCalledWith(destination);
    expect(logger.info).toHaveBeenCalledWith('Outdial call started', 'Success');
  });

  it('should show alert when destination is empty or only constains spaces', async () => {
    const {result} = renderHook(() =>
      useOutdialCall({
        cc: ccMock,
        logger,
      })
    );

    await act(async () => {
      await result.current.startOutdial('   ');
    });

    expect(global.alert).toHaveBeenCalledWith('Destination number is required, it cannot be empty');
    expect(ccMock.startOutdial).not.toHaveBeenCalled();
  });

  it('should handle errors when starting outdial call fails', async () => {
    const errormockCC = {
      ...mockCC,
      startOutdial: jest.fn().mockRejectedValue(new Error('Outdial call failed')),
    };

    const {result} = renderHook(() =>
      useOutdialCall({
        cc: errormockCC,
        logger,
      })
    );

    await act(async () => {
      await result.current.startOutdial(destination);
    });

    expect(errormockCC.startOutdial).toHaveBeenCalledWith(destination);
    expect(logger.error).toHaveBeenCalledWith('Error: Outdial call failed', {
      module: 'widget-OutdialCall#helper.ts',
      method: 'startOutdial',
    });
  });

  it('should return if no destination is provided', async () => {
    const {result} = renderHook(() =>
      useOutdialCall({
        cc: ccMock,
        logger,
      })
    );

    const invalidDestination = undefined;

    await act(async () => {
      await result.current.startOutdial(invalidDestination);
    });

    expect(ccMock.startOutdial).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
  describe('useOutdialCall Error Handling', () => {
    it('should handle errors in startOutdial', () => {
      const mockErrorCC = {
        ...mockCC,
        startOutdial: jest.fn().mockImplementation(() => {
          throw new Error('startOutdial synchronous error');
        }),
      };

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockErrorCC,
          logger,
        })
      );

      act(() => {
        result.current.startOutdial('1234567890');
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in startOutdial - startOutdial synchronous error',
        {
          module: 'useOutdialCall',
          method: 'startOutdial',
        }
      );
    });
  });
});
