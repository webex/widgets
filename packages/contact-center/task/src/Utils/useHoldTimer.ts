import {useEffect, useRef, useState} from 'react';
import {ITask} from '@webex/cc-store';
import {findHoldTimestamp} from './task-util';

// Worker script for hold timer - defined at module level as it never changes
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
 * Custom hook to manage hold timer using a Web Worker
 * Prioritizes consult hold over main call hold
 *
 * @param currentTask - The current task object
 * @returns holdTime - The elapsed time in seconds since the call was put on hold
 */
export const useHoldTimer = (currentTask: ITask | null): number => {
  const [holdTime, setHoldTime] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Clean up previous worker if any
    if (workerRef.current) {
      if (typeof workerRef.current.postMessage === 'function') {
        workerRef.current.postMessage({type: 'stop'});
      }
      if (typeof workerRef.current.terminate === 'function') {
        workerRef.current.terminate();
      }
      workerRef.current = null;
    }

    // Get holdTimestamp - prioritize consult hold over main call hold
    // This ensures the hold timer shows the correct time for whichever call is currently on hold
    const consultHoldTs = currentTask?.data?.interaction
      ? findHoldTimestamp(currentTask.data.interaction, 'consult')
      : null;
    const mainCallHoldTs = currentTask?.data?.interaction
      ? findHoldTimestamp(currentTask.data.interaction, 'mainCall')
      : null;

    // Use consult hold timestamp if available, otherwise use main call hold timestamp
    const activeHoldTimestamp = consultHoldTs || mainCallHoldTs;

    if (activeHoldTimestamp) {
      const holdTimeMs = activeHoldTimestamp < 10000000000 ? activeHoldTimestamp * 1000 : activeHoldTimestamp;
      const blob = new Blob([HOLD_TIMER_WORKER_SCRIPT], {type: 'application/javascript'});
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);

      // Set initial holdTime immediately for instant UI update
      setHoldTime(Math.floor((Date.now() - holdTimeMs) / 1000));

      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'elapsedTime') setHoldTime(e.data.elapsed);
        if (e.data.type === 'stop') setHoldTime(0);
      };

      workerRef.current.postMessage({type: 'start', eventTime: holdTimeMs});
    } else {
      setHoldTime(0);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({type: 'stop'});
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [currentTask]);

  return holdTime;
};
