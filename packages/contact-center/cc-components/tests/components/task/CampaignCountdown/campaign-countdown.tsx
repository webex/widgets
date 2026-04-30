import React from 'react';
import {render, screen, act} from '@testing-library/react';
import '@testing-library/jest-dom';
import CampaignCountdownComponent from '../../../../src/components/task/CampaignCountdown/campaign-countdown';
import {CampaignCountdownProps} from '../../../../src/components/task/CampaignCountdown/campaign-countdown.types';

describe('CampaignCountdownComponent', () => {
  const defaultProps: CampaignCountdownProps = {
    timeoutInSeconds: 30,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render the countdown element', () => {
      render(<CampaignCountdownComponent {...defaultProps} />);

      const countdown = screen.getByTestId('campaign-countdown');
      expect(countdown).toBeInTheDocument();
    });

    it('should display "Time left:" label with formatted time', () => {
      render(<CampaignCountdownComponent timeoutInSeconds={30} />);

      const countdown = screen.getByTestId('campaign-countdown');
      expect(countdown).toHaveTextContent('Time left:');
      expect(countdown).toHaveTextContent('00:30');
    });

    it('should format time correctly for various values', () => {
      const {rerender} = render(<CampaignCountdownComponent timeoutInSeconds={0} />);
      expect(screen.getByTestId('campaign-countdown')).toHaveTextContent('00:00');

      rerender(<CampaignCountdownComponent timeoutInSeconds={59} />);
      expect(screen.getByTestId('campaign-countdown')).toHaveTextContent('00:59');

      rerender(<CampaignCountdownComponent timeoutInSeconds={60} />);
      expect(screen.getByTestId('campaign-countdown')).toHaveTextContent('01:00');

      rerender(<CampaignCountdownComponent timeoutInSeconds={125} />);
      expect(screen.getByTestId('campaign-countdown')).toHaveTextContent('02:05');
    });

    it('should handle negative values gracefully', () => {
      render(<CampaignCountdownComponent timeoutInSeconds={-5} />);

      const countdown = screen.getByTestId('campaign-countdown');
      expect(countdown).toHaveTextContent('00:00');
    });
  });

  describe('Countdown Logic', () => {
    it('should decrement the countdown every second', () => {
      render(<CampaignCountdownComponent timeoutInSeconds={5} />);

      expect(screen.getByTestId('campaign-countdown')).toHaveTextContent('00:05');

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('campaign-countdown')).toHaveTextContent('00:04');

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('campaign-countdown')).toHaveTextContent('00:03');
    });

    it('should call onTimeout when countdown reaches zero', () => {
      const onTimeout = jest.fn();
      render(<CampaignCountdownComponent timeoutInSeconds={2} onTimeout={onTimeout} />);

      expect(onTimeout).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('should stop at zero and not go negative', () => {
      render(<CampaignCountdownComponent timeoutInSeconds={1} />);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByTestId('campaign-countdown')).toHaveTextContent('00:00');
    });

    it('should reset countdown when timeoutInSeconds prop changes', () => {
      const {rerender} = render(<CampaignCountdownComponent timeoutInSeconds={10} />);

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('campaign-countdown')).toHaveTextContent('00:07');

      rerender(<CampaignCountdownComponent timeoutInSeconds={20} />);
      expect(screen.getByTestId('campaign-countdown')).toHaveTextContent('00:20');
    });
  });

  describe('Timestamp-based countdown (campaignPreviewOfferTimeout)', () => {
    it('should handle string timestamp from backend', () => {
      const futureTimestamp = String(Date.now() + 30000);
      render(<CampaignCountdownComponent timeoutTimestamp={futureTimestamp} />);

      const countdown = screen.getByTestId('campaign-countdown');
      expect(countdown).toHaveTextContent('00:30');
    });

    it('should handle number timestamp', () => {
      const futureTimestamp = Date.now() + 30000;
      render(<CampaignCountdownComponent timeoutTimestamp={futureTimestamp} />);

      const countdown = screen.getByTestId('campaign-countdown');
      expect(countdown).toHaveTextContent('00:30');
    });

    it('should show 00:00 for past timestamp', () => {
      const pastTimestamp = String(Date.now() - 5000);
      render(<CampaignCountdownComponent timeoutTimestamp={pastTimestamp} />);

      const countdown = screen.getByTestId('campaign-countdown');
      expect(countdown).toHaveTextContent('00:00');
    });

    it('should prioritize timeoutTimestamp over timeoutInSeconds', () => {
      const futureTimestamp = Date.now() + 10000; // 10 seconds
      render(<CampaignCountdownComponent timeoutTimestamp={futureTimestamp} timeoutInSeconds={60} />);

      const countdown = screen.getByTestId('campaign-countdown');
      expect(countdown).toHaveTextContent('00:10');
    });
  });

  describe('Styling', () => {
    it('should have the correct CSS class', () => {
      render(<CampaignCountdownComponent {...defaultProps} />);

      const countdown = screen.getByTestId('campaign-countdown');
      expect(countdown).toHaveClass('task-text');
    });
  });

  describe('Accessibility', () => {
    it('should render as a text element', () => {
      render(<CampaignCountdownComponent {...defaultProps} />);

      const countdown = screen.getByTestId('campaign-countdown');
      expect(countdown.tagName).toBe('MDC-TEXT');
    });
  });
});
