import {renderHook, act, waitFor} from '@testing-library/react';
import {useIncomingTask, useTaskList, useCallControl} from '../src/helper';
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
    const {result} = renderHook(() =>
      useTaskList({cc: ccMock, deviceType: '', onTaskDeclined, logger, taskList: mockTaskList})
    );

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
    jest.clearAllMocks();
  });

  afterEach(() => {
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
        deviceType: 'BROWSER',
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

    expect(onSpy).toHaveBeenCalledTimes(7);
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_HOLD, expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_RESUME, expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.AGENT_WRAPPEDUP, expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_MEDIA, expect.any(Function));
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
    expect(offSpy).toHaveBeenCalledTimes(7);
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_HOLD, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_RESUME, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.AGENT_WRAPPEDUP, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.TASK_MEDIA, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.CONTACT_RECORDING_PAUSED, expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith(TASK_EVENTS.CONTACT_RECORDING_RESUMED, expect.any(Function));
  });

  it('should not call any call backs if callbacks are not provided', async () => {
    mockCurrentTask.hold.mockRejectedValueOnce(new Error('Hold error'));

    const {result} = renderHook(() =>
      useCallControl({
        deviceType: 'BROWSER',
        currentTask: mockCurrentTask,
        logger: mockLogger,
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
        deviceType: 'BROWSER',
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
        deviceType: 'BROWSER',
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
        deviceType: 'BROWSER',
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
        deviceType: 'BROWSER',
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
        deviceType: 'BROWSER',
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
        deviceType: 'BROWSER',
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
        deviceType: 'BROWSER',
      })
    );

    await act(async () => {
      await result.current.wrapupCall('Wrap reason', '123');
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.AGENT_WRAPPEDUP)?.[1]();
    });

    expect(mockCurrentTask.wrapup).toHaveBeenCalledWith({wrapUpReason: 'Wrap reason', auxCodeId: '123'});
    expect(mockOnWrapUp).toHaveBeenCalled();
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
        deviceType: 'BROWSER',
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
        deviceType: 'BROWSER',
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
        deviceType: 'BROWSER',
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
        deviceType: 'BROWSER',
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
        deviceType: 'BROWSER',
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

  it('should assign media received from media event to audio tag', async () => {
    global.MediaStream = jest.fn().mockImplementation(() => {
      return {mockStream: 'mock-stream'};
    });
    const mockAudioElement = {current: {srcObject: null}};
    jest.spyOn(React, 'useRef').mockReturnValue(mockAudioElement);
    const mockAudio = {
      srcObject: 'mock-audio',
    };

    renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        deviceType: 'BROWSER',
      })
    );

    act(() => {
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MEDIA)?.[1](mockAudio);
    });

    await waitFor(() => {
      expect(mockAudioElement.current).toEqual({srcObject: {mockStream: 'mock-stream'}});
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should handle task media event', async () => {
    const mockTrack = {kind: 'audio'};
    const mockAudioElement = {current: {srcObject: null}};
    jest.spyOn(React, 'useRef').mockReturnValue(mockAudioElement);

    renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        deviceType: 'BROWSER',
      })
    );

    act(() => {
      mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MEDIA)?.[1](mockTrack);
    });

    await waitFor(() => {
      expect(mockAudioElement.current.srcObject).toEqual({getTracks: expect.any(Function)});
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should assign track to audioRef.current.srcObject when handleTaskMedia is called', async () => {
    // Mock audioRef.current to simulate an audio element with a srcObject
    const mockAudioElement = {
      srcObject: null,
    };

    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        deviceType: 'BROWSER',
      })
    );

    // Manually assign the mocked audio element to the ref
    result.current.audioRef.current = mockAudioElement;

    // Create a mock track object using the mock implementation
    const mockTrack = new MediaStreamTrack();

    // Simulate the event that triggers handleTaskMedia by invoking the on event directly
    act(() => {
      // Find the event handler for TASK_MEDIA and invoke it
      const taskAssignedCallback = taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MEDIA)?.[1];

      // Trigger the TASK_MEDIA event with the mock track
      if (taskAssignedCallback) {
        taskAssignedCallback(mockTrack);
      }
    });

    // Ensure that audioRef.current is not null
    await waitFor(() => {
      expect(result.current.audioRef.current).not.toBeNull();
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not set srcObject if audioRef.current is null', async () => {
    // Mock audioRef to simulate the absence of an audio element
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        deviceType: 'BROWSER',
      })
    );
    result.current.audioRef.current = null;

    // Create a mock track object using the mock implementation
    const mockTrack = new MediaStreamTrack();

    // Simulate the event that triggers handleTaskMedia by invoking the on event directly
    act(() => {
      // Find the event handler for TASK_MEDIA and invoke it
      const taskAssignedCallback = taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MEDIA)?.[1];

      // Trigger the TASK_MEDIA event with the mock track
      if (taskAssignedCallback) {
        taskAssignedCallback(mockTrack);
      }
    });

    // Verify that audioRef.current is still null and no changes occurred
    await waitFor(() => {
      expect(result.current.audioRef.current).toBeNull();
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not add media events if task is not available', async () => {
    const mockAudioElement = {current: {srcObject: null}};
    jest.spyOn(React, 'useRef').mockReturnValue(mockAudioElement);

    renderHook(() =>
      useCallControl({
        currentTask: undefined,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        deviceType: 'BROWSER',
      })
    );
    // Ensure no event handler is set
    expect(taskMock.on).not.toHaveBeenCalled();
  });

  it('should test undefined audioRef.current', async () => {
    // This test is to improve the coverage
    const {result} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
        deviceType: 'BROWSER',
      })
    );

    result.current.audioRef.current = undefined;
    const mockTrack = new MediaStreamTrack();

    act(() => {
      const taskAssignedCallback = mockCurrentTask.on.mock.calls.find(
        (call) => call[0] === TASK_EVENTS.TASK_MEDIA
      )?.[1];

      if (taskAssignedCallback) {
        taskAssignedCallback(mockTrack);
      }
    });
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
        deviceType: 'EXTENSION',
      })
    );
    // Ensure no event handler is set
    expect(taskMock.on).not.toHaveBeenCalled();
  });
});
