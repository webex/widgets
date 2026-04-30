import {ILogger} from '@webex/cc-store';

/**
 * Parses the timeoutTimestamp value (string or number) to a number.
 * The backend sends campaignPreviewOfferTimeout as a string epoch timestamp in milliseconds.
 */
export const parseTimeoutTimestamp = (value: string | number | undefined, logger?: ILogger): number => {
  try {
    if (value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return 0;
  } catch (error) {
    logger?.error('CC-Widgets: CampaignCountdown: Error in parseTimeoutTimestamp', {
      module: 'cc-components#campaign-countdown.utils.ts',
      method: 'parseTimeoutTimestamp',
      error: error.message,
    });
    return 0;
  }
};

/**
 * Calculates remaining seconds based on either a timestamp or a direct seconds value.
 * If timeoutTimestamp is provided, it calculates the difference from now.
 * Otherwise, it uses timeoutInSeconds directly.
 */
export const calculateRemainingSeconds = (
  timeoutTimestamp?: string | number,
  timeoutInSeconds?: number,
  logger?: ILogger
): number => {
  try {
    // timeoutTimestamp takes precedence
    if (timeoutTimestamp !== undefined) {
      const parsedTimestamp = parseTimeoutTimestamp(timeoutTimestamp, logger);
      if (parsedTimestamp > 0) {
        const now = Date.now();
        const diffMs = parsedTimestamp - now;
        return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
      }
    }
    // Fall back to timeoutInSeconds
    if (typeof timeoutInSeconds === 'number') {
      return Math.max(0, timeoutInSeconds);
    }
    return 0;
  } catch (error) {
    logger?.error('CC-Widgets: CampaignCountdown: Error in calculateRemainingSeconds', {
      module: 'cc-components#campaign-countdown.utils.ts',
      method: 'calculateRemainingSeconds',
      error: error.message,
    });
    return 0;
  }
};

/**
 * Formats seconds into MM:SS format for countdown display
 */
export const formatCountdown = (seconds: number, logger?: ILogger): string => {
  try {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } catch (error) {
    logger?.error('CC-Widgets: CampaignCountdown: Error in formatCountdown', {
      module: 'cc-components#campaign-countdown.utils.ts',
      method: 'formatCountdown',
      error: error.message,
    });
    return '00:00';
  }
};
