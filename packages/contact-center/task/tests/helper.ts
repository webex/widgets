import {renderHook, act, waitFor} from '@testing-library/react';
import {useIncomingTask, useTaskList, useCallControl, useOutdialCall} from '../src/helper';
import {TASK_EVENTS} from '@webex/cc-store';
import store from '@webex/cc-store';
import React from 'react';

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

const logger = {
  error: jest.fn(),
};

// Override the wrapupCodes property before your tests run
beforeAll(() => {
  store.setWrapupCodes([{id: '123', name: 'Wrap reason'}]);
});

describe('useIncomingTask Hook', () => {
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
        onDeclined: onTaskDeclined,
        deviceType: 'BROWSER',
        logger,
      })
    );
    expect(onSpy).not.toHaveBeenCalled();
  });

  it('should  setup event listeners for the incoming call', async () => {
    store.setTaskList([taskMock]);
    const onSpy = jest.spyOn(taskMock, 'on');
    const offSpy = jest.spyOn(taskMock, 'off');
    const setTaskCallbackSpy = jest.spyOn(store, 'setTaskCallback');
    const removeTaskCallbackSpy = jest.spyOn(store, 'removeTaskCallback');

    const {unmount} = renderHook(() =>
      useIncomingTask({
        incomingTask: taskMock,
        onAccepted: onTaskAccepted,
        onDeclined: onTaskDeclined,
        deviceType: 'BROWSER',
        logger,
      })
    );

    expect(setTaskCallbackSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function), 'interaction1');
    expect(setTaskCallbackSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_REJECT, expect.any(Function), 'interaction1');
    expect(onSpy).toHaveBeenCalledTimes(2);
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_REJECT, expect.any(Function));

    act(() => {
      unmount();
    });

    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function), 'interaction1');
    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_REJECT, expect.any(Function), 'interaction1');
    expect(offSpy).toHaveBeenCalledTimes(2);
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_REJECT, expect.any(Function));
  });

  it('should  call onAccepted if it is provided', async () => {
    renderHook(() =>
      useIncomingTask({
        incomingTask: taskMock,
        onAccepted: onTaskAccepted,
        onDeclined: onTaskDeclined,
        deviceType: 'BROWSER',
        logger,
      })
    );

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_ASSIGNED)?.[1]();
    });

    await waitFor(() => {
      expect(onTaskAccepted).toHaveBeenCalled();
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should call onDeclined if it is provided', async () => {
    renderHook(() =>
      useIncomingTask({
        incomingTask: taskMock,
        onAccepted: onTaskAccepted,
        onDeclined: onTaskDeclined,
        deviceType: 'BROWSER',
        logger,
      })
    );

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_REJECT)?.[1]();
    });

    await waitFor(() => {
      expect(onTaskDeclined).toHaveBeenCalled();
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should return if there is no taskId for incoming task', async () => {
    const noIdTask = {
      data: {},
      accept: jest.fn(),
      decline: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };
    const {result} = renderHook(() =>
      useIncomingTask({
        incomingTask: noIdTask,
        onAccepted: onTaskAccepted,
        onDeclined: onTaskDeclined,
        deviceType: 'BROWSER',
        logger,
      })
    );

    act(() => {
      result.current.accept();
    });

    await waitFor(() => {
      expect(onTaskAccepted).not.toHaveBeenCalled();
    });

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_REJECT)?.[1]();
    });

    await waitFor(() => {
      expect(onTaskDeclined).not.toHaveBeenCalled();
    });
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
    expect(logger.error).toHaveBeenCalledWith('Error accepting incoming task: Error', {
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
      useIncomingTask({incomingTask: failingTask, onDeclined, deviceType: 'BROWSER', logger})
    );

    act(() => {
      result.current.decline();
    });

    await waitFor(() => {
      expect(failingTask.decline).toHaveBeenCalled();
    });

    // Ensure errors are logged in the console
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error declining incoming task: Error', {
      module: 'widget-cc-task#helper.ts',
      method: 'useIncomingTask#decline',
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
    renderHook(() => useTaskList({cc: ccMock, deviceType: '', onTaskAccepted, logger, taskList: mockTaskList}));

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_ASSIGNED)?.[1]();
    });

    await waitFor(() => {
      expect(onTaskAccepted).toHaveBeenCalledWith(taskMock);
    });

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
    renderHook(() => useTaskList({cc: ccMock, deviceType: '', onTaskDeclined, logger, taskList: mockTaskList}));

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_REJECT)?.[1]();
    });

    await waitFor(() => {
      expect(onTaskDeclined).toHaveBeenCalledWith(taskMock);
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
    expect(logger.error).toHaveBeenCalledWith('Error accepting task: Error', {
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
    expect(logger.error).toHaveBeenCalledWith('Error declining task: Error', {
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
  };

  const mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
  };

  const mockOnHoldResume = jest.fn();
  const mockOnEnd = jest.fn();
  const mockOnWrapUp = jest.fn();

  beforeEach(() => {
    store.setTaskList([mockCurrentTask]);
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
    const removeTaskCallbackSpy = jest.spyOn(store, 'removeTaskCallback');
    const onSpy = jest.spyOn(mockCurrentTask, 'on');
    const offSpy = jest.spyOn(mockCurrentTask, 'off');

    const {unmount} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
      })
    );

    expect(setTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.TASK_HOLD,
      expect.any(Function),
      'someMockInteractionId'
    );
    expect(setTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.TASK_RESUME,
      expect.any(Function),
      'someMockInteractionId'
    );
    expect(setTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.TASK_END,
      expect.any(Function),
      'someMockInteractionId'
    );
    expect(setTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.AGENT_WRAPPEDUP,
      expect.any(Function),
      'someMockInteractionId'
    );
    expect(setTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.CONTACT_RECORDING_PAUSED,
      expect.any(Function),
      'someMockInteractionId'
    );
    expect(setTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.CONTACT_RECORDING_RESUMED,
      expect.any(Function),
      'someMockInteractionId'
    );

    expect(onSpy).toHaveBeenCalledTimes(6);
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_HOLD, expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_RESUME, expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.AGENT_WRAPPEDUP, expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.CONTACT_RECORDING_PAUSED, expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.CONTACT_RECORDING_RESUMED, expect.any(Function));

    // Unmount the component
    act(() => {
      unmount();
    });

    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.TASK_HOLD,
      expect.any(Function),
      'someMockInteractionId'
    );
    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.TASK_RESUME,
      expect.any(Function),
      'someMockInteractionId'
    );
    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.TASK_END,
      expect.any(Function),
      'someMockInteractionId'
    );
    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.AGENT_WRAPPEDUP,
      expect.any(Function),
      'someMockInteractionId'
    );
    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.CONTACT_RECORDING_PAUSED,
      expect.any(Function),
      'someMockInteractionId'
    );
    expect(removeTaskCallbackSpy).toHaveBeenCalledWith(
      TASK_EVENTS.CONTACT_RECORDING_RESUMED,
      expect.any(Function),
      'someMockInteractionId'
    );
    expect(offSpy).toHaveBeenCalledTimes(6);
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_HOLD, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_RESUME, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.AGENT_WRAPPEDUP, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.CONTACT_RECORDING_PAUSED, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.CONTACT_RECORDING_RESUMED, expect.any(Function));
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

  it('should call holdResume with hold=true and handle success', async () => {
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
      })
    );

    await act(async () => {
      await result.current.toggleHold(true);
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_HOLD)?.[1]();
    });

    expect(mockCurrentTask.hold).toHaveBeenCalled();
    expect(mockOnHoldResume).toHaveBeenCalled();
  });

  it('should call holdResume with hold=false and handle success', async () => {
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
      })
    );

    await act(async () => {
      await result.current.toggleHold(false);
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_RESUME)?.[1]();
    });

    expect(mockCurrentTask.resume).toHaveBeenCalled();
    expect(mockOnHoldResume).toHaveBeenCalled();
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
      })
    );

    await act(async () => {
      await result.current.toggleHold(true);
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_HOLD)?.[1]();
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Error holding call: Error: Hold error', expect.any(Object));
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
      })
    );

    await act(async () => {
      await result.current.toggleHold(false);
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_RESUME)?.[1]();
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Error resuming call: Error: Resume error', expect.any(Object));
  });

  it('should call endCall and handle success', async () => {
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
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
      })
    );

    await act(async () => {
      await result.current.endCall();
    });

    expect(mockCurrentTask.end).toHaveBeenCalled();
    expect(mockOnEnd).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith('Error ending call: Error: End error', expect.any(Object));
  });

  it('should call wrapupCall ', async () => {
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
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
      })
    );

    await expect(result.current.transferCall('test_transfer', 'agent')).rejects.toThrow(transferError);
    expect(transferSpy).toHaveBeenCalledWith({to: 'test_transfer', destinationType: 'agent'});
    expect(mockLogger.error).toHaveBeenCalledWith('Error transferring call: Error: Transfer failed', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#transferCall',
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
      })
    );

    // Wait for the consultAgentName to be updated
    await waitFor(() => {
      expect(result.current.consultAgentName).toBe('Current Agent');
    });

    // Verify the logger was called with the correct message
    expect(mockLogger.info).toHaveBeenCalledWith('Consulting agent detected: Current Agent currentAgentId', {
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
      })
    );

    expect(result.current.holdTime).toEqual(0);
  });

  it('should start the timer when isHeld is true', () => {
    const mockPostMessage = jest.fn();
    (global.Worker as jest.Mock).mockImplementation(() => ({
      postMessage: mockPostMessage,
      terminate: jest.fn(),
      onmessage: null,
    }));

    const {result, rerender} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
      })
    );

    act(() => {
      // Update isHeld to true
      result.current.setIsHeld(true);
    });

    rerender();

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'start',
      startTime: expect.any(Number),
    });
  });

  it('should stop the timer when isHeld is false', () => {
    const mockPostMessage = jest.fn();
    (global.Worker as jest.Mock).mockImplementation(() => ({
      postMessage: mockPostMessage,
      terminate: jest.fn(),
      onmessage: null,
    }));

    const {rerender} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
      })
    );

    // Update isHeld to false
    rerender();

    expect(mockPostMessage).toHaveBeenCalledWith({type: 'stop'});
  });

  it('should update holdTime when the worker sends elapsedTime', () => {
    let onmessageCallback: ((event: MessageEvent) => void) | null = null;

    (global.Worker as jest.Mock).mockImplementation(() => ({
      postMessage: jest.fn(),
      terminate: jest.fn(),
      set onmessage(callback) {
        onmessageCallback = callback;
      },
    }));

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
      })
    );

    // Simulate a message from the worker
    act(() => {
      onmessageCallback?.({
        data: {type: 'elapsedTime', elapsedTime: 5},
      } as MessageEvent);
    });

    expect(result.current.holdTime).toBe(5);
  });

  it('should reset holdTime to 0 when the worker sends stop', () => {
    let onmessageCallback: ((event: MessageEvent) => void) | null = null;

    (global.Worker as jest.Mock).mockImplementation(() => ({
      postMessage: jest.fn(),
      terminate: jest.fn(),
      set onmessage(callback) {
        onmessageCallback = callback;
      },
    }));

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
      })
    );

    // Simulate a message from the worker
    act(() => {
      onmessageCallback?.({
        data: {type: 'elapsedTime', elapsedTime: 5},
      } as MessageEvent);
    });

    expect(result.current.holdTime).toBe(5);

    // Simulate a stop message
    act(() => {
      onmessageCallback?.({
        data: {type: 'stop'},
      } as MessageEvent);
    });

    expect(result.current.holdTime).toBe(0);
  });

  it('should terminate the worker on unmount', () => {
    const mockTerminate = jest.fn();

    (global.Worker as jest.Mock).mockImplementation(() => ({
      postMessage: jest.fn(),
      terminate: mockTerminate,
      onmessage: null,
    }));

    const {unmount} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
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

  it('should load contact service queues successfully', async () => {
    const dummyQueues = [
      {id: 'q1', name: 'Queue1'},
      {id: 'q2', name: 'Queue2'},
    ];
    const getContactServiceQueuesSpy = jest.spyOn(store, 'getContactServiceQueues').mockResolvedValue(dummyQueues);

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        logger: mockLogger,
      })
    );

    await act(async () => {
      await result.current.loadContactServiceQueues();
    });

    expect(result.current.contactServiceQueues).toEqual(dummyQueues);
    getContactServiceQueuesSpy.mockRestore();
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
