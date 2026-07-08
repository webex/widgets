import {useEffect, useRef, useState} from 'react';
import {clearHoldAnchor, readHoldAnchor, writeHoldAnchor} from './task-util';

const HOLD_TIMER_WORKER_SCRIPT = `
  let intervalId = null;
  self.onmessage = function(e) {
    if (e.data.type === 'start') {
      const eventTime = e.data.eventTime;
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - eventTime) / 1000);
        self.postMessage({ type: 'elapsedTime', elapsed });
      }, 1000);
    }
    if (e.data.type === 'stop') {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    }
  };
`;

/**
 * Hold timer only — main CAD on-hold boolean is computed in useCallControl (helper.ts).
 */
export const useHoldTimer = (
  mainCallOnHold: boolean,
  holdTimestampMs: number | null,
  holdDataVersion = 0,
  interactionId?: string
): number => {
  const [holdTime, setHoldTime] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  void holdDataVersion;

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({type: 'stop'});
      workerRef.current.terminate();
      workerRef.current = null;
    }

    if (!mainCallOnHold) {
      clearHoldAnchor(interactionId);
      setHoldTime(0);
      return;
    }

    let eventTime = holdTimestampMs;
    if (!eventTime) {
      eventTime = readHoldAnchor(interactionId) ?? Date.now();
    }
    writeHoldAnchor(interactionId, eventTime);

    const blob = new Blob([HOLD_TIMER_WORKER_SCRIPT], {type: 'application/javascript'});
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);

    setHoldTime(Math.floor((Date.now() - eventTime) / 1000));

    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'elapsedTime') setHoldTime(e.data.elapsed);
      if (e.data.type === 'stop') setHoldTime(0);
    };

    workerRef.current.postMessage({type: 'start', eventTime});

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({type: 'stop'});
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [mainCallOnHold, holdTimestampMs, holdDataVersion, interactionId]);

  return holdTime;
};
