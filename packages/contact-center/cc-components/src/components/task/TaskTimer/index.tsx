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

  const timers = {};

  self.onmessage = function(e) {
    const { type, name, start, countdown, ronaTimeout } = e.data;

    if (type === 'start') {
      if (timers[name]) {
        return; // Timer with this name is already running
      }

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
            self.postMessage({ name, time: '00:00' });
            running = false;
            delete timers[name];
            return;
          }
        } else {
          diff = now - start;
        }

        const formattedTime = formatDuration(diff);
        self.postMessage({ name, time: formattedTime });
        timers[name] = setTimeout(updateTimer, 1000);
      };

      updateTimer();
    } else if (type === 'stop') {
      if (timers[name]) {
        clearTimeout(timers[name]);
        delete timers[name];
      }
    }
  };
`;

const createWorker = () => {
  return new Worker(URL.createObjectURL(new Blob([workerScript], {type: 'application/javascript'})));
};

const TaskTimer: React.FC<TaskTimerProps> = ({startTimeStamp, countdown = false, ronaTimeout}) => {
  const [duration, setDuration] = useState('00:00');
  const workerRef = useRef<Worker | null>(null);
  const timerName = useRef(`timer-${Date.now()}`); // Unique name for the timer

  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const start = startTimeStamp ? Math.floor(startTimeStamp / 1000) : now;

    if (!workerRef.current) {
      workerRef.current = createWorker();
    }

    workerRef.current.postMessage({type: 'start', name: timerName.current, start, countdown, ronaTimeout});

    const handleMessage = (e: MessageEvent) => {
      if (e.data.name === timerName.current) {
        setDuration(e.data.time);
      }
    };

    workerRef.current.addEventListener('message', handleMessage);

    return () => {
      workerRef.current.postMessage({type: 'stop', name: timerName.current});
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
