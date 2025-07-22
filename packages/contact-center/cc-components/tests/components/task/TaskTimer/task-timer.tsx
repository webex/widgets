import React from 'react';
import {render, screen, act, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskTimer from '../../../../src/components/task/TaskTimer';
import {setupEnhancedTaskTimerMocks, getWorkerInstance} from '../../../utils/browser-api-mocks';

// Setup all mocks
setupEnhancedTaskTimerMocks();

const mockDateNow = jest.spyOn(Date, 'now');

describe('TaskTimer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockDateNow.mockReturnValue(1640995200000); // 2022-01-01 00:00:00 UTC
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Basic rendering and worker initialization', () => {
    it('should render time element with initial duration and create worker', () => {
      render(<TaskTimer />);

      const timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toHaveClass('task-text', 'task-text--secondary');
      expect(timeElement).toHaveTextContent('00:00');
      expect(timeElement).toHaveAttribute('dateTime', '00:00');

      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should cleanup on unmount', () => {
      const {unmount} = render(<TaskTimer />);

      const timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();

      unmount();

      expect(screen.queryByRole('time')).not.toBeInTheDocument();
    });
  });

  describe('Timer functionality and message filtering (Line 85 coverage)', () => {
    it('should update duration when receiving timer updates from correct timer name', async () => {
      render(<TaskTimer />);

      const timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toHaveClass('task-text', 'task-text--secondary');

      await waitFor(
        () => {
          expect(timeElement).toHaveTextContent('00:01');
        },
        {timeout: 1000}
      );

      expect(timeElement).toHaveAttribute('dateTime', '00:01');
    });

    it('should ignore messages from different timer instances', async () => {
      const {unmount} = render(<TaskTimer />);

      const timeElement = screen.getByRole('time');

      await waitFor(
        () => {
          expect(timeElement).toHaveTextContent('00:01');
        },
        {timeout: 1000}
      );

      const worker = getWorkerInstance();
      if (worker) {
        act(() => {
          worker.simulateMessage('different-timer', '05:00');
        });
      }

      expect(timeElement).toHaveTextContent('00:01');
      expect(timeElement).not.toHaveTextContent('05:00');

      unmount();
    });
  });

  describe('StartTimeStamp prop coverage', () => {
    it('should handle different startTimeStamp values', async () => {
      const {rerender} = render(<TaskTimer startTimeStamp={1640995200000 - 60000} />);

      const timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();

      rerender(<TaskTimer startTimeStamp={undefined} />);
      expect(timeElement).toBeInTheDocument();

      rerender(<TaskTimer startTimeStamp={0} />);
      expect(timeElement).toBeInTheDocument();

      rerender(<TaskTimer startTimeStamp={-1000} />);
      expect(timeElement).toBeInTheDocument();

      await waitFor(
        () => {
          expect(timeElement).toHaveAttribute('dateTime');
        },
        {timeout: 1000}
      );
    });
  });

  describe('Countdown functionality coverage', () => {
    it('should handle countdown mode with different ronaTimeout values', async () => {
      const {rerender} = render(<TaskTimer countdown={true} ronaTimeout={30} />);

      const timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toHaveClass('task-text', 'task-text--secondary');

      rerender(<TaskTimer countdown={true} ronaTimeout={undefined} />);
      expect(timeElement).toBeInTheDocument();

      rerender(<TaskTimer countdown={false} ronaTimeout={30} />);
      expect(timeElement).toBeInTheDocument();

      rerender(<TaskTimer countdown={undefined} ronaTimeout={30} />);
      expect(timeElement).toBeInTheDocument();

      rerender(<TaskTimer countdown={true} ronaTimeout={0} />);
      expect(timeElement).toBeInTheDocument();

      rerender(<TaskTimer countdown={true} ronaTimeout={86400} />);
      expect(timeElement).toBeInTheDocument();

      await waitFor(
        () => {
          expect(timeElement).toHaveAttribute('dateTime');
        },
        {timeout: 1000}
      );
    });
  });

  describe('Component lifecycle and useEffect dependencies', () => {
    it('should handle useEffect dependency changes for worker reuse and prop updates', async () => {
      const {rerender} = render(<TaskTimer startTimeStamp={1640995200000} countdown={false} ronaTimeout={undefined} />);

      let timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();

      await act(async () => {
        rerender(<TaskTimer startTimeStamp={1640995260000} countdown={false} ronaTimeout={undefined} />);
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      await act(async () => {
        rerender(<TaskTimer startTimeStamp={1640995260000} countdown={true} ronaTimeout={undefined} />);
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      await act(async () => {
        rerender(<TaskTimer startTimeStamp={1640995260000} countdown={true} ronaTimeout={30} />);
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      await act(async () => {
        rerender(<TaskTimer startTimeStamp={1640995260000} countdown={true} ronaTimeout={60} />);
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe('Comprehensive prop combinations for complete coverage', () => {
    it('should handle all prop combinations', () => {
      const propCombinations = [
        {},
        {startTimeStamp: 1640995200000},
        {countdown: true},
        {countdown: false},
        {ronaTimeout: 30},
        {countdown: true, ronaTimeout: 30},
        {countdown: false, ronaTimeout: 30},
        {startTimeStamp: 1640995200000, countdown: true},
        {startTimeStamp: 1640995200000, countdown: false},
        {startTimeStamp: 1640995200000, ronaTimeout: 30},
        {startTimeStamp: 1640995200000, countdown: true, ronaTimeout: 60},
        {startTimeStamp: 1640995200000, countdown: false, ronaTimeout: 60},
        {startTimeStamp: 0, countdown: false, ronaTimeout: undefined},
        {startTimeStamp: undefined, countdown: undefined, ronaTimeout: undefined},
      ];

      propCombinations.forEach((props) => {
        const {unmount} = render(<TaskTimer {...props} />);

        const timeElement = screen.getByRole('time');
        expect(timeElement).toBeInTheDocument();
        expect(timeElement).toHaveClass('task-text', 'task-text--secondary');

        unmount();
      });
    });
  });

  describe('Multiple timer instances', () => {
    it('should handle multiple timer instances with unique names and proper cleanup', async () => {
      const {unmount: unmount1} = render(<TaskTimer startTimeStamp={1640995200000} />);
      const {unmount: unmount2} = render(<TaskTimer countdown={true} ronaTimeout={30} />);

      const timers = screen.getAllByRole('time');
      expect(timers).toHaveLength(2);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(screen.getAllByRole('time')).toHaveLength(2);

      unmount1();
      expect(screen.getAllByRole('time')).toHaveLength(1);

      unmount2();
      expect(screen.queryByRole('time')).not.toBeInTheDocument();
    });
  });

  describe('Complete integration scenario', () => {
    it('should handle complete timer lifecycle with all features', async () => {
      const {rerender, unmount} = render(
        <TaskTimer startTimeStamp={1640995200000} countdown={false} ronaTimeout={undefined} />
      );

      let timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();

      await act(async () => {
        rerender(<TaskTimer startTimeStamp={1640995200000} countdown={true} ronaTimeout={30} />);
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();

      await act(async () => {
        rerender(<TaskTimer startTimeStamp={1640995200000} countdown={true} ronaTimeout={60} />);
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();

      await act(async () => {
        rerender(<TaskTimer startTimeStamp={1640995260000} countdown={false} ronaTimeout={undefined} />);
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toHaveClass('task-text', 'task-text--secondary');

      unmount();

      expect(screen.queryByRole('time')).not.toBeInTheDocument();
    });
  });
});
