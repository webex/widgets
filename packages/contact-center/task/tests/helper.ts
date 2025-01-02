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
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle errors when task.accept fails', async () => {
    taskMock.accept.mockRejectedValueOnce(new Error('Accept failed'));
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    // Simulate an incoming task
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    // Attempt to accept the task
    await act(async () => {
      result.current.accept();
    });

    waitFor(() => {
      expect(onAccepted).not.toHaveBeenCalled();
      expect(taskMock.accept).toHaveBeenCalledWith('interaction1');
    });
  });

  it('should handle errors when task.decline fails', async () => {
    taskMock.decline.mockRejectedValueOnce(new Error('Decline failed'));
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    // Simulate an incoming task
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    // Attempt to decline the task
    await act(async () => {
      result.current.decline();
    });

    waitFor(() => {
      expect(onDeclined).not.toHaveBeenCalled();
      expect(taskMock.decline).toHaveBeenCalledWith('interaction1');
    });
  });

  it('should not call onAccepted or onDeclined if they are not provided', async () => {
    const {result} = renderHook(
      () => useIncomingTask({cc: ccMock, selectedLoginOption: 'BROWSER'}) // No onAccepted or onDeclined
    );

    // Simulate an incoming task
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    // Attempt to accept and decline the task
    await act(async () => {
      result.current.accept();
      result.current.decline();
    });

    waitFor(() => {
      expect(taskMock.accept).toHaveBeenCalledWith('interaction1');
      expect(taskMock.decline).toHaveBeenCalledWith('interaction1');
    });
  });

  it('should handle audio element null error gracefully', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    // Simulate an incoming task
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    // Simulate a TASK_MEDIA event with an invalid audioRef
    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MEDIA)?.[1]({
        mediaUrl: 'https://example.com/audio.mp3',
      });
    });

    // Set the audioRef to null
    result.current.audioRef.current = null;

    waitFor(() => {
      expect(result.current.audioRef.current).toBeNull();
      expect(() => {
        const audioElement = result.current.audioRef.current;
        if (!audioElement) throw new Error('audioElement is null');
      }).toThrow('audioElement is null');
    });
  });

  it('should handle invalid mediaUrl gracefully', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    // Simulate an incoming task
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    // Simulate a TASK_MEDIA event with an invalid media URL
    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_MEDIA)?.[1]({
        mediaUrl: '',
      });
    });

    waitFor(() => {
      const audioElement = result.current.audioRef?.current;
      expect(audioElement?.src).not.toContain('http');
    });
  });
});

describe('useTaskList Hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register TASK_EVENTS.TASK_INCOMING event and add task to the list', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock}));

    // Simulate the incoming task event
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    waitFor(() => {
      expect(result.current.taskList).toContain(taskMock);
      expect(ccMock.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
    });
  });

  it('should handle unmount cleanup without errors', async () => {
    const {unmount} = renderHook(() => useTaskList({cc: ccMock}));

    // Simulate unmount
    unmount();

    waitFor(() => {
      expect(ccMock.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
    });
  });
});
