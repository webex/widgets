import {renderHook, act, waitFor} from '@testing-library/react';
import {useIncomingTask, useTaskList, useCallControl, useOutdialCall} from '../src/helper';
import * as taskUtils from '../src/Utils/task-util';
import {
  TIMER_LABEL_WRAP_UP,
  TIMER_LABEL_POST_CALL,
  TIMER_LABEL_CONSULT_ON_HOLD,
  TIMER_LABEL_CONSULTING,
} from '../src/Utils/constants';
import {AddressBookEntriesResponse, EntryPointListResponse, TASK_EVENTS, IContactCenter} from '@webex/cc-store';
import {ITask} from '@webex/contact-center';
import {
  mockAgents,
  mockCC,
  mockQueueDetails,
  mockTask,
  mockAniEntries,
  mockOutdialCallProps,
  mockCCWithAni,
} from '@webex/test-fixtures';
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

const logger = mockCC.LoggerProxy;

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

  const mockLogger = mockCC.LoggerProxy;

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
      muteUnmute: {isVisible: true, isEnabled: true},
      muteUnmuteConsult: {isVisible: false, isEnabled: false},
      holdResume: {isVisible: true, isEnabled: true},
      transfer: {isVisible: true, isEnabled: true},
      consult: {isVisible: true, isEnabled: true},
      end: {isVisible: true, isEnabled: true},
      accept: {isVisible: true, isEnabled: true},
      decline: {isVisible: true, isEnabled: true},
      pauseResumeRecording: {isVisible: true, isEnabled: true},
      recordingIndicator: {isVisible: true, isEnabled: true},
      wrapup: {isVisible: false, isEnabled: false},
      endConsult: {isVisible: false, isEnabled: false},
      conference: {isVisible: false, isEnabled: false},
      consultTransfer: {isVisible: false, isEnabled: false},
      mergeConference: {isVisible: false, isEnabled: false},
      mergeConferenceConsult: {isVisible: false, isEnabled: false},
      consultTransferConsult: {isVisible: false, isEnabled: false},
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: false},
      exitConference: {isVisible: false, isEnabled: false},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultInitiatedOrAccepted: false,
      isConsultReceived: false,
      isHeld: false,
      consultCallHeld: false,
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );
    await act(async () => {
      await result.current.consultCall('dest123', 'agent', false);
    });
    expect(mockCurrentTask.consult).toHaveBeenCalledWith({
      to: 'dest123',
      destinationType: 'agent',
      holdParticipants: true,
    });
  });

  it('should call consultCall with allowParticipantsToInteract set to true', async () => {
    mockCurrentTask.consult = jest.fn().mockResolvedValue('Consulted');

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );
    await act(async () => {
      await result.current.consultCall('dest123', 'agent', true);
    });
    expect(mockCurrentTask.consult).toHaveBeenCalledWith({
      to: 'dest123',
      destinationType: 'agent',
      holdParticipants: false,
    });
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );

    await expect(result.current.consultCall('dest123', 'agent', false)).rejects.toThrow(consultError);
    expect(mockCurrentTask.consult).toHaveBeenCalledWith({
      to: 'dest123',
      destinationType: 'agent',
      holdParticipants: true,
    });
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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

  it('should handle endConsultCall when interactionId is missing', async () => {
    const taskWithoutInteractionId = {
      ...mockCurrentTask,
      data: {
        ...mockCurrentTask.data,
        interactionId: undefined,
      },
    };

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: taskWithoutInteractionId,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );

    await act(async () => {
      await result.current.endConsultCall();
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Cannot end consult call: currentTask or interactionId is missing', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#endConsultCall',
    });
  });

  it('should call consultTransfer successfully', async () => {
    mockCurrentTask.consultTransfer = jest.fn().mockResolvedValue('ConsultTransferred');
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );
    await act(async () => {
      await result.current.consultTransfer();
    });
    expect(mockCurrentTask.consultTransfer).toHaveBeenCalled();
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );

    await expect(result.current.consultTransfer()).rejects.toThrow(transferError);
    expect(mockCurrentTask.consultTransfer).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith('Error transferring consult call: Error: Consult transfer failed', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#consultTransfer',
    });
  });

  it('should handle consultTransfer when currentTask data is missing', async () => {
    const taskWithoutData = {
      ...mockCurrentTask,
      data: undefined,
    };

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: taskWithoutData,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );

    await act(async () => {
      await result.current.consultTransfer();
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Cannot transfer consult call: currentTask or data is missing', {
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
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );

    // Wait for the consultAgentName to be updated
    await waitFor(() => {
      expect(result.current.consultAgentName).toBe('Jane Consultant');
    });

    // Verify the logger was called with the correct message
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Consulting agent detected (fallback): Jane Consultant consultAgentId',
      {
        module: 'widget-cc-task#helper.ts',
        method: 'useCallControl#extractConsultingAgent',
      }
    );
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
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );

    // Wait for the consultAgentName to be updated
    await waitFor(() => {
      expect(result.current.consultAgentName).toBe('Jane Consultant');
    });

    // Verify the logger was called with the correct message
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Consulting agent detected (fallback): Jane Consultant consultAgentId',
      {
        module: 'widget-cc-task#helper.ts',
        method: 'useCallControl#extractConsultingAgent',
      }
    );
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
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {interaction, ...dataWithoutInteraction} = mockCurrentTask.data;
    const taskWithNoInteraction = {
      ...mockCurrentTask,
      data: {
        ...dataWithoutInteraction,
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockTaskWithHold,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );

    // The initial holdTime should be about 7 seconds
    // Note: We check the result.current.holdTime directly instead of mocking useState
    expect(result.current.holdTime).toBeGreaterThanOrEqual(6);
    expect(result.current.holdTime).toBeLessThanOrEqual(7);
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );

    await act(async () => {
      await result.current.consultCall('queueId123', 'queue', false);
    });

    expect(mockCurrentTask.consult).toHaveBeenCalledWith({
      to: 'queueId123',
      destinationType: 'queue',
      holdParticipants: true,
    });
    expect(setIsQueueConsultInProgressSpy).toHaveBeenCalledWith(true);
    expect(setCurrentConsultQueueIdSpy).toHaveBeenCalledWith('queueId123');
    expect(setIsQueueConsultInProgressSpy).toHaveBeenCalledWith(false);
    expect(setCurrentConsultQueueIdSpy).toHaveBeenCalledWith(null);

    setIsQueueConsultInProgressSpy.mockRestore();
    setCurrentConsultQueueIdSpy.mockRestore();
  });

  it('should handle errors when calling consultCall with queue destination type', async () => {
    const consultError = new Error('Queue consult failed');
    mockCurrentTask.consult = jest.fn().mockRejectedValue(consultError);
    const setIsQueueConsultInProgressSpy = jest.spyOn(store, 'setIsQueueConsultInProgress');
    const setCurrentConsultQueueIdSpy = jest.spyOn(store, 'setCurrentConsultQueueId');

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );

    await expect(result.current.consultCall('queueId123', 'queue', false)).rejects.toThrow(consultError);

    expect(mockCurrentTask.consult).toHaveBeenCalledWith({
      to: 'queueId123',
      destinationType: 'queue',
      holdParticipants: true,
    });
    expect(setIsQueueConsultInProgressSpy).toHaveBeenCalledWith(true);
    expect(setCurrentConsultQueueIdSpy).toHaveBeenCalledWith('queueId123');
    // Check that cleanup happened on error
    expect(setIsQueueConsultInProgressSpy).toHaveBeenCalledWith(false);
    expect(setCurrentConsultQueueIdSpy).toHaveBeenCalledWith(null);
    expect(mockLogger.error).toHaveBeenCalledWith('Error consulting call: Error: Queue consult failed', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#consultCall',
    });

    setIsQueueConsultInProgressSpy.mockRestore();
    setCurrentConsultQueueIdSpy.mockRestore();
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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

  it('should get queues via getQueuesFetcher', async () => {
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
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );

    const res = await result.current.getQueuesFetcher({page: 0, pageSize: mockQueueDetails.length});

    expect(res.data).toEqual(mockQueueDetails);
    expect(res).toEqual(getQueuesResponse);
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
        isMuted: false,
        conferenceEnabled: false,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: false,
        agentId: 'test-agent-id',
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
        isMuted: false,
        conferenceEnabled: false,
        agentId: 'test-agent-id',
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
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
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

  it('should handle cancelAutoWrapup when currentTask is missing', async () => {
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: undefined,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        featureFlags: store.featureFlags,
        deviceType: store.deviceType,
        isMuted: false,
        conferenceEnabled: true,
        agentId: 'test-agent-id',
      })
    );

    await act(async () => {
      result.current.cancelAutoWrapup();
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'CC-Widgets: CallControl: Cannot cancel auto-wrapup, currentTask is missing',
      {
        module: 'widget-cc-task#helper.ts',
        method: 'useCallControl#cancelAutoWrapup',
      }
    );
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
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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

    it('should handle toggleMute error', async () => {
      const error = new Error('toggleMute failed');
      mockCurrentTask.toggleMute = jest.fn().mockRejectedValue(error);

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockCurrentTask,
          onToggleMute: mockOnToggleMute,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'test-agent-id',
        })
      );

      await act(async () => {
        await result.current.toggleMute();
      });

      expect(mockLogger.error).toHaveBeenCalledWith('toggleMute failed: Error: toggleMute failed', {
        module: 'useCallControl',
        method: 'toggleMute',
      });
    });
  });

  describe('Conference Functions', () => {
    describe('consultConference', () => {
      it('should call consultConference successfully', async () => {
        mockCurrentTask.consultConference = jest.fn().mockResolvedValue(undefined);

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: mockCurrentTask,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        await act(async () => {
          await result.current.consultConference();
        });

        expect(mockCurrentTask.consultConference).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('consultConference success', {
          module: 'useCallControl',
          method: 'consultConference',
        });
      });

      it('should handle consultConference error', async () => {
        const error = new Error('consultConference failed');
        mockCurrentTask.consultConference = jest.fn().mockRejectedValue(error);

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: mockCurrentTask,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        await expect(
          act(async () => {
            await result.current.consultConference();
          })
        ).rejects.toThrow('consultConference failed');

        expect(mockLogger.error).toHaveBeenCalledWith('Error consulting conference: Error: consultConference failed', {
          module: 'useCallControl',
          method: 'consultConference',
        });
      });
    });

    describe('exitConference', () => {
      it('should call exitConference successfully', async () => {
        mockCurrentTask.exitConference = jest.fn().mockResolvedValue(undefined);

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: mockCurrentTask,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        await act(async () => {
          await result.current.exitConference();
        });

        expect(mockCurrentTask.exitConference).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('exitConference success', {
          module: 'useCallControl',
          method: 'exitConference',
        });
      });

      it('should handle exitConference error', async () => {
        const error = new Error('exitConference failed');
        mockCurrentTask.exitConference = jest.fn().mockRejectedValue(error);

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: mockCurrentTask,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        await expect(
          act(async () => {
            await result.current.exitConference();
          })
        ).rejects.toThrow('exitConference failed');

        expect(mockLogger.error).toHaveBeenCalledWith('Error exiting conference: Error: exitConference failed', {
          module: 'useCallControl',
          method: 'exitConference',
        });
      });
    });

    describe('switchToMainCall', () => {
      it('should call switchToMainCall successfully', async () => {
        mockCurrentTask.resume = jest.fn().mockResolvedValue(undefined);

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: mockCurrentTask,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        await act(async () => {
          await result.current.switchToMainCall();
        });

        expect(mockCurrentTask.resume).toHaveBeenCalled();
      });

      it('should handle switchToMainCall error', async () => {
        const error = new Error('switchToMainCall failed');
        mockCurrentTask.resume = jest.fn().mockRejectedValue(error);

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: mockCurrentTask,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        await expect(
          act(async () => {
            await result.current.switchToMainCall();
          })
        ).rejects.toThrow('switchToMainCall failed');

        expect(mockLogger.error).toHaveBeenCalledWith('Error switchToMainCall: Error: switchToMainCall failed', {
          module: 'useCallControl',
          method: 'switchToMainCall',
        });
      });
    });

    describe('switchToConsult', () => {
      it('should call switchToConsult successfully', async () => {
        mockCurrentTask.hold = jest.fn().mockResolvedValue(undefined);

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: mockCurrentTask,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        await act(async () => {
          await result.current.switchToConsult();
        });

        expect(mockCurrentTask.hold).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('switchToConsult success', {
          module: 'useCallControl',
          method: 'switchToConsult',
        });
      });

      it('should handle switchToConsult error', async () => {
        const error = new Error('switchToConsult failed');
        mockCurrentTask.hold = jest.fn().mockRejectedValue(error);

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: mockCurrentTask,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        await expect(
          act(async () => {
            await result.current.switchToConsult();
          })
        ).rejects.toThrow('switchToConsult failed');

        expect(mockLogger.error).toHaveBeenCalledWith('Error switching to consult: Error: switchToConsult failed', {
          module: 'useCallControl',
          method: 'switchToConsult',
        });
      });
    });

    describe('consultTransfer with conference in progress', () => {
      it('should call transferConference when conference is in progress', async () => {
        const taskWithConference = {
          ...mockCurrentTask,
          data: {
            ...mockCurrentTask.data,
            isConferenceInProgress: true,
          },
          transferConference: jest.fn().mockResolvedValue(undefined),
        };

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: taskWithConference,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        await act(async () => {
          await result.current.consultTransfer();
        });

        expect(mockLogger.info).toHaveBeenCalledWith('Conference in progress, using transferConference', {
          module: 'useCallControl',
          method: 'transferCall',
        });
        expect(taskWithConference.transferConference).toHaveBeenCalled();
      });

      it('should handle transferConference error when conference is in progress', async () => {
        const error = new Error('transferConference failed');
        const taskWithConference = {
          ...mockCurrentTask,
          data: {
            ...mockCurrentTask.data,
            isConferenceInProgress: true,
          },
          transferConference: jest.fn().mockRejectedValue(error),
        };

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: taskWithConference,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        await expect(
          act(async () => {
            await result.current.consultTransfer();
          })
        ).rejects.toThrow('transferConference failed');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error transferring consult call: Error: transferConference failed',
          {
            module: 'widget-cc-task#helper.ts',
            method: 'useCallControl#consultTransfer',
          }
        );
      });
    });

    describe('consult button disabled via controlVisibility with conference participants', () => {
      it('should disable consult button when max participants reached in multi-party conference', () => {
        const taskWithMaxParticipants = {
          ...mockCurrentTask,
          data: {
            ...mockCurrentTask.data,
            interactionId: 'main',
            interaction: {
              media: {
                main: {
                  participants: ['agent1', 'agent2', 'agent3', 'agent4', 'agent5', 'agent6', 'agent7', 'agent8'],
                },
              },
              participants: {
                agent1: {id: 'agent1', pType: 'Agent', hasLeft: false},
                agent2: {id: 'agent2', pType: 'Agent', hasLeft: false},
                agent3: {id: 'agent3', pType: 'Agent', hasLeft: false},
                agent4: {id: 'agent4', pType: 'Agent', hasLeft: false},
                agent5: {id: 'agent5', pType: 'Agent', hasLeft: false},
                agent6: {id: 'agent6', pType: 'Agent', hasLeft: false},
                agent7: {id: 'agent7', pType: 'Agent', hasLeft: false},
                agent8: {id: 'agent8', pType: 'Agent', hasLeft: false},
              },
            },
          },
        };

        store.cc.agentConfig = {agentId: 'agent1', regexUS: '', outdialANIId: ''};

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: taskWithMaxParticipants,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        // Should be disabled when 7 other agents (8 total - current agent = 7 >= 7 max)
        expect(result.current.controlVisibility.consult.isEnabled).toBe(false);
      });

      it('should disable consult button when max participants reached in three-party conference', () => {
        const taskWithThreeParticipants = {
          ...mockCurrentTask,
          data: {
            ...mockCurrentTask.data,
            interactionId: 'main',
            interaction: {
              media: {
                main: {
                  participants: ['agent1', 'agent2', 'agent3', 'agent4'],
                },
              },
              participants: {
                agent1: {id: 'agent1', pType: 'Agent', hasLeft: false},
                agent2: {id: 'agent2', pType: 'Agent', hasLeft: false},
                agent3: {id: 'agent3', pType: 'Agent', hasLeft: false},
                agent4: {id: 'agent4', pType: 'Agent', hasLeft: false},
              },
            },
          },
        };

        store.cc.agentConfig = {agentId: 'agent1', regexUS: '', outdialANIId: ''};

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: taskWithThreeParticipants,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: false,
            agentId: 'test-agent-id',
          })
        );

        // Should be disabled when 3 other agents (4 total - current agent = 3 >= 3 max for three-party)
        expect(result.current.controlVisibility.consult.isEnabled).toBe(false);
      });

      it('should enable consult button when below max participants', () => {
        const taskWithFewParticipants = {
          ...mockCurrentTask,
          data: {
            ...mockCurrentTask.data,
            interactionId: 'main',
            interaction: {
              media: {
                main: {
                  participants: ['agent1', 'agent2', 'customer1'],
                },
              },
              participants: {
                agent1: {id: 'agent1', pType: 'Agent', hasLeft: false},
                agent2: {id: 'agent2', pType: 'Agent', hasLeft: false},
                customer1: {id: 'customer1', pType: 'Customer', hasLeft: false},
              },
            },
          },
        };

        store.cc.agentConfig = {agentId: 'agent1', regexUS: '', outdialANIId: ''};

        const {result} = renderHook(() =>
          useCallControl({
            currentTask: taskWithFewParticipants,
            onHoldResume: mockOnHoldResume,
            onEnd: mockOnEnd,
            onWrapUp: mockOnWrapUp,
            logger: mockLogger,
            featureFlags: store.featureFlags,
            deviceType: store.deviceType,
            isMuted: false,
            conferenceEnabled: true,
            agentId: 'test-agent-id',
          })
        );

        // Should be enabled when only 1 other agent (2 - current agent = 1 < 7 max)
        expect(result.current.controlVisibility.consult.isEnabled).toBe(true);
      });
    });
  });

  describe('useCallControl Error Handling', () => {
    const onHoldResume = jest.fn();
    const onEnd = jest.fn();
    const onWrapUp = jest.fn();
    const onRecordingToggle = jest.fn();
    const onToggleMute = jest.fn();
    const logger = mockCC.LoggerProxy;

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
          deviceType: 'BROWSER',
          featureFlags: {webRtcEnabled: true},
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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
          deviceType: 'BROWSER',
          featureFlags: {webRtcEnabled: true},
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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
          deviceType: 'BROWSER',
          featureFlags: {webRtcEnabled: true},
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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
          deviceType: 'BROWSER',
          featureFlags: {webRtcEnabled: true},
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'test-agent-id',
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

  describe('Timer State Management', () => {
    const mockControlVisibility = {
      accept: {isVisible: false, isEnabled: false},
      decline: {isVisible: false, isEnabled: false},
      end: {isVisible: true, isEnabled: true},
      muteUnmute: {isVisible: true, isEnabled: true},
      holdResume: {isVisible: true, isEnabled: true},
      pauseResumeRecording: {isVisible: false, isEnabled: false},
      recordingIndicator: {isVisible: false, isEnabled: false},
      transfer: {isVisible: true, isEnabled: true},
      conference: {isVisible: false, isEnabled: false},
      exitConference: {isVisible: false, isEnabled: false},
      mergeConference: {isVisible: false, isEnabled: false},
      consult: {isVisible: true, isEnabled: true},
      endConsult: {isVisible: false, isEnabled: false},
      consultConference: {isVisible: false, isEnabled: false},
      consultTransfer: {isVisible: false, isEnabled: false},
      consultTransferConsult: {isVisible: false, isEnabled: false},
      mergeConferenceConsult: {isVisible: false, isEnabled: false},
      muteUnmuteConsult: {isVisible: false, isEnabled: false},
      endConsultCall: {isVisible: false, isEnabled: false},
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: false},
      wrapup: {isVisible: false, isEnabled: false},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultReceived: false,
      isConsultInitiatedOrAccepted: false,
      isHeld: false,
      consultCallHeld: false,
    };

    it('should set stateTimerLabel to "Wrap Up" when in wrapup state', async () => {
      const mockTaskInWrapup = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          wrapUpRequired: true, // This makes wrapup.isVisible = true
          interaction: {
            ...mockCurrentTask.data.interaction,
            participants: {
              agent1: {
                joinTimestamp: 1000,
                isWrapUp: true,
                lastUpdated: 3000,
                wrapUpTimestamp: 3000,
                pType: 'Agent',
              },
            },
          },
        },
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskInWrapup,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      await waitFor(() => {
        expect(result.current.stateTimerLabel).toBe(TIMER_LABEL_WRAP_UP);
        expect(result.current.stateTimerTimestamp).toBe(3000);
      });
    });

    it('should set stateTimerLabel to "Post Call" when in post_call state', () => {
      const mockTaskInPostCall = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            state: 'post_call',
            participants: {
              agent1: {
                joinTimestamp: 1000,
                currentState: 'post_call',
                currentStateTimestamp: 4000,
                pType: 'Agent',
              },
            },
          },
        },
      };

      mockGetControlsVisibility.mockImplementation(() => ({
        ...mockControlVisibility,
        wrapup: {isVisible: false, isEnabled: false},
      }));

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskInPostCall,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      expect(result.current.stateTimerLabel).toBe(TIMER_LABEL_POST_CALL);
      expect(result.current.stateTimerTimestamp).toBe(4000);
    });

    it('should prioritize "Wrap Up" over "Post Call" label', async () => {
      const mockTaskWithBothStates = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          wrapUpRequired: true, // This makes wrapup.isVisible = true
          interaction: {
            ...mockCurrentTask.data.interaction,
            state: 'post_call',
            participants: {
              agent1: {
                joinTimestamp: 1000,
                isWrapUp: true,
                wrapUpTimestamp: 3000,
                currentStateTimestamp: 4000,
                lastUpdated: 3000,
                pType: 'Agent',
              },
            },
          },
        },
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithBothStates,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      await waitFor(() => {
        expect(result.current.stateTimerLabel).toBe(TIMER_LABEL_WRAP_UP);
        expect(result.current.stateTimerTimestamp).toBe(3000);
      });
    });

    it('should set consultTimerLabel to "Consult on Hold" when consult is held', async () => {
      const mockTaskWithConsultHeld = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          isConsultInProgress: true,
          interaction: {
            ...mockCurrentTask.data.interaction,
            media: {
              'consult-id': {
                mType: 'consult',
                isHold: true,
                holdTimestamp: 5000,
                mediaResourceId: 'consult-id',
                participants: ['agent1'],
              },
            },
            participants: {
              agent1: {
                joinTimestamp: 1000,
                consultTimestamp: 2000,
                pType: 'Agent',
              },
            },
          },
        },
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithConsultHeld,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      await waitFor(() => {
        expect(result.current.consultTimerLabel).toBe(TIMER_LABEL_CONSULT_ON_HOLD);
        expect(result.current.consultTimerTimestamp).toBe(5000);
      });
    });

    it('should use consultTimestamp for active consult timer', async () => {
      const mockTaskWithActiveConsult = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          isConsultInProgress: true,
          interaction: {
            ...mockCurrentTask.data.interaction,
            media: {
              'consult-id': {
                mType: 'consult',
                isHold: false,
                mediaResourceId: 'consult-id',
                participants: ['agent1', 'agent2'],
              },
            },
            participants: {
              agent1: {
                id: 'agent1',
                joinTimestamp: 1000,
                consultTimestamp: 2000,
                pType: 'Agent',
              },
              agent2: {
                id: 'agent2',
                pType: 'Agent',
              },
            },
          },
        },
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithActiveConsult,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      await waitFor(() => {
        // The timer should use the consultTimestamp (2000)
        expect(result.current.consultTimerTimestamp).toBe(2000);
        // The label should be "Consulting" or "Consult Requested" depending on state
        expect(result.current.consultTimerLabel).toMatch(/Consult/);
      });
    });

    it('should set consultTimerLabel to "Consulting" when consult is active', () => {
      const mockTaskWithActiveConsult = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            participants: {
              agent1: {
                joinTimestamp: 1000,
                consultTimestamp: 2000,
                pType: 'Agent',
              },
            },
          },
        },
      };

      mockGetControlsVisibility.mockImplementation(() => ({
        ...mockControlVisibility,
        consultCallHeld: false,
        isConsultInitiated: false,
      }));

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithActiveConsult,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      expect(result.current.consultTimerLabel).toBe(TIMER_LABEL_CONSULTING);
      expect(result.current.consultTimerTimestamp).toBe(2000);
    });

    it('should select agent with consultState="consulting" in multi-agent conference', async () => {
      const mockTaskWithMultiAgentConference = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            media: {
              main: {
                mType: 'telephony',
                isHold: false,
                mediaResourceId: 'main',
                participants: ['agent2', 'agent3', 'agent4', 'customer1'],
              },
            },
            participants: {
              agent2: {
                id: 'agent2',
                name: 'Agent 2',
                pType: 'Agent',
                joinTimestamp: 1000,
                consultTimestamp: 2000,
                consultState: 'conferencing',
              },
              agent3: {
                id: 'agent3',
                name: 'Agent 3',
                pType: 'Agent',
                joinTimestamp: 3000,
                consultTimestamp: 4000,
                consultState: 'conferencing',
              },
              agent4: {
                id: 'agent4',
                name: 'Agent 4',
                pType: 'Agent',
                joinTimestamp: 5000,
                consultTimestamp: 6000,
                consultState: 'consulting',
                isConsulted: true,
              },
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
                joinTimestamp: 500,
              },
            },
          },
        },
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithMultiAgentConference,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'agent2',
        })
      );

      await waitFor(() => {
        // Should select Agent 4 as they have consultState="consulting"
        expect(result.current.consultAgentName).toBe('Agent 4');
      });
    });

    it('should fallback to most recent timestamp when no agent has consultState="consulting"', async () => {
      const mockTaskWithMultiAgentConference = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            media: {
              main: {
                mType: 'telephony',
                isHold: false,
                mediaResourceId: 'main',
                participants: ['agent2', 'agent3', 'agent4', 'customer1'],
              },
            },
            participants: {
              agent2: {
                id: 'agent2',
                name: 'Agent 2',
                pType: 'Agent',
                joinTimestamp: 1000,
                consultTimestamp: 2000,
              },
              agent3: {
                id: 'agent3',
                name: 'Agent 3',
                pType: 'Agent',
                joinTimestamp: 3000,
                consultTimestamp: 4000,
              },
              agent4: {
                id: 'agent4',
                name: 'Agent 4',
                pType: 'Agent',
                joinTimestamp: 5000,
                consultTimestamp: 6000,
              },
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
                joinTimestamp: 500,
              },
            },
          },
        },
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithMultiAgentConference,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'agent2',
        })
      );

      await waitFor(() => {
        // Should select Agent 4 as they have the most recent consultTimestamp (6000)
        expect(result.current.consultAgentName).toBe('Agent 4');
      });
    });

    it('should correctly identify single agent in simple consult scenario', async () => {
      const mockTaskWithSingleConsult = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            media: {
              main: {
                mType: 'telephony',
                isHold: false,
                mediaResourceId: 'main',
                participants: ['agent2', 'agent3', 'customer1'],
              },
            },
            participants: {
              agent2: {
                id: 'agent2',
                name: 'Agent 2',
                pType: 'Agent',
                joinTimestamp: 1000,
              },
              agent3: {
                id: 'agent3',
                name: 'Agent 3',
                pType: 'Agent',
                joinTimestamp: 3000,
                consultTimestamp: 4000,
              },
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
                joinTimestamp: 500,
              },
            },
          },
        },
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithSingleConsult,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent2',
        })
      );

      await waitFor(() => {
        // Should select Agent 3 as they are the only other agent
        expect(result.current.consultAgentName).toBe('Agent 3');
      });
    });

    it('should handle agents without timestamps (backward compatibility)', async () => {
      const mockTaskWithoutTimestamps = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            participants: {
              agent2: {
                id: 'agent2',
                name: 'Agent 2',
                pType: 'Agent',
              },
              agent3: {
                id: 'agent3',
                name: 'Agent 3',
                pType: 'Agent',
              },
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
              },
            },
          },
        },
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithoutTimestamps,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent2',
        })
      );

      await waitFor(() => {
        // Should select Agent 3 (first other agent found) when no timestamps are available
        expect(result.current.consultAgentName).toBe('Agent 3');
      });
    });

    it('should preserve entry point name when consulting to entry point', async () => {
      const mockTaskWithAgents = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            participants: {
              agent2: {
                id: 'agent2',
                name: 'Agent 2',
                pType: 'Agent',
                consultState: 'conferencing',
                consultTimestamp: 1000,
              },
              agent3: {
                id: 'agent3',
                name: 'Agent 3',
                pType: 'Agent',
                consultState: 'conferencing',
                consultTimestamp: 2000,
              },
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
              },
            },
          },
        },
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithAgents,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'agent2',
        })
      );

      // Simulate setting the entry point name (as done by handleTargetSelect)
      act(() => {
        result.current.setConsultAgentName('Support Entry Point');
        result.current.setLastTargetType('entryPoint');
      });

      // Wait to ensure extractConsultingAgent doesn't override the name
      await waitFor(
        () => {
          expect(result.current.consultAgentName).toBe('Support Entry Point');
        },
        {timeout: 1000}
      );

      // Verify the name is still the entry point name and wasn't overridden by agent extraction
      expect(result.current.consultAgentName).toBe('Support Entry Point');
    });

    it('should preserve dial number when consulting to dial number', async () => {
      const mockTaskWithAgents = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            participants: {
              agent2: {
                id: 'agent2',
                name: 'Agent 2',
                pType: 'Agent',
                consultState: 'conferencing',
                consultTimestamp: 1000,
              },
              agent3: {
                id: 'agent3',
                name: 'Agent 3',
                pType: 'Agent',
                consultState: 'conferencing',
                consultTimestamp: 2000,
              },
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
              },
            },
          },
        },
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithAgents,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'agent2',
        })
      );

      // Simulate setting the dial number (as done by handleTargetSelect)
      act(() => {
        result.current.setConsultAgentName('+1234567890');
        result.current.setLastTargetType('dialNumber');
      });

      // Wait to ensure extractConsultingAgent doesn't override the name
      await waitFor(
        () => {
          expect(result.current.consultAgentName).toBe('+1234567890');
        },
        {timeout: 1000}
      );

      // Verify the name is still the dial number and wasn't overridden by agent extraction
      expect(result.current.consultAgentName).toBe('+1234567890');
    });

    it('should preserve consult timer when resuming from hold', async () => {
      const mockTaskWithConsultHeld = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          isConsultInProgress: true,
          interaction: {
            ...mockCurrentTask.data.interaction,
            media: {
              'consult-id': {
                mType: 'consult',
                isHold: true,
                holdTimestamp: 5000,
                mediaResourceId: 'consult-id',
                participants: ['agent1'],
              },
            },
            participants: {
              agent1: {
                joinTimestamp: 1000,
                consultTimestamp: 2000,
                pType: 'Agent',
              },
            },
          },
        },
      };

      const {result, rerender} = renderHook(
        ({task}) =>
          useCallControl({
            currentTask: task,
            logger,
            deviceType: 'BROWSER',
            featureFlags: {},
            isMuted: false,
            conferenceEnabled: false,
            agentId: 'agent1',
          }),
        {
          initialProps: {
            task: mockTaskWithConsultHeld,
          },
        }
      );

      await waitFor(() => {
        expect(result.current.consultTimerTimestamp).toBe(5000);
      });

      // Resume from hold
      const mockTaskConsultResumed = {
        ...mockTaskWithConsultHeld,
        data: {
          ...mockTaskWithConsultHeld.data,
          interaction: {
            ...mockTaskWithConsultHeld.data.interaction,
            media: {
              'consult-id': {
                mType: 'consult',
                isHold: false,
                mediaResourceId: 'consult-id',
                participants: ['agent1'],
              },
            },
          },
        },
      };

      rerender({task: mockTaskConsultResumed});

      // Should use original consultTimestamp, not reset to 0
      await waitFor(() => {
        expect(result.current.consultTimerTimestamp).toBe(2000);
      });
    });
  });

  describe('Agent Extraction from Consult Media', () => {
    const mockControlVisibility = {
      accept: {isVisible: false, isEnabled: false},
      decline: {isVisible: false, isEnabled: false},
      end: {isVisible: true, isEnabled: true},
      muteUnmute: {isVisible: true, isEnabled: true},
      holdResume: {isVisible: true, isEnabled: true},
      pauseResumeRecording: {isVisible: false, isEnabled: false},
      recordingIndicator: {isVisible: false, isEnabled: false},
      transfer: {isVisible: true, isEnabled: false},
      conference: {isVisible: true, isEnabled: true},
      exitConference: {isVisible: false, isEnabled: false},
      mergeConference: {isVisible: false, isEnabled: false},
      consult: {isVisible: true, isEnabled: true},
      endConsult: {isVisible: false, isEnabled: false},
      consultTransfer: {isVisible: false, isEnabled: false},
      consultTransferConsult: {isVisible: false, isEnabled: false},
      mergeConferenceConsult: {isVisible: false, isEnabled: false},
      muteUnmuteConsult: {isVisible: false, isEnabled: false},
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: false},
      wrapup: {isVisible: false, isEnabled: true},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultReceived: false,
      isConsultInitiatedOrAccepted: false,
      isHeld: false,
      consultCallHeld: false,
    };

    const mockGetControlsVisibility = jest.fn().mockReturnValue(mockControlVisibility);

    beforeEach(() => {
      jest.mock('../src/Utils/task-util', () => ({
        ...jest.requireActual('../src/Utils/task-util'),
        getControlsVisibility: mockGetControlsVisibility,
      }));
    });

    it('should identify consulting agent from consult media participants', async () => {
      const mockStoreCC = {
        ...mockCC,
        agentConfig: {
          ...mockCC.agentConfig,
          agentId: 'currentAgentId',
        },
      };
      jest.spyOn(store, 'cc', 'get').mockReturnValue(mockStoreCC);

      const taskWithConsultMedia = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interactionId: 'consult-interaction',
          interaction: {
            ...mockCurrentTask.data.interaction,
            media: {
              main: {
                mediaResourceId: 'main',
                mType: 'telephony',
                isHold: false,
                participants: ['currentAgentId', 'customer1'],
              },
              consult: {
                mediaResourceId: 'consult',
                mType: 'consult',
                isHold: false,
                participants: ['currentAgentId', 'consultAgentId'],
              },
            },
            participants: {
              currentAgentId: {
                id: 'currentAgentId',
                name: 'Current Agent',
                pType: 'Agent',
              },
              consultAgentId: {
                id: 'consultAgentId',
                name: 'Media Based Agent',
                pType: 'Agent',
              },
              otherAgentId: {
                id: 'otherAgentId',
                name: 'Other Agent',
                pType: 'Agent',
              },
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
              },
            },
          },
        },
        on: jest.fn(),
        off: jest.fn(),
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: taskWithConsultMedia,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'currentAgentId',
        })
      );

      await waitFor(() => {
        // Should select the agent from consult media, not "Other Agent"
        expect(result.current.consultAgentName).toBe('Media Based Agent');
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Consulting agent detected: Media Based Agent consultAgentId', {
        module: 'widget-cc-task#helper.ts',
        method: 'useCallControl#extractConsultingAgent',
      });
    });

    it('should display phone number for ringing Entry Point consult', async () => {
      const mockStoreCC = {
        ...mockCC,
        agentConfig: {
          ...mockCC.agentConfig,
          agentId: 'currentAgentId',
        },
      };
      jest.spyOn(store, 'cc', 'get').mockReturnValue(mockStoreCC);

      const taskWithEPConsultRinging = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interactionId: 'ep-consult-ringing',
          interaction: {
            ...mockCurrentTask.data.interaction,
            media: {
              main: {
                mediaResourceId: 'main',
                mType: 'telephony',
                isHold: false,
                participants: ['currentAgentId', 'customer1'],
              },
              consult: {
                mediaResourceId: 'consult',
                mType: 'consult',
                isHold: false,
                participants: ['currentAgentId', 'epParticipant'],
              },
            },
            participants: {
              currentAgentId: {
                id: 'currentAgentId',
                name: 'Current Agent',
                pType: 'Agent',
              },
              epParticipant: {
                id: 'epParticipant',
                dn: '+1234567890',
                pType: 'EP',
              },
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
              },
            },
          },
        },
        on: jest.fn(),
        off: jest.fn(),
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: taskWithEPConsultRinging,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'currentAgentId',
        })
      );

      // First set the target type to entryPoint
      act(() => {
        result.current.setLastTargetType('entryPoint');
      });

      await waitFor(() => {
        // Should show the phone number while ringing
        expect(result.current.consultAgentName).toBe('+1234567890');
      });

      expect(mockLogger.info).toHaveBeenCalledWith('entryPoint consult ringing - showing phone number: +1234567890', {
        module: 'widget-cc-task#helper.ts',
        method: 'useCallControl#extractConsultingAgent',
      });
    });

    it('should display destination agent name when Entry Point consult is answered', async () => {
      const mockStoreCC = {
        ...mockCC,
        agentConfig: {
          ...mockCC.agentConfig,
          agentId: 'currentAgentId',
        },
      };
      jest.spyOn(store, 'cc', 'get').mockReturnValue(mockStoreCC);

      const taskWithEPConsultAnswered = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interactionId: 'ep-consult-answered',
          interaction: {
            ...mockCurrentTask.data.interaction,
            callProcessingDetails: {
              consultDestinationAgentName: 'Support Agent',
            },
            media: {
              main: {
                mediaResourceId: 'main',
                mType: 'telephony',
                isHold: false,
                participants: ['currentAgentId', 'customer1'],
              },
              consult: {
                mediaResourceId: 'consult',
                mType: 'consult',
                isHold: false,
                participants: ['currentAgentId', 'supportAgentId'],
              },
            },
            participants: {
              currentAgentId: {
                id: 'currentAgentId',
                name: 'Current Agent',
                pType: 'Agent',
              },
              supportAgentId: {
                id: 'supportAgentId',
                name: 'Support Agent',
                pType: 'Agent',
              },
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
              },
            },
          },
        },
        on: jest.fn(),
        off: jest.fn(),
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: taskWithEPConsultAnswered,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'currentAgentId',
        })
      );

      // First set the target type to dialNumber
      act(() => {
        result.current.setLastTargetType('dialNumber');
      });

      await waitFor(() => {
        // Should show the destination agent name once answered
        expect(result.current.consultAgentName).toBe('Support Agent');
      });

      expect(mockLogger.info).toHaveBeenCalledWith('dialNumber consult answered - showing agent name: Support Agent', {
        module: 'widget-cc-task#helper.ts',
        method: 'useCallControl#extractConsultingAgent',
      });
    });

    it('should use participant-based logic when consult media is unavailable', async () => {
      const mockStoreCC = {
        ...mockCC,
        agentConfig: {
          ...mockCC.agentConfig,
          agentId: 'currentAgentId',
        },
      };
      jest.spyOn(store, 'cc', 'get').mockReturnValue(mockStoreCC);

      const taskWithoutConsultMedia = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interactionId: 'no-consult-media',
          interaction: {
            ...mockCurrentTask.data.interaction,
            media: {
              main: {
                mediaResourceId: 'main',
                mType: 'telephony',
                isHold: false,
                participants: ['currentAgentId', 'customer1'],
              },
            },
            participants: {
              currentAgentId: {
                id: 'currentAgentId',
                name: 'Current Agent',
                pType: 'Agent',
              },
              consultAgentId: {
                id: 'consultAgentId',
                name: 'Fallback Agent',
                pType: 'Agent',
                consultState: 'consulting',
              },
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
              },
            },
          },
        },
        on: jest.fn(),
        off: jest.fn(),
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: taskWithoutConsultMedia,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'currentAgentId',
        })
      );

      await waitFor(() => {
        // Should use fallback logic and select agent with consultState="consulting"
        expect(result.current.consultAgentName).toBe('Fallback Agent');
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Consulting agent detected (fallback): Fallback Agent consultAgentId',
        {
          module: 'widget-cc-task#helper.ts',
          method: 'useCallControl#extractConsultingAgent',
        }
      );
    });

    it('should prioritize consult media over timestamp-based selection in multi-agent conference', async () => {
      const mockStoreCC = {
        ...mockCC,
        agentConfig: {
          ...mockCC.agentConfig,
          agentId: 'currentAgentId',
        },
      };
      jest.spyOn(store, 'cc', 'get').mockReturnValue(mockStoreCC);

      const taskWithMultipleAgents = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interactionId: 'multi-agent-consult',
          interaction: {
            ...mockCurrentTask.data.interaction,
            media: {
              main: {
                mediaResourceId: 'main',
                mType: 'telephony',
                isHold: false,
                participants: ['currentAgentId', 'agent2', 'customer1'],
              },
              consult: {
                mediaResourceId: 'consult',
                mType: 'consult',
                isHold: false,
                participants: ['currentAgentId', 'agent3'],
              },
            },
            participants: {
              currentAgentId: {
                id: 'currentAgentId',
                name: 'Current Agent',
                pType: 'Agent',
              },
              agent2: {
                id: 'agent2',
                name: 'Conference Agent',
                pType: 'Agent',
                consultTimestamp: 5000, // Higher timestamp
              },
              agent3: {
                id: 'agent3',
                name: 'Actual Consult Agent',
                pType: 'Agent',
                consultTimestamp: 3000, // Lower timestamp
              },
              customer1: {
                id: 'customer1',
                name: 'Customer',
                pType: 'Customer',
              },
            },
          },
        },
        on: jest.fn(),
        off: jest.fn(),
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: taskWithMultipleAgents,
          logger: mockLogger,
          featureFlags: store.featureFlags,
          deviceType: store.deviceType,
          isMuted: false,
          conferenceEnabled: true,
          agentId: 'currentAgentId',
        })
      );

      await waitFor(() => {
        // Should select agent3 from consult media, not agent2 despite higher timestamp
        expect(result.current.consultAgentName).toBe('Actual Consult Agent');
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Consulting agent detected: Actual Consult Agent agent3', {
        module: 'widget-cc-task#helper.ts',
        method: 'useCallControl#extractConsultingAgent',
      });
    });
  });
});

describe('useOutdialCall', () => {
  const logger = mockCC.LoggerProxy;

  const destination = '123456789';

  beforeEach(() => {
    global.alert = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    logger.error.mockRestore();
    logger.info.mockRestore();
  });

  it('should successfully start an outdial call without origin', async () => {
    const {result} = renderHook(() =>
      useOutdialCall({
        cc: mockOutdialCallProps,
        logger,
      })
    );

    await act(async () => {
      await result.current.startOutdial(destination);
    });

    expect(mockOutdialCallProps.startOutdial).toHaveBeenCalledWith(destination);
    expect(logger.info).toHaveBeenCalledWith('Outdial call started', 'Success');
  });

  it('should successfully start an outdial call with origin', async () => {
    const origin = '+16675260082';
    const {result} = renderHook(() =>
      useOutdialCall({
        cc: mockOutdialCallProps,
        logger,
      })
    );

    await act(async () => {
      await result.current.startOutdial(destination, origin);
    });

    expect(mockOutdialCallProps.startOutdial).toHaveBeenCalledWith(destination, origin);
    expect(logger.info).toHaveBeenCalledWith('Outdial call started', 'Success');
  });

  it('should show alert when destination is empty or only contains spaces', async () => {
    const {result} = renderHook(() =>
      useOutdialCall({
        cc: mockCC,
        logger,
      })
    );

    await act(async () => {
      await result.current.startOutdial('   ');
    });

    expect(global.alert).toHaveBeenCalledWith('Destination number is required, it cannot be empty');
    expect(mockOutdialCallProps.startOutdial).not.toHaveBeenCalled();
  });

  it('should handle errors when starting outdial call fails', async () => {
    const mockCCWithError = {
      ...mockOutdialCallProps,
      startOutdial: jest.fn().mockRejectedValue(new Error('Outdial call failed')),
    };

    const {result} = renderHook(() =>
      useOutdialCall({
        cc: mockCCWithError,
        logger,
      })
    );

    await act(async () => {
      await result.current.startOutdial(destination);
    });

    expect(mockCCWithError.startOutdial).toHaveBeenCalledWith(destination);
    expect(logger.error).toHaveBeenCalledWith('Error: Outdial call failed', {
      module: 'widget-OutdialCall#helper.ts',
      method: 'startOutdial',
    });
  });

  it('should return if no destination is provided', async () => {
    const {result} = renderHook(() =>
      useOutdialCall({
        cc: mockCC,
        logger,
      })
    );

    const invalidDestination = undefined;

    await act(async () => {
      await result.current.startOutdial(invalidDestination);
    });

    expect(mockOutdialCallProps.startOutdial).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  describe('getOutdialAniEntries', () => {
    it('should successfully fetch outdial ANI entries', async () => {
      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCCWithAni,
          logger,
        })
      );

      const aniEntries = await act(async () => {
        return await result.current.getOutdialANIEntries();
      });

      expect(mockCCWithAni.getOutdialAniEntries).toHaveBeenCalledWith({
        outdialANI: 'test-ani-id',
      });
      expect(aniEntries).toEqual({
        data: mockAniEntries,
        meta: {
          page: 0,
          pageSize: 25,
          total: 2,
          totalPages: 1,
        },
      });
    });

    it('should throw error when no outdialANIId is configured', async () => {
      const mockCCWithoutAni = {
        ...mockCC,
        agentConfig: {
          ...mockCC.agentConfig,
          outdialANIId: undefined,
        },
        getOutdialAniEntries: jest.fn(),
      };

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCCWithoutAni,
          logger,
        })
      );

      await act(async () => {
        await expect(result.current.getOutdialANIEntries()).rejects.toThrow('No OutdialANI Id received.');
      });

      expect(mockCCWithoutAni.getOutdialAniEntries).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error fetching Outdial ANI entries: Error: No OutdialANI Id received.',
        {
          module: 'useOutdialCall',
          method: 'getOutdialANIEntries',
        }
      );
    });

    it('should throw error when outdialANIId is empty string', async () => {
      const mockCCWithEmptyAni = {
        ...mockCC,
        agentConfig: {
          ...mockCC.agentConfig,
          outdialANIId: '',
        },
        getOutdialAniEntries: jest.fn(),
      };

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCCWithEmptyAni,
          logger,
        })
      );

      await act(async () => {
        await expect(result.current.getOutdialANIEntries()).rejects.toThrow('No OutdialANI Id received.');
      });

      expect(mockCCWithEmptyAni.getOutdialAniEntries).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error fetching Outdial ANI entries: Error: No OutdialANI Id received.',
        {
          module: 'useOutdialCall',
          method: 'getOutdialANIEntries',
        }
      );
    });

    it('should throw error when agentConfig is null', async () => {
      const mockCCWithNullConfig = {
        ...mockCC,
        agentConfig: null,
        getOutdialAniEntries: jest.fn(),
      };

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCCWithNullConfig,
          logger,
        })
      );

      await act(async () => {
        await expect(result.current.getOutdialANIEntries()).rejects.toThrow('No OutdialANI Id received.');
      });

      expect(mockCCWithNullConfig.getOutdialAniEntries).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error fetching Outdial ANI entries: Error: No OutdialANI Id received.',
        {
          module: 'useOutdialCall',
          method: 'getOutdialANIEntries',
        }
      );
    });

    it('should handle API errors when fetching ANI entries', async () => {
      const apiError = new Error('API request failed');
      const mockCCWithApiError = {
        ...mockCCWithAni,
        getOutdialAniEntries: jest.fn().mockRejectedValue(apiError),
      };

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCCWithApiError,
          logger,
        })
      );

      await act(async () => {
        await expect(result.current.getOutdialANIEntries()).rejects.toThrow('API request failed');
      });

      expect(mockCCWithApiError.getOutdialAniEntries).toHaveBeenCalledWith({
        outdialANI: 'test-ani-id',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error fetching Outdial ANI entries: Error: API request failed',
        {
          module: 'useOutdialCall',
          method: 'getOutdialANIEntries',
        }
      );
    });

    it('should handle empty ANI entries response', async () => {
      const mockCCWithEmptyResponse = {
        ...mockCCWithAni,
        getOutdialAniEntries: jest.fn().mockResolvedValue({
          data: [],
          meta: {
            page: 0,
            pageSize: 25,
            total: 0,
            totalPages: 0,
          },
        }),
      };

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCCWithEmptyResponse,
          logger,
        })
      );

      const aniEntries = await act(async () => {
        return await result.current.getOutdialANIEntries();
      });

      expect(mockCCWithEmptyResponse.getOutdialAniEntries).toHaveBeenCalledWith({
        outdialANI: 'test-ani-id',
      });
      expect(aniEntries).toEqual({
        data: [],
        meta: {
          page: 0,
          pageSize: 25,
          total: 0,
          totalPages: 0,
        },
      });
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      const mockCCWithTimeout = {
        ...mockCCWithAni,
        getOutdialAniEntries: jest.fn().mockRejectedValue(timeoutError),
      };

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCCWithTimeout,
          logger,
        })
      );

      await act(async () => {
        await expect(result.current.getOutdialANIEntries()).rejects.toThrow('Request timeout');
      });

      expect(mockCCWithTimeout.getOutdialAniEntries).toHaveBeenCalledWith({
        outdialANI: 'test-ani-id',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error fetching Outdial ANI entries: Error: Request timeout',
        {
          module: 'useOutdialCall',
          method: 'getOutdialANIEntries',
        }
      );
    });

    it('should pass correct parameters to getOutdialAniEntries', async () => {
      const customOutdialANIId = 'custom-ani-12345';
      const mockCCWithCustomAni = {
        ...mockCCWithAni,
        agentConfig: {
          outdialANIId: customOutdialANIId,
        },
      };

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCCWithCustomAni,
          logger,
        })
      );

      await act(async () => {
        await result.current.getOutdialANIEntries();
      });

      expect(mockCCWithCustomAni.getOutdialAniEntries).toHaveBeenCalledWith({
        outdialANI: customOutdialANIId,
      });
      expect(mockCCWithCustomAni.getOutdialAniEntries).toHaveBeenCalledTimes(1);
    });
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

  describe('isTelephonyTaskActive', () => {
    const originalTaskList = store.taskList;

    afterEach(() => {
      // Reset store.taskList to original state
      store.store.taskList = originalTaskList;
      jest.clearAllMocks();
    });

    it('should return false when task list is empty, null, or undefined', () => {
      // Test empty object
      jest.spyOn(store, 'taskList', 'get').mockReturnValue({});

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCC,
          logger,
        })
      );

      expect(result.current.isTelephonyTaskActive).toBe(false);

      // Test null/undefined
      jest.spyOn(store, 'taskList', 'get').mockReturnValue(null);

      const hookResult = renderHook(() =>
        useOutdialCall({
          cc: mockCC,
          logger,
        })
      );

      expect(hookResult.result.current.isTelephonyTaskActive).toBe(false);
    });

    it('should return true when there is a telephony task in the list', () => {
      const telephonyTask = {
        data: {
          interactionId: 'telephony-task-1',
          interaction: {
            mediaType: 'telephony',
          },
        },
      } as ITask;

      jest.spyOn(store, 'taskList', 'get').mockReturnValue({
        'telephony-task-1': telephonyTask,
      });

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCC,
          logger,
        })
      );

      expect(result.current.isTelephonyTaskActive).toBe(true);
    });

    it('should return false when there are only digital tasks', () => {
      const chatTask = {
        data: {
          interactionId: 'chat-task-1',
          interaction: {
            mediaType: 'chat',
          },
        },
      } as ITask;

      jest.spyOn(store, 'taskList', 'get').mockReturnValue({
        'chat-task-1': chatTask,
      });

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCC,
          logger,
        })
      );

      expect(result.current.isTelephonyTaskActive).toBe(false);
    });

    it('should return true when there is a mix of telephony and digital tasks', () => {
      const telephonyTask = {
        data: {
          interactionId: 'telephony-task-1',
          interaction: {
            mediaType: 'telephony',
          },
        },
      } as ITask;

      const chatTask = {
        data: {
          interactionId: 'chat-task-1',
          interaction: {
            mediaType: 'chat',
          },
        },
      } as ITask;

      jest.spyOn(store, 'taskList', 'get').mockReturnValue({
        'telephony-task-1': telephonyTask,
        'chat-task-1': chatTask,
      });

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCC,
          logger,
        })
      );

      expect(result.current.isTelephonyTaskActive).toBe(true);
    });

    it('should handle errors gracefully and return false', () => {
      // Create a task that will throw an error when accessed
      const errorTask = {
        get data() {
          throw new Error('Error accessing task data');
        },
      } as unknown as ITask;

      jest.spyOn(store, 'taskList', 'get').mockReturnValue({
        'error-task': errorTask,
      });

      const {result} = renderHook(() =>
        useOutdialCall({
          cc: mockCC,
          logger,
        })
      );

      expect(result.current.isTelephonyTaskActive).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('CC-Widgets: Task: Error checking telephony task'),
        {
          module: 'useOutdialCall',
          method: 'isTelephonyTaskActive',
        }
      );
    });

    it('should update when taskList changes', () => {
      const taskListSpy = jest.spyOn(store, 'taskList', 'get').mockReturnValue({});

      const {result, rerender} = renderHook(() =>
        useOutdialCall({
          cc: mockCC,
          logger,
        })
      );

      expect(result.current.isTelephonyTaskActive).toBe(false);

      // Add a telephony task
      const telephonyTask = {
        data: {
          interactionId: 'telephony-task-1',
          interaction: {
            mediaType: 'telephony',
          },
        },
      } as ITask;

      taskListSpy.mockReturnValue({
        'telephony-task-1': telephonyTask,
      });

      rerender();

      expect(result.current.isTelephonyTaskActive).toBe(true);

      // Remove telephony task and add digital task
      const chatTask = {
        data: {
          interactionId: 'chat-task-1',
          interaction: {
            mediaType: 'chat',
          },
        },
      } as ITask;

      taskListSpy.mockReturnValue({
        'chat-task-1': chatTask,
      });

      rerender();

      expect(result.current.isTelephonyTaskActive).toBe(false);
    });
  });
});

describe('Task Hook Error Handling and Logging', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    logger.error.mockRestore();
  });

  describe('useTaskList - error scenarios', () => {
    const mockTaskList = {
      mockId1: taskMock,
    };

    it('should handle errors in setTaskRejected callback', () => {
      const errorOnTaskDeclined = jest.fn().mockImplementation(() => {
        throw new Error('Test error in onTaskDeclined');
      });

      store.setTaskRejected = jest.fn((callback) => {
        store.onTaskRejected = callback;
      });

      renderHook(() =>
        useTaskList({
          cc: mockCC,
          deviceType: 'BROWSER',
          onTaskDeclined: errorOnTaskDeclined,
          logger,
          taskList: mockTaskList,
        })
      );

      act(() => {
        store.onTaskRejected(taskMock, 'test-reason');
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in taskRejected callback - Test error in onTaskDeclined',
        {
          module: 'useTaskList',
          method: 'setTaskRejected',
        }
      );
    });

    it('should handle errors in useTaskList useEffect setup', () => {
      const errorLogger = {
        ...logger,
        log: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      };

      // Force an error during useEffect setup
      jest.spyOn(store, 'setTaskAssigned').mockImplementation(() => {
        throw new Error('Setup error');
      });

      renderHook(() =>
        useTaskList({
          cc: mockCC,
          deviceType: 'BROWSER',
          onTaskAccepted: jest.fn(),
          logger: errorLogger,
          taskList: mockTaskList,
        })
      );

      expect(errorLogger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in useTaskList useEffect - Setup error', {
        module: 'useTaskList',
        method: 'useEffect',
      });
    });

    it('should handle synchronous errors in declineTask', () => {
      const errorTask = {
        ...taskMock,
        decline: jest.fn().mockImplementation(() => {
          throw new Error('Decline synchronous error');
        }),
      };

      const {result} = renderHook(() =>
        useTaskList({
          cc: mockCC,
          deviceType: 'BROWSER',
          logger,
          taskList: mockTaskList,
        })
      );

      act(() => {
        result.current.declineTask(errorTask);
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in declineTask - Decline synchronous error', {
        module: 'useTaskList',
        method: 'declineTask',
      });
    });
  });

  describe('useIncomingTask - error scenarios', () => {
    it('should handle errors in taskAssignCallback (consult accepted)', () => {
      const errorOnAccepted = jest.fn().mockImplementation(() => {
        throw new Error('Test error in onAccepted for consult');
      });

      const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');

      renderHook(() =>
        useIncomingTask({
          onAccepted: errorOnAccepted,
          deviceType: 'BROWSER',
          incomingTask: taskMock,
          logger,
        })
      );

      const consultCallback = setTaskCallbackSpy.mock.calls.find(
        (call) => call[0] === TASK_EVENTS.TASK_CONSULT_ACCEPTED
      )?.[1];

      act(() => {
        consultCallback();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in taskAssignCallback - Test error in onAccepted for consult',
        {
          module: 'useIncomingTask',
          method: 'taskAssignCallback',
        }
      );
    });

    it('should handle errors in taskRejectCallback', () => {
      const errorOnRejected = jest.fn().mockImplementation(() => {
        throw new Error('Test error in onRejected');
      });

      const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');

      renderHook(() =>
        useIncomingTask({
          onRejected: errorOnRejected,
          deviceType: 'BROWSER',
          incomingTask: taskMock,
          logger,
        })
      );

      const rejectCallback = setTaskCallbackSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_REJECT)?.[1];

      act(() => {
        rejectCallback();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in taskRejectCallback - Test error in onRejected',
        {
          module: 'useIncomingTask',
          method: 'taskRejectCallback',
        }
      );
    });

    it('should handle errors in useIncomingTask cleanup', () => {
      jest.spyOn(store, 'removeTaskCallback').mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      const {unmount} = renderHook(() =>
        useIncomingTask({
          onAccepted: jest.fn(),
          deviceType: 'BROWSER',
          incomingTask: taskMock,
          logger,
        })
      );

      act(() => {
        unmount();
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in useIncomingTask cleanup - Cleanup error', {
        module: 'useIncomingTask',
        method: 'useEffect_cleanup',
      });
    });

    it('should handle errors in useIncomingTask useEffect setup', () => {
      jest.spyOn(store, 'setTaskCallback').mockImplementation(() => {
        throw new Error('Setup error in useEffect');
      });

      renderHook(() =>
        useIncomingTask({
          onAccepted: jest.fn(),
          deviceType: 'BROWSER',
          incomingTask: taskMock,
          logger,
        })
      );

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in useIncomingTask useEffect - Setup error in useEffect',
        {
          module: 'useIncomingTask',
          method: 'useEffect',
        }
      );
    });

    it('should handle synchronous errors in reject', () => {
      const errorTask = {
        ...taskMock,
        decline: jest.fn().mockImplementation(() => {
          throw new Error('Reject synchronous error');
        }),
      };

      const {result} = renderHook(() =>
        useIncomingTask({
          incomingTask: errorTask,
          deviceType: 'BROWSER',
          logger,
        })
      );

      act(() => {
        result.current.reject();
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in reject - Reject synchronous error', {
        module: 'useIncomingTask',
        method: 'reject',
      });
    });
  });

  describe('useCallControl - error scenarios', () => {
    const mockTaskWithInteraction = {
      ...mockTask,
      data: {
        ...mockTask.data,
        interactionId: 'interaction1',
        interaction: {
          participants: {
            agent1: {
              id: 'agent1',
              pType: 'Agent',
              joinTimestamp: 1234567890,
            },
          },
          mediaType: 'telephony',
        },
        isConferenceInProgress: false,
      },
      hold: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
      wrapup: jest.fn().mockResolvedValue(undefined),
      pauseRecording: jest.fn().mockResolvedValue(undefined),
      resumeRecording: jest.fn().mockResolvedValue(undefined),
      toggleMute: jest.fn().mockResolvedValue(undefined),
      consult: jest.fn().mockResolvedValue(undefined),
      endConsult: jest.fn().mockResolvedValue(undefined),
      consultTransfer: jest.fn().mockResolvedValue(undefined),
      transfer: jest.fn().mockResolvedValue(undefined),
      cancelAutoWrapupTimer: jest.fn(),
    };

    beforeAll(() => {
      store.store.cc = {
        ...mockCC,
        agentConfig: {
          agentId: 'agent1',
        },
      } as IContactCenter;
    });

    it('should handle errors in resumeCallback', () => {
      const errorOnHoldResume = jest.fn().mockImplementation(() => {
        throw new Error('Test error in onHoldResume');
      });

      const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');

      renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithInteraction,
          onHoldResume: errorOnHoldResume,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      const resumeCallback = setTaskCallbackSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_RESUME)?.[1];

      act(() => {
        resumeCallback();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in resumeCallback - Test error in onHoldResume',
        {
          module: 'useCallControl',
          method: 'resumeCallback',
        }
      );
    });

    it('should handle errors in endCallCallback', () => {
      const errorOnEnd = jest.fn().mockImplementation(() => {
        throw new Error('Test error in onEnd');
      });

      const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');

      renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithInteraction,
          onEnd: errorOnEnd,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      const endCallback = setTaskCallbackSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_END)?.[1];

      act(() => {
        endCallback();
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in endCallCallback - Test error in onEnd', {
        module: 'useCallControl',
        method: 'endCallCallback',
      });
    });

    it('should handle errors in wrapupCallCallback', () => {
      const errorOnWrapUp = jest.fn().mockImplementation(() => {
        throw new Error('Test error in onWrapUp');
      });

      const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');

      renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithInteraction,
          onWrapUp: errorOnWrapUp,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      const wrapupCallback = setTaskCallbackSpy.mock.calls.find((call) => call[0] === TASK_EVENTS.AGENT_WRAPPEDUP)?.[1];

      act(() => {
        wrapupCallback({wrapUpAuxCodeId: '123'});
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in wrapupCallCallback - Test error in onWrapUp',
        {
          module: 'useCallControl',
          method: 'wrapupCallCallback',
        }
      );
    });

    it('should handle errors in pauseRecordingCallback', () => {
      const errorOnRecordingToggle = jest.fn().mockImplementation(() => {
        throw new Error('Test error in pauseRecording');
      });

      const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');

      renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithInteraction,
          onRecordingToggle: errorOnRecordingToggle,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      const pauseCallback = setTaskCallbackSpy.mock.calls.find(
        (call) => call[0] === TASK_EVENTS.TASK_RECORDING_PAUSED
      )?.[1];

      act(() => {
        pauseCallback();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in pauseRecordingCallback - Test error in pauseRecording',
        {
          module: 'useCallControl',
          method: 'pauseRecordingCallback',
        }
      );
    });

    it('should handle errors in resumeRecordingCallback', () => {
      const errorOnRecordingToggle = jest.fn().mockImplementation(() => {
        throw new Error('Test error in resumeRecording');
      });

      const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');

      renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithInteraction,
          onRecordingToggle: errorOnRecordingToggle,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      const resumeCallback = setTaskCallbackSpy.mock.calls.find(
        (call) => call[0] === TASK_EVENTS.TASK_RECORDING_RESUMED
      )?.[1];

      act(() => {
        resumeCallback();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in resumeRecordingCallback - Test error in resumeRecording',
        {
          module: 'useCallControl',
          method: 'resumeRecordingCallback',
        }
      );
    });

    it('should handle synchronous errors in toggleRecording', () => {
      const errorTask = {
        ...mockTaskWithInteraction,
        pauseRecording: jest.fn().mockImplementation(() => {
          throw new Error('toggleRecording synchronous error');
        }),
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: errorTask,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      act(() => {
        result.current.toggleRecording();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in toggleRecording - toggleRecording synchronous error',
        {
          module: 'useCallControl',
          method: 'toggleRecording',
        }
      );
    });

    it('should handle synchronous errors in toggleMute', () => {
      mockGetControlsVisibility.mockImplementation(() => ({
        muteUnmute: {isVisible: true, isEnabled: true},
        muteUnmuteConsult: {isVisible: false, isEnabled: false},
        holdResume: {isVisible: true, isEnabled: true},
        transfer: {isVisible: true, isEnabled: true},
        consult: {isVisible: true, isEnabled: true},
        end: {isVisible: true, isEnabled: true},
        accept: {isVisible: true, isEnabled: true},
        decline: {isVisible: true, isEnabled: true},
        pauseResumeRecording: {isVisible: true, isEnabled: true},
        recordingIndicator: {isVisible: true, isEnabled: true},
        wrapup: {isVisible: false, isEnabled: false},
        endConsult: {isVisible: false, isEnabled: false},
        conference: {isVisible: false, isEnabled: false},
        consultTransfer: {isVisible: false, isEnabled: false},
        mergeConference: {isVisible: false, isEnabled: false},
        mergeConferenceConsult: {isVisible: false, isEnabled: false},
        consultTransferConsult: {isVisible: false, isEnabled: false},
        switchToMainCall: {isVisible: false, isEnabled: false},
        switchToConsult: {isVisible: false, isEnabled: false},
        exitConference: {isVisible: false, isEnabled: false},
        isConferenceInProgress: false,
        isConsultInitiated: false,
        isConsultInitiatedAndAccepted: false,
        isConsultInitiatedOrAccepted: false,
        isConsultReceived: false,
        isHeld: false,
        consultCallHeld: false,
      }));

      const errorTask = {
        ...mockTaskWithInteraction,
        toggleMute: jest.fn().mockImplementation(() => {
          throw new Error('toggleMute synchronous error');
        }),
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: errorTask,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      act(() => {
        result.current.toggleMute();
      });

      expect(logger.error).toHaveBeenCalledWith('toggleMute failed: Error: toggleMute synchronous error', {
        module: 'useCallControl',
        method: 'toggleMute',
      });
    });

    it('should handle synchronous errors in endCall', () => {
      const errorTask = {
        ...mockTaskWithInteraction,
        end: jest.fn().mockImplementation(() => {
          throw new Error('endCall synchronous error');
        }),
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: errorTask,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      act(() => {
        result.current.endCall();
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in endCall - endCall synchronous error', {
        module: 'useCallControl',
        method: 'endCall',
      });
    });

    it('should handle synchronous errors in wrapupCall', () => {
      const errorTask = {
        ...mockTaskWithInteraction,
        wrapup: jest.fn().mockImplementation(() => {
          throw new Error('wrapupCall synchronous error');
        }),
      };

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: errorTask,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      act(() => {
        result.current.wrapupCall('test reason', '123');
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error in wrapupCall - wrapupCall synchronous error',
        {
          module: 'useCallControl',
          method: 'wrapupCall',
        }
      );
    });

    it('should handle errors in getAddressBookEntries', async () => {
      store.getAddressBookEntries = jest.fn().mockRejectedValue(new Error('Address book error'));

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithInteraction,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      let response;
      await act(async () => {
        response = await result.current.getAddressBookEntries({page: 0, pageSize: 10, search: ''});
      });

      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Task: Error fetching address book entries - Address book error',
        {
          module: 'useCallControl',
          method: 'getAddressBookEntries',
        }
      );
      expect(response).toEqual({data: [], meta: {page: 0, totalPages: 0}});
    });

    it('should handle errors in getEntryPoints', async () => {
      store.getEntryPoints = jest.fn().mockRejectedValue(new Error('Entry points error'));

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithInteraction,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      let response;
      await act(async () => {
        response = await result.current.getEntryPoints({page: 0, pageSize: 10, search: ''});
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error fetching entry points - Entry points error', {
        module: 'useCallControl',
        method: 'getEntryPoints',
      });
      expect(response).toEqual({data: [], meta: {page: 0, totalPages: 0}});
    });

    it('should handle errors in getQueuesFetcher', async () => {
      store.getQueues = jest.fn().mockRejectedValue(new Error('Queues error'));

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithInteraction,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      let response;
      await act(async () => {
        response = await result.current.getQueuesFetcher({page: 0, pageSize: 10, search: ''});
      });

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error fetching queues (paginated) - Queues error', {
        module: 'useCallControl',
        method: 'getQueuesFetcher',
      });
      expect(response).toEqual({data: [], meta: {page: 0, totalPages: 0}});
    });

    it('should set startTimestamp when conditions are met', () => {
      const taskWithJoinTimestamp = {
        ...mockTaskWithInteraction,
        data: {
          ...mockTaskWithInteraction.data,
          interaction: {
            ...mockTaskWithInteraction.data.interaction,
            participants: {
              agent1: {
                id: 'agent1',
                pType: 'Agent',
                joinTimestamp: 9999999999,
              },
            },
          },
        },
      };

      store.store.cc = {
        ...mockCC,
        agentConfig: {
          agentId: 'agent1',
        },
      } as IContactCenter;

      const {result} = renderHook(() =>
        useCallControl({
          currentTask: taskWithJoinTimestamp,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      expect(result.current.startTimestamp).toBe(9999999999);
    });

    it('should handle errors in auto wrapup timer initialization', () => {
      const mockAutoWrapup = {
        getTimeLeftSeconds: jest.fn().mockImplementation(() => {
          throw new Error('Auto wrapup timer error');
        }),
      };

      mockGetControlsVisibility.mockImplementation(() => ({
        muteUnmute: {isVisible: true, isEnabled: true},
        muteUnmuteConsult: {isVisible: false, isEnabled: false},
        holdResume: {isVisible: true, isEnabled: true},
        transfer: {isVisible: true, isEnabled: true},
        consult: {isVisible: true, isEnabled: true},
        end: {isVisible: true, isEnabled: true},
        accept: {isVisible: true, isEnabled: true},
        decline: {isVisible: true, isEnabled: true},
        pauseResumeRecording: {isVisible: true, isEnabled: true},
        recordingIndicator: {isVisible: true, isEnabled: true},
        wrapup: {isVisible: true, isEnabled: true},
        endConsult: {isVisible: false, isEnabled: false},
        conference: {isVisible: false, isEnabled: false},
        consultTransfer: {isVisible: false, isEnabled: false},
        mergeConference: {isVisible: false, isEnabled: false},
        mergeConferenceConsult: {isVisible: false, isEnabled: false},
        consultTransferConsult: {isVisible: false, isEnabled: false},
        switchToMainCall: {isVisible: false, isEnabled: false},
        switchToConsult: {isVisible: false, isEnabled: false},
        exitConference: {isVisible: false, isEnabled: false},
        isConferenceInProgress: false,
        isConsultInitiated: false,
        isConsultInitiatedAndAccepted: false,
        isConsultInitiatedOrAccepted: false,
        isConsultReceived: false,
        isHeld: false,
        consultCallHeld: false,
      }));

      const taskWithAutoWrapup = {
        ...mockTaskWithInteraction,
        autoWrapup: mockAutoWrapup,
      };

      renderHook(() =>
        useCallControl({
          currentTask: taskWithAutoWrapup,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: CallControl: Error initializing auto wrap-up timer', {
        module: 'widget-cc-task#helper.ts',
        method: 'useCallControl#autoWrapupTimer',
        error: expect.any(Error),
      });
    });

    it('should clear interval on unmount for auto wrapup timer', () => {
      jest.useFakeTimers();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const mockAutoWrapup = {
        getTimeLeftSeconds: jest.fn().mockReturnValue(30),
      };

      mockGetControlsVisibility.mockImplementation(() => ({
        muteUnmute: {isVisible: true, isEnabled: true},
        muteUnmuteConsult: {isVisible: false, isEnabled: false},
        holdResume: {isVisible: true, isEnabled: true},
        transfer: {isVisible: true, isEnabled: true},
        consult: {isVisible: true, isEnabled: true},
        end: {isVisible: true, isEnabled: true},
        accept: {isVisible: true, isEnabled: true},
        decline: {isVisible: true, isEnabled: true},
        pauseResumeRecording: {isVisible: true, isEnabled: true},
        recordingIndicator: {isVisible: true, isEnabled: true},
        wrapup: {isVisible: true, isEnabled: true},
        endConsult: {isVisible: false, isEnabled: false},
        conference: {isVisible: false, isEnabled: false},
        consultTransfer: {isVisible: false, isEnabled: false},
        mergeConference: {isVisible: false, isEnabled: false},
        mergeConferenceConsult: {isVisible: false, isEnabled: false},
        consultTransferConsult: {isVisible: false, isEnabled: false},
        switchToMainCall: {isVisible: false, isEnabled: false},
        switchToConsult: {isVisible: false, isEnabled: false},
        exitConference: {isVisible: false, isEnabled: false},
        isConferenceInProgress: false,
        isConsultInitiated: false,
        isConsultInitiatedAndAccepted: false,
        isConsultInitiatedOrAccepted: false,
        isConsultReceived: false,
        isHeld: false,
        consultCallHeld: false,
      }));

      const taskWithAutoWrapup = {
        ...mockTaskWithInteraction,
        autoWrapup: mockAutoWrapup,
      };

      const {unmount} = renderHook(() =>
        useCallControl({
          currentTask: taskWithAutoWrapup,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      act(() => {
        unmount();
      });

      expect(clearIntervalSpy).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should handle worker cleanup with non-function postMessage', () => {
      const mockTaskWithHold = {
        ...mockTaskWithInteraction,
        data: {
          ...mockTaskWithInteraction.data,
          interaction: {
            ...mockTaskWithInteraction.data.interaction,
            callProcessingDetails: {
              mainCall: {
                events: [{type: 'Hold', eventTime: Date.now() - 5000}],
              },
            },
          },
        },
      };

      // Mock Worker with non-function postMessage
      const mockWorker = {
        postMessage: undefined,
        terminate: jest.fn(),
        onmessage: null,
      };

      global.Worker = jest.fn().mockImplementation(() => mockWorker);
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock');

      const {unmount} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithHold,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      act(() => {
        unmount();
      });

      // Should not throw error when postMessage is not a function
      // Test passes if no error is thrown during unmount
    });

    it('should handle worker cleanup with non-function terminate', () => {
      const mockTaskWithHold = {
        ...mockTaskWithInteraction,
        data: {
          ...mockTaskWithInteraction.data,
          interaction: {
            ...mockTaskWithInteraction.data.interaction,
            callProcessingDetails: {
              mainCall: {
                events: [{type: 'Hold', eventTime: Date.now() - 5000}],
              },
            },
          },
        },
      };

      // Mock Worker with non-function terminate
      const mockWorker = {
        postMessage: jest.fn(),
        terminate: undefined,
        onmessage: null,
      };

      global.Worker = jest.fn().mockImplementation(() => mockWorker);
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock');

      const {unmount} = renderHook(() =>
        useCallControl({
          currentTask: mockTaskWithHold,
          logger,
          deviceType: 'BROWSER',
          featureFlags: {},
          isMuted: false,
          conferenceEnabled: false,
          agentId: 'agent1',
        })
      );

      act(() => {
        unmount();
      });
    });
  });
});
