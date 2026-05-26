import {act, renderHook, waitFor} from '@testing-library/react';
import {useHoldTimer} from '../../src/Utils/useHoldTimer';
import {ITask} from '@webex/cc-store';
import {createEnabledMainTaskUIControls, createMockTaskUIControls, enabledControl} from '@webex/test-fixtures';

jest.mock('../../src/Utils/task-util', () => ({
  findHoldTimestamp: jest.fn(),
}));

import {findHoldTimestamp} from '../../src/Utils/task-util';

const mockFindHoldTimestamp = findHoldTimestamp as jest.MockedFunction<typeof findHoldTimestamp>;

interface WorkerMessage {
  type: string;
  eventTime?: number;
}

interface WorkerEvent {
  data: {
    type: string;
    elapsed?: number;
  };
}

class MockWorker {
  url: string;
  onmessage: ((e: WorkerEvent) => void) | null = null;

  constructor(stringUrl: string) {
    this.url = stringUrl;
  }

  postMessage(msg: WorkerMessage) {
    if (msg.type === 'start') {
      setTimeout(() => {
        if (this.onmessage) {
          const elapsed = Math.floor((Date.now() - (msg.eventTime || 0)) / 1000);
          this.onmessage({data: {type: 'elapsedTime', elapsed}});
        }
      }, 0);
    } else if (msg.type === 'stop') {
      if (this.onmessage) {
        this.onmessage({data: {type: 'stop'}});
      }
    }
  }

  terminate() {
    this.onmessage = null;
  }
}

global.Worker = MockWorker as unknown as typeof Worker;
global.URL.createObjectURL = jest.fn(() => 'mock-url');

const defaultControls = createEnabledMainTaskUIControls();

describe('useHoldTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should return 0 when currentTask is null', () => {
    mockFindHoldTimestamp.mockReturnValue(null);

    const {result} = renderHook(() => useHoldTimer(null, defaultControls));

    expect(result.current).toBe(0);
  });

  it('should return 0 when no hold timestamp found', () => {
    mockFindHoldTimestamp.mockReturnValue(null);

    const mockTask = {
      data: {
        interaction: {
          media: {},
        },
      },
    } as unknown as ITask;

    const {result} = renderHook(() => useHoldTimer(mockTask, defaultControls));

    expect(result.current).toBe(0);
  });

  it('should set initial hold time when call is on hold', () => {
    const holdTimestamp = Date.now() - 5000;
    mockFindHoldTimestamp.mockImplementation((_task, mType) => {
      if (mType === 'consult') return null;
      if (mType === 'mainCall') return holdTimestamp;
      return null;
    });

    const mockTask = {
      data: {
        interaction: {
          media: {
            'main-id': {
              mType: 'mainCall',
              isHold: true,
              holdTimestamp: holdTimestamp,
            },
          },
          participants: {
            customer1: {pType: 'Customer', hasLeft: false},
          },
        },
      },
    } as unknown as ITask;

    const {result} = renderHook(() => useHoldTimer(mockTask, defaultControls));

    expect(result.current).toBeGreaterThanOrEqual(4);
    expect(result.current).toBeLessThanOrEqual(6);
  });

  it('should show hold timer on main call while consulting when activeLeg is consult', () => {
    const mainCallHoldTimestamp = Date.now() - 3000;

    mockFindHoldTimestamp.mockImplementation((_task, mType) => {
      if (mType === 'mainCall') return mainCallHoldTimestamp;
      return null;
    });

    const mockTask = {
      data: {
        interaction: {
          media: {
            'main-id': {
              mType: 'mainCall',
              isHold: false,
              holdTimestamp: mainCallHoldTimestamp,
            },
          },
          participants: {
            customer1: {pType: 'Customer', hasLeft: false},
          },
        },
      },
    } as unknown as ITask;

    const controls = createMockTaskUIControls({
      activeLeg: 'consult',
      main: {endConsult: enabledControl},
      consult: {endConsult: enabledControl},
    });

    const {result} = renderHook(() => useHoldTimer(mockTask, controls));

    expect(result.current).toBeGreaterThanOrEqual(2);
    expect(result.current).toBeLessThanOrEqual(4);
  });

  it('should handle timestamp in seconds and convert to milliseconds', () => {
    const timestampInSeconds = Math.floor(Date.now() / 1000) - 7;
    mockFindHoldTimestamp.mockImplementation((_task, mType) => {
      if (mType === 'mainCall') return timestampInSeconds;
      return null;
    });

    const mockTask = {
      data: {
        interaction: {
          media: {
            'main-id': {
              mType: 'mainCall',
              isHold: true,
              holdTimestamp: timestampInSeconds,
            },
          },
          participants: {
            customer1: {pType: 'Customer', hasLeft: false},
          },
        },
      },
    } as unknown as ITask;

    const {result} = renderHook(() => useHoldTimer(mockTask, defaultControls));

    expect(result.current).toBeGreaterThanOrEqual(6);
    expect(result.current).toBeLessThanOrEqual(8);
  });

  it('should update hold time when currentTask changes', async () => {
    const initialHoldTimestamp = Date.now() - 5000;
    mockFindHoldTimestamp.mockImplementation((_task, mType) => {
      if (mType === 'mainCall') return initialHoldTimestamp;
      return null;
    });

    const mockTask1 = {
      data: {
        interaction: {
          media: {
            'main-id': {
              mType: 'mainCall',
              isHold: true,
              holdTimestamp: initialHoldTimestamp,
            },
          },
          participants: {
            customer1: {pType: 'Customer', hasLeft: false},
          },
        },
      },
    } as unknown as ITask;

    const {result, rerender} = renderHook(({task}) => useHoldTimer(task, defaultControls), {
      initialProps: {task: mockTask1},
    });

    const initialHoldTime = result.current;
    expect(initialHoldTime).toBeGreaterThan(0);

    const newHoldTimestamp = Date.now() - 10000;
    mockFindHoldTimestamp.mockImplementation((_task, mType) => {
      if (mType === 'mainCall') return newHoldTimestamp;
      return null;
    });

    const mockTask2 = {
      data: {
        interaction: {
          media: {
            'main-id': {
              mType: 'mainCall',
              isHold: true,
              holdTimestamp: newHoldTimestamp,
            },
          },
          participants: {
            customer1: {pType: 'Customer', hasLeft: false},
          },
        },
      },
    } as unknown as ITask;

    rerender({task: mockTask2});

    await waitFor(() => {
      expect(result.current).toBeGreaterThan(initialHoldTime);
    });
  });

  it('should reset to 0 when call is resumed', async () => {
    const holdTimestamp = Date.now() - 5000;
    mockFindHoldTimestamp.mockImplementation((_task, mType) => {
      if (mType === 'mainCall') return holdTimestamp;
      return null;
    });

    const mockTask1 = {
      data: {
        interaction: {
          media: {
            'main-id': {
              mType: 'mainCall',
              isHold: true,
              holdTimestamp: holdTimestamp,
            },
          },
          participants: {
            customer1: {pType: 'Customer', hasLeft: false},
          },
        },
      },
    } as unknown as ITask;

    const {result, rerender} = renderHook(({task}) => useHoldTimer(task, defaultControls), {
      initialProps: {task: mockTask1},
    });

    expect(result.current).toBeGreaterThan(0);

    mockFindHoldTimestamp.mockReturnValue(null);

    const mockTask2 = {
      data: {
        interaction: {
          media: {
            'main-id': {
              mType: 'mainCall',
              isHold: false,
            },
          },
          participants: {
            customer1: {pType: 'Customer', hasLeft: false},
          },
        },
      },
    } as unknown as ITask;

    rerender({task: mockTask2});

    await waitFor(() => {
      expect(result.current).toBe(0);
    });
  });
});
