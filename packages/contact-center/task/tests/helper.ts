import {renderHook, act, waitFor} from '@testing-library/react';
import {useIncomingTask, useTaskList} from '../src/helper';
import {TASK_EVENTS} from '../src/task.types';

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

describe('useIncomingTask Hook', () => {
  let consoleErrorMock;

  beforeEach(() => {
    // Mock console.error to spy on errors
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorMock.mockRestore();
  });

  it('should register task events for the current task', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    await waitFor(() => {
      expect(taskMock.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(taskMock.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
    });

    // Ensure no errors are logged
    expect(consoleErrorMock).not.toHaveBeenCalled();
  });

  it('should not call onAccepted or onDeclined if they are not provided', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted: null, onDeclined: null, selectedLoginOption: 'BROWSER'})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    act(() => {
      result.current.accept();
      result.current.decline();
    });

    await waitFor(() => {
      expect(onAccepted).not.toHaveBeenCalled();
      expect(onDeclined).not.toHaveBeenCalled();
    });

    // Ensure no errors are logged
    expect(consoleErrorMock).not.toHaveBeenCalled();
  });

  it('should clean up task events on task change or unmount', async () => {
    const {result, unmount} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
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
    expect(consoleErrorMock).not.toHaveBeenCalled();
  });

  it('should handle errors in accepting or declining tasks', async () => {
    const failingTask = {
      ...taskMock,
      accept: jest.fn().mockRejectedValue('Error'),
      decline: jest.fn().mockRejectedValue('Error'),
    };

    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](failingTask);
    });

    act(() => {
      result.current.accept();
      result.current.decline();
    });

    await waitFor(() => {
      expect(failingTask.accept).toHaveBeenCalled();
      expect(failingTask.decline).toHaveBeenCalled();
    });

    // Ensure errors are logged in the console
    expect(consoleErrorMock).toHaveBeenCalled();
    expect(consoleErrorMock).toHaveBeenCalledWith('Error');
  });
});

describe('useTaskList Hook', () => {
  let consoleErrorMock;

  beforeEach(() => {
    // Mock console.error to spy on errors
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorMock.mockRestore();
  });

  it('should add tasks to the list on TASK_INCOMING event', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock}));

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    await waitFor(() => {
      expect(result.current.taskList).toContain(taskMock);
    });

    // Ensure no errors are logged
    expect(consoleErrorMock).not.toHaveBeenCalled();
  });

  it('should remove a task from the list when it ends', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock}));

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
    expect(consoleErrorMock).not.toHaveBeenCalled();
  });

  it('should update an existing task in the list', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock}));

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    const updatedTask = {...taskMock, data: {interactionId: 'interaction1', status: 'updated'}};
    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_ASSIGNED)?.[1](updatedTask);
    });

    await waitFor(() => {});

    // Ensure no errors are logged
    expect(consoleErrorMock).not.toHaveBeenCalled();
  });

  it('should deduplicate tasks by interactionId', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock}));

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
      ccMock.on.mock.calls[0][1](taskMock);
    });

    await waitFor(() => {
      expect(result.current.taskList.length).toBe(1);
    });

    // Ensure no errors are logged
    expect(consoleErrorMock).not.toHaveBeenCalled();
  });

  describe('useIncomingTask Hook - Task Events', () => {
    let consoleErrorMock;

    beforeEach(() => {
      // Mock console.error to spy on errors
      consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.clearAllMocks();
      consoleErrorMock.mockRestore();
    });

    it('should set isAnswered to true when task is assigned', async () => {
      const {result} = renderHook(() =>
        useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
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
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it('should set isEnded to true and clear currentTask when task ends', async () => {
      const {result} = renderHook(() =>
        useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
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
        expect(result.current.currentTask).toBeNull();
      });

      // Ensure no errors are logged
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it('should set isMissed to true and clear currentTask when task is missed', async () => {
      const {result} = renderHook(() =>
        useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
      );

      // Simulate task being assigned
      act(() => {
        ccMock.on.mock.calls[0][1](taskMock); // Simulate incoming task
      });

      // Simulate task being missed
      act(() => {
        taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_UNASSIGNED)?.[1](); // Trigger task missed
      });

      await waitFor(() => {
        expect(result.current.isMissed).toBe(true);
        expect(result.current.currentTask).toBeNull();
      });

      // Ensure no errors are logged
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });
  });

  describe('useIncomingTask Hook - handleTaskMedia', () => {
    let consoleErrorMock;

    beforeEach(() => {
      // Mock console.error to spy on errors
      consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();

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
      consoleErrorMock.mockRestore();
    });

    it('should assign track to audioRef.current.srcObject when handleTaskMedia is called', async () => {
      // Mock audioRef.current to simulate an audio element with a srcObject
      const mockAudioElement = {
        srcObject: null,
      };

      const {result} = renderHook(() =>
        useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
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
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it('should not set srcObject if audioRef.current is null', async () => {
      // Mock audioRef to simulate the absence of an audio element
      const {result} = renderHook(() =>
        useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
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
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });
  });
});
