import {renderHook, act, waitFor} from '@testing-library/react';
import {useIncomingTask, useTaskList} from '../src/helper';

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

  it('should set the current task on task incoming event', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    // Simulate an incoming task
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock); // Trigger TASK_INCOMING event
    });

    waitFor(() => {
      expect(result.current.currentTask).toBe(taskMock);
      expect(ccMock.on).toHaveBeenCalledWith('TASK_INCOMING', expect.any(Function));
    });
  });

  it('should register task events for the current task', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    // Simulate an incoming task
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock); // Trigger TASK_INCOMING event
    });

    waitFor(() => {
      expect(taskMock.on).toHaveBeenCalledWith('TASK_ASSIGNED', expect.any(Function));
      expect(taskMock.on).toHaveBeenCalledWith('TASK_END', expect.any(Function));
      expect(taskMock.on).toHaveBeenCalledWith('TASK_UNASSIGNED', expect.any(Function));
      expect(taskMock.on).toHaveBeenCalledWith('TASK_MEDIA', expect.any(Function));
    });
  });

  it('should clean up task events on task change or unmount', async () => {
    const {result, unmount} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    // Simulate an incoming task
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock); // Trigger TASK_INCOMING event
    });

    // Simulate unmount
    unmount();

    waitFor(() => {
      expect(taskMock.off).toHaveBeenCalledWith('TASK_ASSIGNED', expect.any(Function));
      expect(taskMock.off).toHaveBeenCalledWith('TASK_END', expect.any(Function));
      expect(taskMock.off).toHaveBeenCalledWith('TASK_UNASSIGNED', expect.any(Function));
      expect(taskMock.off).toHaveBeenCalledWith('TASK_MEDIA', expect.any(Function));
      expect(ccMock.off).toHaveBeenCalledWith('TASK_INCOMING', expect.any(Function));
    });
  });

  it('should call onAccepted callback when task is accepted', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    // Simulate an incoming task
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock); // Trigger TASK_INCOMING event
    });

    // Accept the task
    act(() => {
      result.current.accept();
    });

    waitFor(() => {
      expect(onAccepted).toHaveBeenCalled();
      expect(taskMock.accept).toHaveBeenCalledWith('interaction1');
    });
  });

  it('should call onDeclined callback when task is declined', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    // Simulate an incoming task
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock); // Trigger TASK_INCOMING event
    });

    // Decline the task
    act(() => {
      result.current.decline();
    });

    waitFor(() => {
      expect(onDeclined).toHaveBeenCalled();
      expect(taskMock.decline).toHaveBeenCalledWith('interaction1');
    });
  });

  it('should correctly handle task media', async () => {
    const taskMediaMock = {};
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    // Simulate an incoming task
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock); // Trigger TASK_INCOMING event
    });

    // Simulate task media event
    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === 'task:media')[1](taskMediaMock);
    });

    waitFor(() => {
      expect(result.current.missed).toBe(false);
      expect(result.current.ended).toBe(false);
    });
  });
});

describe('useTaskList Hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register task:incoming event and add task to the list', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock}));

    // Simulate the incoming task event
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock); // Trigger TASK_INCOMING event
    });

    waitFor(() => {
      expect(result.current.taskList).toContain(taskMock);
      expect(ccMock.on).toHaveBeenCalledWith('task:incoming', expect.any(Function));
    });
  });

  it('should handle multiple incoming tasks', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock}));

    // Simulate multiple incoming task events
    const task1 = {...taskMock, id: 'task1'};
    const task2 = {...taskMock, id: 'task2'};

    act(() => {
      ccMock.on.mock.calls[0][1](task1); // Trigger TASK_INCOMING for task1
      ccMock.on.mock.calls[0][1](task2); // Trigger TASK_INCOMING for task2
    });

    waitFor(() => {
      expect(result.current.taskList).toEqual([task1, task2]);
      expect(ccMock.on).toHaveBeenCalledWith('task:incoming', expect.any(Function));
    });
  });

  it('should clean up task:incoming event on unmount', async () => {
    const {unmount} = renderHook(() => useTaskList({cc: ccMock}));

    // Simulate unmount
    unmount();

    waitFor(() => {
      expect(ccMock.off).toHaveBeenCalledWith('task:incoming', expect.any(Function));
    });
  });

  it('should not register event multiple times', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock}));

    // Trigger TASK_INCOMING event once
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    // Simulate triggering the event again (should not register again)
    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    waitFor(() => {
      expect(ccMock.on).toHaveBeenCalledTimes(1); // Event should only be registered once
      expect(ccMock.off).toHaveBeenCalledTimes(1); // Event cleanup should still happen once
    });
  });
});
