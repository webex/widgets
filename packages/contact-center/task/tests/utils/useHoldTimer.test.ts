import {act, renderHook, waitFor} from '@testing-library/react';
import {useHoldTimer} from '../../src/Utils/useHoldTimer';
import {clearHoldAnchor, getHoldAnchorStorageKey, readHoldAnchor, writeHoldAnchor} from '../../src/Utils/task-util';

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

describe('useHoldTimer', () => {
  const interactionId = 'interaction-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    clearHoldAnchor(interactionId);
  });

  afterEach(() => {
    clearHoldAnchor(interactionId);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should return 0 when mainCallOnHold is false', () => {
    const {result} = renderHook(() => useHoldTimer(false, null));

    expect(result.current).toBe(0);
  });

  it('should set initial hold time when hold timestamp is provided', () => {
    const holdTimestampMs = Date.now() - 5000;

    const {result} = renderHook(() => useHoldTimer(true, holdTimestampMs, 0, interactionId));

    expect(result.current).toBeGreaterThanOrEqual(4);
    expect(result.current).toBeLessThanOrEqual(6);
  });

  it('should reuse session anchor on refresh when backend timestamp is missing', () => {
    const anchorMs = Date.now() - 12000;
    writeHoldAnchor(interactionId, anchorMs);

    const {result} = renderHook(() => useHoldTimer(true, null, 0, interactionId));

    expect(result.current).toBeGreaterThanOrEqual(11);
    expect(result.current).toBeLessThanOrEqual(13);
    expect(readHoldAnchor(interactionId)).toBe(anchorMs);
  });

  it('should persist a new anchor when hold starts without backend timestamp', () => {
    const now = Date.now();
    jest.setSystemTime(now);

    renderHook(() => useHoldTimer(true, null, 0, interactionId));

    expect(readHoldAnchor(interactionId)).toBe(now);
  });

  it('should reset to 0 and clear anchor when mainCallOnHold becomes false', async () => {
    const holdTimestampMs = Date.now() - 5000;
    writeHoldAnchor(interactionId, holdTimestampMs);

    const {result, rerender} = renderHook(
      ({onHold, timestampMs}) => useHoldTimer(onHold, timestampMs, 0, interactionId),
      {initialProps: {onHold: true, timestampMs: holdTimestampMs}}
    );

    expect(result.current).toBeGreaterThan(0);

    rerender({onHold: false, timestampMs: null});

    await waitFor(() => {
      expect(result.current).toBe(0);
    });
    expect(readHoldAnchor(interactionId)).toBeNull();
  });

  it('should restart timer when holdDataVersion bumps', async () => {
    const holdTimestampMs = Date.now() - 3000;

    const {result, rerender} = renderHook(({version}) => useHoldTimer(true, holdTimestampMs, version, interactionId), {
      initialProps: {version: 0},
    });

    expect(result.current).toBeGreaterThan(0);

    rerender({version: 1});

    await waitFor(() => {
      expect(result.current).toBeGreaterThan(0);
    });
  });

  it('uses expected session storage key', () => {
    expect(getHoldAnchorStorageKey(interactionId)).toBe(`cc-widget-hold-anchor:${interactionId}`);
  });
});
