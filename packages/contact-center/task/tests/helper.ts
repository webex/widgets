import {renderHook, act, waitFor} from '@testing-library/react';
import {useIncomingTask, useTaskList, useCallControl, useOutdialCall} from '../src/helper';
import {getControlsVisibility} from '../src/Utils/task-util';
import {TASK_EVENTS} from '@webex/cc-store';
import store from '@webex/cc-store';
import React from 'react';

jest.mock('../src/Utils/task-util', () => {
  const actual = jest.requireActual('../src/Utils/task-util');
  return {
    ...actual,
    getControlsVisibility: jest.fn(),
  };
});

// Cast it to a mock
const mockGetControlsVisibility = getControlsVisibility as jest.MockedFunction<typeof getControlsVisibility>;

// Mock webex instance and task
const ccMock = {
  on: jest.fn(),
  off: jest.fn(),
};

const taskMock = {
  data: {
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
};

// Override the wrapupCodes property before your tests run
beforeAll(() => {
  store.setWrapupCodes([{id: '123', name: 'Wrap reason'}]);
  store.store.featureFlags = {
    isEndCallEnabled: true,
    isEndConsultEnabled: true,
    webRtcEnabled: true,
  };
  store.store.cc = {
    ...store.store.cc, // Keep other properties if they exist
    taskManager: {
      getAllTasks: jest.fn().mockReturnValue({
        [taskMock.data.interactionId]: taskMock,
      }),
    },
  };
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
      data: {},
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
});

describe('useTaskList Hook', () => {
  const mockTaskList = [taskMock, taskMock];
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

    renderHook(() => useTaskList({cc: ccMock, deviceType: '', onTaskAccepted, logger, taskList: mockTaskList}));

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
      useTaskList({cc: ccMock, deviceType: '', onTaskAccepted, logger, taskList: mockTaskList})
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
      useTaskList({cc: ccMock, deviceType: '', onTaskDeclined, logger, taskList: mockTaskList})
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

    renderHook(() => useTaskList({cc: ccMock, deviceType: '', onTaskDeclined, logger, taskList: mockTaskList}));

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

    renderHook(() => useTaskList({cc: ccMock, deviceType: '', onTaskSelected, logger, taskList: mockTaskList}));

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
      useTaskList({cc: ccMock, onTaskAccepted, deviceType: 'BROWSER', logger, taskList: mockTaskList})
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
      useTaskList({cc: ccMock, onTaskDeclined, deviceType: 'BROWSER', logger, taskList: mockTaskList})
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
        cc: ccMock,
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
        cc: ccMock,
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
});

describe('useCallControl', () => {
  let originalWorker: typeof Worker;

  const mockCurrentTask = {
    data: {
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
  };

  const mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
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

    // Clear the mock before each test
    mockGetControlsVisibility.mockClear();

    // Set up the default mock return value
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
    // Mock the function to return the control visibility object
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
      })
    );

    await waitFor(() => {
      result.current.setIsRecording(false);
    });

    await act(async () => {
      await result.current.toggleRecording();
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.CONTACT_RECORDING_RESUMED)?.[1]();
    });

    expect(mockCurrentTask.resumeRecording).toHaveBeenCalledWith();
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
      })
    );
    await waitFor(() => {
      result.current.setIsRecording(false);
    });

    await act(async () => {
      await result.current.toggleRecording();
    });

    expect(mockCurrentTask.resumeRecording).toHaveBeenCalledWith();
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
      })
    );
    // Ensure no event handler is set
    expect(taskMock.on).not.toHaveBeenCalled();
  });

  it('should load buddy agents successfully', async () => {
    const dummyAgents = [
      {id: 'a1', name: 'Agent1'},
      {id: 'a2', name: 'Agent2'},
    ];
    const getBuddyAgentsSpy = jest.spyOn(store, 'getBuddyAgents').mockResolvedValue(dummyAgents);
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
      })
    );
    await act(async () => {
      await result.current.loadBuddyAgents();
    });
    expect(result.current.buddyAgents).toEqual(dummyAgents);
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
      })
    );
    await act(async () => {
      await result.current.loadBuddyAgents();
    });
    expect(result.current.buddyAgents).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalledWith('Error loading buddy agents: Error: Buddy agents loading failed', {
      module: 'helper.ts',
      method: 'loadBuddyAgents',
    });
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
      })
    );
    await act(async () => {
      await result.current.consultTransfer('dest456', 'queue');
    });
    expect(mockCurrentTask.consultTransfer).toHaveBeenCalledWith({
      to: 'dest456',
      destinationType: 'queue',
    });
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
      })
    );

    await expect(result.current.consultTransfer('dest456', 'queue')).rejects.toThrow(transferError);
    expect(mockCurrentTask.consultTransfer).toHaveBeenCalledWith({
      to: 'dest456',
      destinationType: 'queue',
    });
    expect(mockLogger.error).toHaveBeenCalledWith('Error transferring consult call: Error: Consult transfer failed', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#consultTransfer',
    });
  });

  it('should extract consulting agent information correctly when initiating consult', async () => {
    // Mock store.cc.agentConfig.agentId for comparison
    const mockStoreCC = {
      agentConfig: {
        agentId: 'currentAgentId',
      },
    };
    jest.spyOn(store, 'cc', 'get').mockReturnValue(mockStoreCC);

    // Create a task with participant data
    const taskWithParticipants = {
      ...mockCurrentTask,
      data: {
        interactionId: 'someMockInteractionId',
        interaction: {
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
      agentConfig: {
        agentId: 'currentAgentId',
      },
    };
    jest.spyOn(store, 'cc', 'get').mockReturnValue(mockStoreCC);

    // Create a task with participant data
    const taskWithParticipants = {
      ...mockCurrentTask,
      data: {
        interactionId: 'someMockInteractionId',
        interaction: {
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
      agentConfig: {
        agentId: 'currentAgentId',
      },
    };
    jest.spyOn(store, 'cc', 'get').mockReturnValue(mockStoreCC);

    // Create a task with only current agent and customer
    const taskWithoutConsultAgent = {
      ...mockCurrentTask,
      data: {
        interactionId: 'someMockInteractionId',
        interaction: {
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
          media: {
            someMockInteractionId: {
              mType: 'mainCall',
              holdTimestamp,
            },
          },
          participants: {}, // <-- Add this line
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
          media: {
            main: {
              mType: 'mainCall',
              // No holdTimestamp
            },
          },
          participants: {},
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
          media: {
            main: {
              mType: 'mainCall',
              holdTimestamp,
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
        }),
      {initialProps: {task: mockTaskWithHold}}
    );

    // Simulate removing holdTimestamp
    const mockTaskNoHold = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interaction: {
          media: {
            main: {
              mType: 'mainCall',
              // holdTimestamp removed
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
          media: {
            main: {
              mType: 'mainCall',
              holdTimestamp,
            },
          },
          participants: {},
        },
      },
    };

    let setHoldTimeValue = 0;
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
          media: {
            someMockInteractionId: {
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
          media: {
            someMockInteractionId: {
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
        logger: logger,
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
    const dummyQueues = [
      {id: 'q1', name: 'Queue1'},
      {id: 'q2', name: 'Queue2'},
    ];
    const getQueuesSpy = jest.spyOn(store, 'getQueues').mockResolvedValue(dummyQueues);

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
      })
    );

    await act(async () => {
      await result.current.loadQueues();
    });

    expect(result.current.queues).toEqual(dummyQueues);
    getQueuesSpy.mockRestore();
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
      // Clear all mocks first
      jest.clearAllMocks();

      // Add toggleMute mock to mockCurrentTask
      mockCurrentTask.toggleMute = jest.fn(() => Promise.resolve());

      // Mock store methods
      jest.spyOn(store, 'setIsMuted').mockImplementation(() => {});
      jest.spyOn(store, 'isMuted', 'get').mockImplementation(() => false);

      // Clear the callback mock
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
          isMuted: false, // ✅ Add this prop
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
          isMuted: true, // ✅ Set to true for muted state
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
      expect(store.setIsMuted).toHaveBeenCalledWith(false); // Should unmute
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
        })
      );

      // Make multiple rapid calls
      await act(async () => {
        await Promise.all([result.current.toggleMute(), result.current.toggleMute(), result.current.toggleMute()]);
      });

      // Should have been called 3 times
      expect(mockCurrentTask.toggleMute).toHaveBeenCalledTimes(3);
      expect(store.setIsMuted).toHaveBeenCalledTimes(3);
      expect(mockOnToggleMute).toHaveBeenCalledTimes(3);
    });

    it('should not call onToggleMute callback if not provided', async () => {
      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockCurrentTask,
          // onToggleMute not provided
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false, // ✅ Add this prop
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
          // onToggleMute not provided
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false, // ✅ Add this prop
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
          isMuted: true, // ✅ Current state is muted
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
      expect(store.setIsMuted).not.toHaveBeenCalled(); // State should not be updated on error
      expect(mockLogger.error).toHaveBeenCalledWith('toggleMute failed: Error: SDK Toggle mute failed', {
        module: 'useCallControl',
        method: 'toggleMute',
      });
      expect(mockOnToggleMute).toHaveBeenCalledWith({
        isMuted: true, // Current actual state (unchanged)
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
          isMuted: false, // ✅ Add this prop
        })
      );

      expect(typeof result.current.toggleMute).toBe('function');
      expect(typeof result.current.isMuted).toBe('boolean');
    });

    it('should handle controlVisibility being undefined', async () => {
      // Mock controlVisibility to return undefined
      mockGetControlsVisibility.mockReturnValue(undefined);

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockCurrentTask,
          onToggleMute: mockOnToggleMute,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false, // ✅ Add this prop
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
});

describe('useOutdialCall', () => {
  const ccMock = {
    startOutdial: jest.fn().mockResolvedValue('Success'),
  };

  const logger = {
    info: jest.fn(),
    error: jest.fn(),
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
    const errorCcMock = {
      startOutdial: jest.fn().mockRejectedValue(new Error('Outdial call failed')),
    };

    const {result} = renderHook(() =>
      useOutdialCall({
        cc: errorCcMock,
        logger,
      })
    );

    await act(async () => {
      await result.current.startOutdial(destination);
    });

    expect(errorCcMock.startOutdial).toHaveBeenCalledWith(destination);
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
});
