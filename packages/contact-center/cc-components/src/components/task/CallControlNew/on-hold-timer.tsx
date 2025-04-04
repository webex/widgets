import {useState, useRef, useEffect} from 'react';

export const useHoldTimer = (isHeld: boolean) => {
  const [holdTime, setHoldTime] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  // Web Worker script
  const workerScript = `
    let intervalId;
    const startTimer = (startTime) => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        self.postMessage({type: 'elapsedTime', elapsedTime});
      }, 1000);
    };
    const stopTimer = () => {
      if (intervalId) clearInterval(intervalId);
      self.postMessage({type: 'stop'});
    };
    self.onmessage = (event) => {
      if (event.data.type === 'start') {
        const startTime = event.data.startTime;
        startTimer(startTime);
      }
      if (event.data.type === 'stop') {
        stopTimer();
      }
    };
  `;

  useEffect(() => {
    // Initialize the Web Worker
    const blob = new Blob([workerScript], {type: 'application/javascript'});
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);

    workerRef.current.onmessage = (event) => {
      if (event.data.type === 'elapsedTime') {
        setHoldTime(event.data.elapsedTime);
      } else if (event.data.type === 'stop') {
        setHoldTime(0);
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({type: 'stop'});
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isHeld) {
      // Start the timer when the call is on hold
      workerRef.current?.postMessage({type: 'start', startTime: Date.now()});
    } else {
      // Stop the timer when the call is resumed
      workerRef.current?.postMessage({type: 'stop'});
    }
  }, [isHeld]);

  return holdTime;
};
