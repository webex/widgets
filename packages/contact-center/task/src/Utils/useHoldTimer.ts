import {useEffect, useRef, useState} from 'react';
import {ITask, isInteractionOnHold} from '@webex/cc-store';
import {TaskUIControls} from '@webex/contact-center';
import {findHoldTimestamp} from './task-util';

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
 * Custom hook to manage hold timer using a Web Worker.
 *
 * Derives two stable primitives from props — a boolean hold flag and a
 * numeric timestamp — and uses them as the sole effect dependencies.
 * This prevents the worker from being killed/recreated on every
 * currentTask or controls reference change.
 *
 * @param currentTask - The current task object
 * @param controls - SDK-computed UI controls with activeLeg
 * @returns holdTime - The elapsed time in seconds since the call was put on hold
 */
export const useHoldTimer = (currentTask: ITask | null, controls?: TaskUIControls): number => {
  const [holdTime, setHoldTime] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  // --- Derive stable primitives (compared by value, not reference) ---

  const isConsulting = controls?.consult?.endConsult?.isVisible || controls?.main?.endConsult?.isVisible;

  const customerPresent = Boolean(
    currentTask?.data?.interaction?.participants &&
      Object.values(currentTask.data.interaction.participants).some((p) => p?.pType === 'Customer' && !p?.hasLeft)
  );

  // During consulting, activeLeg='consult' means the main call is on hold.
  // Outside consulting, fall back to the actual media hold state.
  // When customer has left, never show the hold timer (follows Agent Desktop behavior).
  const mainCallOnHold =
    isConsulting && customerPresent
      ? controls?.activeLeg === 'consult'
      : currentTask
        ? isInteractionOnHold(currentTask)
        : false;

  const rawTs = currentTask?.data?.interaction ? findHoldTimestamp(currentTask.data.interaction, 'mainCall') : null;
  const holdTimestampMs: number | null = rawTs ? (rawTs < 10000000000 ? rawTs * 1000 : rawTs) : null;

  // --- Effect: only re-runs when the boolean or timestamp actually change ---

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({type: 'stop'});
      workerRef.current.terminate();
      workerRef.current = null;
    }

    if (!mainCallOnHold) {
      setHoldTime(0);
      return;
    }

    // Use real backend timestamp when available, otherwise Date.now() so the
    // timer starts immediately (backend AgentContactHeld arrives ~100-200ms
    // later and triggers a re-run via the holdTimestampMs dependency).
    const eventTime = holdTimestampMs || Date.now();

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
  }, [mainCallOnHold, holdTimestampMs]);

  return holdTime;
};
