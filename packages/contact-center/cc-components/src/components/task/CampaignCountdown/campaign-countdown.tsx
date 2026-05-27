import React, {useEffect, useRef, useState, useCallback} from 'react';
import {Text} from '@momentum-design/components/dist/react';
import {CampaignCountdownProps} from './campaign-countdown.types';
import {formatCountdown, calculateRemainingSeconds} from './campaign-countdown.utils';
import {withMetrics} from '@webex/cc-ui-logging';
import {TIME_LEFT} from '../constants';

const CampaignCountdown: React.FC<CampaignCountdownProps> = ({
  timeoutInSeconds,
  timeoutTimestamp,
  onTimeout,
  logger,
}) => {
  const calculateRemaining = useCallback((): number => {
    return calculateRemainingSeconds(timeoutTimestamp, timeoutInSeconds, logger);
  }, [timeoutTimestamp, timeoutInSeconds, logger]);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(calculateRemaining());
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  useEffect(() => {
    setRemainingSeconds(calculateRemaining());
    setHasTimedOut(false);
  }, [timeoutTimestamp, timeoutInSeconds, calculateRemaining]);

  useEffect(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }

    if (remainingSeconds > 0) {
      timerRef.current = setTimeout(() => {
        // Recalculate from wall clock when using timeoutTimestamp to handle
        // browser throttling (background tabs, blocked main thread)
        const newRemaining = timeoutTimestamp !== undefined ? calculateRemaining() : remainingSeconds - 1;
        setRemainingSeconds(newRemaining);
        timerRef.current = undefined;
      }, 1000);
    } else if (remainingSeconds === 0 && !hasTimedOut) {
      setHasTimedOut(true);
      onTimeout?.();
    }

    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [remainingSeconds, hasTimedOut, onTimeout, timeoutTimestamp, calculateRemaining]);

  const formattedTime = formatCountdown(remainingSeconds, logger);

  return (
    <Text type="body-midsize-regular" className="task-text" data-testid="campaign-countdown">
      {TIME_LEFT} {formattedTime}
    </Text>
  );
};

const CampaignCountdownWithMetrics = withMetrics(CampaignCountdown, 'CampaignCountdown');
export default CampaignCountdownWithMetrics;
