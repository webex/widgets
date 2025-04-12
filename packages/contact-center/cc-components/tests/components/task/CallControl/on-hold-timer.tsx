import {useHoldTimer} from '../../../../src/components/task/CallControlCAD/on-hold-timer';
import {renderHook, act} from '@testing-library/react';

describe('useHoldTimer', () => {
  let originalWorker: typeof Worker;

  beforeAll(() => {
    // Mock the Worker class
    originalWorker = global.Worker;
    global.Worker = jest.fn().mockImplementation(() => ({
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null,
    }));

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn().mockImplementation(() => 'mocked-worker-url');
  });

  afterAll(() => {
    // Restore the original Worker class and URL.createObjectURL
    global.Worker = originalWorker;
    delete global.URL.createObjectURL;
  });

  it('should initialize holdTime to 0', () => {
    const {result} = renderHook(() => useHoldTimer(false));
    expect(result.current).toBe(0);
  });

  it('should start the timer when isHeld is true', () => {
    const mockPostMessage = jest.fn();
    (global.Worker as jest.Mock).mockImplementation(() => ({
      postMessage: mockPostMessage,
      terminate: jest.fn(),
      onmessage: null,
    }));

    const {rerender} = renderHook(({isHeld}) => useHoldTimer(isHeld), {
      initialProps: {isHeld: false},
    });

    // Update isHeld to true
    rerender({isHeld: true});

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

    const {rerender} = renderHook(({isHeld}) => useHoldTimer(isHeld), {
      initialProps: {isHeld: true},
    });

    // Update isHeld to false
    rerender({isHeld: false});

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

    const {result} = renderHook(() => useHoldTimer(true));

    // Simulate a message from the worker
    act(() => {
      onmessageCallback?.({
        data: {type: 'elapsedTime', elapsedTime: 5},
      } as MessageEvent);
    });

    expect(result.current).toBe(5);
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

    const {result} = renderHook(() => useHoldTimer(true));

    // Simulate a message from the worker
    act(() => {
      onmessageCallback?.({
        data: {type: 'elapsedTime', elapsedTime: 5},
      } as MessageEvent);
    });

    expect(result.current).toBe(5);

    // Simulate a stop message
    act(() => {
      onmessageCallback?.({
        data: {type: 'stop'},
      } as MessageEvent);
    });

    expect(result.current).toBe(0);
  });

  it('should terminate the worker on unmount', () => {
    const mockTerminate = jest.fn();

    (global.Worker as jest.Mock).mockImplementation(() => ({
      postMessage: jest.fn(),
      terminate: mockTerminate,
      onmessage: null,
    }));

    const {unmount} = renderHook(() => useHoldTimer(false));

    // Unmount the hook
    unmount();

    expect(mockTerminate).toHaveBeenCalled();
  });
});
