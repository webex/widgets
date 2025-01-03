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

  it('should register task events for the current task', async () => {
    const {result} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    waitFor(() => {
      expect(taskMock.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(taskMock.on).toHaveBeenCalledWith(TASK_EVENTS.TASK_END, expect.any(Function));
    });
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

    waitFor(() => {
      expect(onAccepted).not.toHaveBeenCalled();
      expect(onDeclined).not.toHaveBeenCalled();
    });
  });

  it('should clean up task events on task change or unmount', async () => {
    const {result, unmount} = renderHook(() =>
      useIncomingTask({cc: ccMock, onAccepted, onDeclined, selectedLoginOption: 'BROWSER'})
    );

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    unmount();

    waitFor(() => {
      expect(taskMock.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_ASSIGNED, expect.any(Function));
      expect(ccMock.off).toHaveBeenCalledWith(TASK_EVENTS.TASK_INCOMING, expect.any(Function));
    });
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

    waitFor(() => {
      expect(failingTask.accept).toHaveBeenCalled();
      expect(failingTask.decline).toHaveBeenCalled();
    });
  });
});

describe('useTaskList Hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add tasks to the list on TASK_INCOMING event', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock}));

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    waitFor(() => {
      expect(result.current.taskList).toContain(taskMock);
    });
  });

  it('should remove a task from the list when it ends', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock}));

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
    });

    act(() => {
      taskMock.on.mock.calls.find((call) => call[0] === TASK_EVENTS.TASK_END)?.[1]();
    });

    waitFor(() => {
      expect(result.current.taskList).not.toContain(taskMock);
    });
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

    waitFor(() => {
      expect(result.current.taskList).toContainEqual(updatedTask);
    });
  });

  it('should handle maximum list size and remove the oldest tasks', async () => {
    const MAX_TASK_LIST_SIZE = 5;
    const {result} = renderHook(() => useTaskList({cc: ccMock, maxTaskListSize: MAX_TASK_LIST_SIZE}));

    const tasks = Array.from({length: MAX_TASK_LIST_SIZE + 2}, (_, i) => ({
      ...taskMock,
      data: {interactionId: `interaction${i + 1}`},
    }));

    act(() => {
      tasks.forEach((task) => {
        ccMock.on.mock.calls[0][1](task);
      });
    });

    waitFor(() => {
      expect(result.current.taskList.length).toBe(MAX_TASK_LIST_SIZE);
      expect(result.current.taskList[0].data.interactionId).toBe('interaction3');
    });
  });

  it('should deduplicate tasks by interactionId', async () => {
    const {result} = renderHook(() => useTaskList({cc: ccMock}));

    act(() => {
      ccMock.on.mock.calls[0][1](taskMock);
      ccMock.on.mock.calls[0][1](taskMock);
    });

    waitFor(() => {
      expect(result.current.taskList.length).toBe(1);
    });
  });

  it('should sort tasks based on a specified criterion', async () => {
    const {result} = renderHook(() =>
      useTaskList({
        cc: ccMock,
        sortFunction: (a, b) => a.data.interactionId.localeCompare(b.data.interactionId),
      })
    );

    const task1 = {...taskMock, data: {interactionId: 'interaction3'}};
    const task2 = {...taskMock, data: {interactionId: 'interaction1'}};
    const task3 = {...taskMock, data: {interactionId: 'interaction2'}};

    act(() => {
      ccMock.on.mock.calls[0][1](task1);
      ccMock.on.mock.calls[0][1](task2);
      ccMock.on.mock.calls[0][1](task3);
    });

    waitFor(() => {
      expect(result.current.taskList).toEqual([task2, task3, task1]);
    });
  });
});
