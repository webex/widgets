import {
  formatCountdown,
  calculateRemainingSeconds,
  parseTimeoutTimestamp,
} from '../../../../src/components/task/CampaignCountdown/campaign-countdown.utils';

describe('CampaignCountdown.utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatCountdown', () => {
    it('should format zero seconds correctly', () => {
      expect(formatCountdown(0)).toBe('00:00');
    });

    it('should format seconds only correctly', () => {
      expect(formatCountdown(5)).toBe('00:05');
      expect(formatCountdown(30)).toBe('00:30');
      expect(formatCountdown(59)).toBe('00:59');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatCountdown(60)).toBe('01:00');
      expect(formatCountdown(90)).toBe('01:30');
      expect(formatCountdown(125)).toBe('02:05');
    });

    it('should handle large values correctly', () => {
      expect(formatCountdown(3600)).toBe('60:00');
      expect(formatCountdown(3661)).toBe('61:01');
    });

    it('should handle negative values by returning 00:00', () => {
      expect(formatCountdown(-5)).toBe('00:00');
      expect(formatCountdown(-100)).toBe('00:00');
    });

    it('should pad single digit values with leading zeros', () => {
      expect(formatCountdown(1)).toBe('00:01');
      expect(formatCountdown(9)).toBe('00:09');
      expect(formatCountdown(61)).toBe('01:01');
    });
  });

  describe('parseTimeoutTimestamp', () => {
    it('should parse string timestamp correctly', () => {
      expect(parseTimeoutTimestamp('1777297081043')).toBe(1777297081043);
    });

    it('should return number timestamp as-is', () => {
      expect(parseTimeoutTimestamp(1777297081043)).toBe(1777297081043);
    });

    it('should return 0 for undefined', () => {
      expect(parseTimeoutTimestamp(undefined)).toBe(0);
    });

    it('should return 0 for invalid string', () => {
      expect(parseTimeoutTimestamp('invalid')).toBe(0);
    });
  });

  describe('calculateRemainingSeconds', () => {
    it('should return timeoutInSeconds when provided', () => {
      expect(calculateRemainingSeconds(undefined, 30)).toBe(30);
      expect(calculateRemainingSeconds(undefined, 60)).toBe(60);
    });

    it('should return 0 for negative timeoutInSeconds', () => {
      expect(calculateRemainingSeconds(undefined, -5)).toBe(0);
    });

    it('should calculate remaining seconds from future timestamp (number)', () => {
      const futureTimestamp = Date.now() + 30000;
      const result = calculateRemainingSeconds(futureTimestamp, undefined);
      expect(result).toBeGreaterThanOrEqual(29);
      expect(result).toBeLessThanOrEqual(31);
    });

    it('should calculate remaining seconds from future timestamp (string)', () => {
      const futureTimestamp = String(Date.now() + 30000);
      const result = calculateRemainingSeconds(futureTimestamp, undefined);
      expect(result).toBeGreaterThanOrEqual(29);
      expect(result).toBeLessThanOrEqual(31);
    });

    it('should return 0 for past timestamp', () => {
      const pastTimestamp = Date.now() - 5000;
      expect(calculateRemainingSeconds(pastTimestamp, undefined)).toBe(0);
    });

    it('should prioritize timestamp over timeoutInSeconds', () => {
      const futureTimestamp = Date.now() + 10000;
      const result = calculateRemainingSeconds(futureTimestamp, 60);
      expect(result).toBeGreaterThanOrEqual(9);
      expect(result).toBeLessThanOrEqual(11);
    });

    it('should return 0 when neither value is provided', () => {
      expect(calculateRemainingSeconds(undefined, undefined)).toBe(0);
    });
  });
});
