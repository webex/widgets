import React, {useEffect, useState, useRef} from 'react';

interface TaskTimerProps {
  startTimeStamp?: number; // in milliseconds
  countdown?: boolean;
  ronaTimeout?: number; // in seconds
}

const workerScript = `
  const formatDuration = (seconds) => {
    seconds = Math.max(0, seconds);
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return seconds < 3600 ? m + ':' + s : h + ':' + m + ':' + s;
  }

  self.onmessage = function(e) {
    const { start, countdown, ronaTimeout } = e.data;
    let running = true;

    const updateTimer = () => {
      if (!running) {
        return;
      }

      const now = Math.floor(Date.now() / 1000); // current time in seconds
      let diff;

      if (countdown && ronaTimeout !== undefined) {
        diff = start + ronaTimeout - now;
        if (diff <= 0) {
          self.postMessage('00:00');
          running = false;
          return;
        }
      } else {
        diff = now - start;
      }

      const formattedTime = formatDuration(diff);

      self.postMessage(formattedTime);
      setTimeout(updateTimer, 1000);
    };

    updateTimer();
  };
`;

const createWorker = () => {
  return new Worker(URL.createObjectURL(new Blob([workerScript], {type: 'application/javascript'})));
};

const TaskTimer: React.FC<TaskTimerProps> = ({startTimeStamp, countdown = false, ronaTimeout}) => {
  const [duration, setDuration] = useState('00:00');
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Convert startTimeStamp from milliseconds to seconds if provided to match ronaTimeout, which is in seconds
    const now = Math.floor(Date.now() / 1000);
    const start = startTimeStamp ? Math.floor(startTimeStamp / 1000) : now;

    if (!workerRef.current) {
      workerRef.current = createWorker();
    }

    workerRef.current.postMessage({start, countdown, ronaTimeout});

    const handleMessage = (e: MessageEvent) => {
      setDuration(e.data);
    };

    workerRef.current.addEventListener('message', handleMessage);

    return () => {
      workerRef.current?.removeEventListener('message', handleMessage);
    };
  }, [countdown, ronaTimeout, startTimeStamp]);

  return (
    <time dateTime={duration} className="task-text task-text--secondary">
      {duration}
    </time>
  );
};

export default TaskTimer;
