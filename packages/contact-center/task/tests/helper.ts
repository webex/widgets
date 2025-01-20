import {renderHook, act, waitFor} from '@testing-library/react';
import {useIncomingTask, useTaskList, useCallControl} from '../src/helper';
import {TASK_EVENTS} from '../src/task.types';
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
const onTaskAccepted = jest.fn();
const onTaskDeclined = jest.fn();

const logger = {
  error: jest.fn(),
};

describe('useIncomingTask Hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
    logger.error.mockRestore();
  });

  it('should register task events for the current task', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER', logger})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    await waitFor(() => {
      expect(taskMock.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(taskMock.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not call onAccepted if it is not provided', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted: null, onDeclined: null, selectedLoginOption: 'BROWSER', logger})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    act(() => {
      result.current.accept();
    });

    await waitFor(() => {
      expect(onAccepted).not.toHaveBeenCalled();
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not call onDeclined if it is not provided', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted: null, onDeclined: null, selectedLoginOption: 'BROWSER', logger})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    act(() => {
      result.current.decline();
    });

    await waitFor(() => {
      expect(onDeclined).not.toHaveBeenCalled();
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should clean up task events on task change or unmount', async () => {
    const {result, unmount} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER', logger})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    unmount();

    await waitFor(() => {
      expect(taskMock.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(ccMock.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should assign media received from media event to audio tag', async () => {
    global.MediaStream = jest.fn().mockImplementation((tracks) => {
      return {mockStream: 'mock-stream'};
    });
    const mockAudioElement = {current: {srcObject: null}};
    jest.spyOn(React, 'useRef').mockReturnValue(mockAudioElement);
    const mockAudio = {
      srcObject: 'mock-audio',
    };

    const {result, unmount} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER', logger})
    );
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    act(() => {
      taskMock.on.mock.calls[2][1](mockAudio);
    });

    await waitFor(() => {
      expect(mockAudioElement.current).toEqual({srcObject: {mockStream: 'mock-stream'}});
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
      useIncomingTask({cc: ccMock, onAccepted, selectedLoginOption: 'BROWSER', logger})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](failingTask);
    });

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
      useIncomingTask({cc: ccMock, onDeclined, selectedLoginOption: 'BROWSER', logger})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](failingTask);
    });

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

  it('should handle task media event', async () => {
    const mockTrack = {kind: 'audio'};
    const mockAudioElement = {current: {srcObject: null}};
    jest.spyOn(React, 'useRef').mockReturnValue(mockAudioElement);

    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER', logger})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MEDIA)?.[1](mockTrack);
    });

    await waitFor(() => {
      expect(mockAudioElement.current.srcObject).toEqual(new MediaStream([mockTrack]));
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });
});

describe('useTaskList Hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
    logger.error.mockRestore();
  });

  it('should call onTaskAccepted callback when provided', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock, selectedLoginOption: '', onTaskAccepted, logger}));

    act(() => {
      result.current.acceptTask(taskMock);
    });

    await waitFor(() => {
      expect(onTaskAccepted).toHaveBeenCalledWith(taskMock);
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should call onTaskDeclined callback when provided', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock, selectedLoginOption: '', onTaskDeclined, logger}));

    act(() => {
      result.current.declineTask(taskMock);
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
      useTaskList({cc: ccMock, onTaskAccepted, selectedLoginOption: 'BROWSER', logger})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](failingTask);
    });

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
      useTaskList({cc: ccMock, onTaskDeclined, selectedLoginOption: 'BROWSER', logger})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](failingTask);
    });

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

  it('should add tasks to the list on TASK_INCOMING event', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock, logger, selectedLoginOption: ''}));

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    await waitFor(() => {
      expect(result.current.taskList).toContain(taskMock);
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not call onTaskAccepted if it is not provided', async () => {
    const {result} = renderHook(() =>
      useTaskList({cc: ccMock, onTaskAccepted: null, onTaskDeclined: null, logger, selectedLoginOption: ''})
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
      useTaskList({cc: ccMock, onTaskAccepted: null, onTaskDeclined: null, logger, selectedLoginOption: ''})
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

  it('should remove a task from the list when it ends', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock, logger, selectedLoginOption: ''}));

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_END)?.[1]();
    });

    await waitFor(() => {
      expect(result.current.taskList).not.toContain(taskMock);
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should update an existing task in the list', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock, logger, selectedLoginOption: ''}));

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    const updatedTask = {...taskMock, data: {interactionId: 'interaction1', status: 'updated'}};
    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_ASSIGNED)?.[1](updatedTask);
    });

    await waitFor(() => {});

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should deduplicate tasks by interactionId', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock, logger, selectedLoginOption: ''}));

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
      ccMock.on.mock.calls[0][1](taskMock);
    });

    await waitFor(() => {
      expect(result.current.taskList.length).toBe(1);
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should remove a task from the list when it is unassigned', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock, logger, selectedLoginOption: ''}));

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_UNASSIGNED)?.[1]();
    });

    await waitFor(() => {
      expect(result.current.taskList).not.toContain(taskMock);
    });

    // Ensure no errors are logged
    expect(logger.error).not.toHaveBeenCalled();
  });

  describe('useIncomingTask Hook - Task Events', () => {
    afterEach(() => {
      jest.clearAllMocks();
      logger.error.mockRestore();
    });

    it('should set isAnswered to true when task is assigned', async () => {
      const {result} = renderHook(() =>
        useIncomingTask({
          cc: ccMock,
          onAccepted,
          onDeclined,
          selectedLoginOption: 'BROWSER',
          logger,
          selectedLoginOption: '',
        })
      );

      // Simulate task being assigned
      act(() => {
        ccMock.on.mock.calls[0][1](taskMock); // Simulate incoming task
      });

      act(() => {
        taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_ASSIGNED)?.[1](); // Trigger task assigned
      });

      await waitFor(() => {
        expect(result.current.isAnswered).toBe(true);
      });

      // Ensure no errors are logged
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should set isEnded to true and clear currentTask when task ends', async () => {
      const {result} = renderHook(() =>
        useIncomingTask({
          cc: ccMock,
          onAccepted,
          onDeclined,
          selectedLoginOption: 'BROWSER',
          logger,
          selectedLoginOption: '',
        })
      );

      // Simulate task being assigned
      act(() => {
        ccMock.on.mock.calls[0][1](taskMock); // Simulate incoming task
      });

      // Simulate task ending
      act(() => {
        taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_END)?.[1](); // Trigger task end
      });

      await waitFor(() => {
        expect(result.current.isEnded).toBe(true);
        expect(result.current.incomingTask).toBeNull();
      });

      // Ensure no errors are logged
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('useIncomingTask Hook - handleTaskMedia', () => {
    beforeEach(() => {
      // Mock the MediaStreamTrack and MediaStream classes for the test environment
      global.MediaStreamTrack = jest.fn().mockImplementation(() => ({
        kind: 'audio', // Simulating an audio track
        enabled: true,
        id: 'track-id',
      }));

      global.MediaStream = jest.fn().mockImplementation((tracks) => ({
        getTracks: () => tracks,
      }));
    });

    afterEach(() => {
      jest.clearAllMocks();
      logger.error.mockRestore();
    });

    it('should assign track to audioRef.current.srcObject when handleTaskMedia is called', async () => {
      // Mock audioRef.current to simulate an audio element with a srcObject
      const mockAudioElement = {
        srcObject: null,
      };

      const {result} = renderHook(() =>
        useIncomingTask({
          cc: ccMock,
          onAccepted,
          onDeclined,
          selectedLoginOption: 'BROWSER',
          logger,
          selectedLoginOption: '',
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
        useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER', logger})
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
  });
});

describe('useCallControl', () => {
  const mockCurrentTask = {
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
    jest.clearAllMocks();
  });

  it('should set up and clean up event listeners on currentTask', () => {
    renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
      })
    );

    expect(mockCurrentTask.on).toHaveBeenCalledWith('task:end', expect.any(Function));

    // Cleanup on unmount
    const {unmount} = renderHook(() =>
      useCallControl({
        currentTask: mockCurrentTask,
        onHoldResume: mockOnHoldResume,
        onEnd: mockOnEnd,
        onWrapUp: mockOnWrapUp,
        logger: mockLogger,
      })
    );

    unmount();

    expect(mockCurrentTask.off).toHaveBeenCalledWith('task:end', expect.any(Function));
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
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Error holding call: Error: Hold error', expect.any(Object));
  });

  it('should log an error if hold fails', async () => {
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
    });

    expect(mockCurrentTask.end).toHaveBeenCalled();
    expect(mockOnEnd).toHaveBeenCalled();
  });

  it('should update wrapupRequired on TASK_END event', async () => {
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
      await mockCurrentTask.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_END)?.[1]({wrapupRequired: true});
    });
    expect(result.current.wrapupRequired).toBe(true);
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
    expect(mockLogger.error).toHaveBeenCalledWith('Error ending call: Error: End error', expect.any(Object));
  });

  it('should call wrapupCall and handle success', async () => {
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
      await result.current.wrapupCall('Wrap reason', 123);
    });

    expect(mockCurrentTask.wrapup).toHaveBeenCalledWith({wrapUpReason: 'Wrap reason', auxCodeId: 123});
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
      })
    );

    await act(async () => {
      await result.current.wrapupCall('Wrap reason', 123);
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

    await act(async () => {
      await result.current.toggleRecording(true);
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

    await act(async () => {
      await result.current.toggleRecording(true);
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

    await act(async () => {
      await result.current.toggleRecording(false);
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

    await act(async () => {
      await result.current.toggleRecording(false);
    });

    expect(mockCurrentTask.resumeRecording).toHaveBeenCalledWith();
    expect(mockLogger.error).toHaveBeenCalledWith('Error resuming recording: Error: Resume error', expect.any(Object));
  });
});
