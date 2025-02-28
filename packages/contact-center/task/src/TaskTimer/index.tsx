import React, {useEffect, useState} from 'react';
import {DateTime, Duration} from 'luxon';

const formatDuration = (diff: Duration): string => {
  const seconds = Math.max(0, diff.as('seconds')); // Prevent negative values
  return Duration.fromObject({seconds}).toFormat(seconds < 3600 ? 'mm:ss' : 'hh:mm:ss');
};

interface TaskTimerProps {
  startTimeStamp?: number;
  countdown?: boolean;
  ronaTimeout?: number;
}

const TaskTimer: React.FC<TaskTimerProps> = ({startTimeStamp, countdown = false, ronaTimeout}) => {
  const now = DateTime.utc();
  const start = startTimeStamp ? DateTime.fromMillis(startTimeStamp).toUTC() : now;

  const getInitialDuration = () => {
    if (countdown && ronaTimeout !== undefined) {
      const end = now.plus({seconds: ronaTimeout});
      return formatDuration(end.diff(now));
    }
    return formatDuration(now.diff(start));
  };

  const [duration, setDuration] = useState(getInitialDuration);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) {
      return;
    }

    const updateDuration = () => {
      const now = DateTime.utc();
      let diff: Duration;

      if (countdown && ronaTimeout !== undefined) {
        const end = start.plus({seconds: ronaTimeout});
        diff = end.diff(now);

        if (diff.toMillis() <= 0) {
          setDuration('00:00');
          setRunning(false);
          return;
        }
      } else {
        diff = now.diff(start);
      }

      setDuration(formatDuration(diff));

      const timeoutId = setTimeout(updateDuration, 1000);

      return () => clearTimeout(timeoutId);
    };

    updateDuration();

    return () => setRunning(false); // Ensure running state is cleaned up
  }, [countdown, ronaTimeout, startTimeStamp, running]);

  return (
    <time dateTime={duration} className="task-text task-text--secondary">
      {duration}
    </time>
  );
};

export default TaskTimer;
