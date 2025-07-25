import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskTimer from '../../../../src/components/task/TaskTimer';

Object.defineProperty(global, 'Worker', {
  writable: true,
  value: class MockWorker {
    constructor() {}
    postMessage = jest.fn();
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    terminate = jest.fn();
  },
});

Object.defineProperty(global, 'URL', {
  writable: true,
  value: {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn(),
  },
});

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

  describe('Rendering', () => {
    it('should render with proper semantic HTML structure and accessibility attributes', async () => {
      render(<TaskTimer />);

      await waitFor(() => {
        const timeElement = screen.getByRole('time');

        // Verify semantic HTML structure
        expect(timeElement.tagName).toBe('TIME');
        expect(timeElement).toHaveClass('task-text', 'task-text--secondary');

        // Verify accessibility attributes
        expect(timeElement).toHaveAttribute('datetime', '00:00');
        expect(timeElement).toHaveTextContent('00:00');

        // Verify worker initialization
        expect(window.URL.createObjectURL).toHaveBeenCalled();
      });
    });

    it('should handle prop combinations with correct DOM attributes and initial state', async () => {
      const oneMinuteAgo = 1640995200000 - 60000;
      const {rerender} = render(<TaskTimer startTimeStamp={oneMinuteAgo} />);

      await waitFor(() => {
        const timeElement = screen.getByRole('time');

        // Verify DOM properties for elapsed time mode
        expect(timeElement).toHaveAttribute('datetime');
        expect(timeElement).toHaveClass('task-text', 'task-text--secondary');
        expect(timeElement.textContent).toMatch(/^\d{2}:\d{2}$/); // MM:SS format
      });

      // Test countdown mode
      rerender(<TaskTimer countdown={true} ronaTimeout={30} />);

      await waitFor(() => {
        const timeElement = screen.getByRole('time');

        // Verify DOM properties for countdown mode
        expect(timeElement).toHaveAttribute('datetime');
        expect(timeElement).toHaveClass('task-text', 'task-text--secondary');
        expect(timeElement.textContent).toMatch(/^\d{2}:\d{2}$/); // MM:SS format
      });

      // Test edge case with undefined props
      rerender(<TaskTimer startTimeStamp={undefined} countdown={undefined} ronaTimeout={undefined} />);

      await waitFor(() => {
        const timeElement = screen.getByRole('time');

        // Verify fallback state
        expect(timeElement).toHaveTextContent('00:00');
        expect(timeElement).toHaveAttribute('datetime', '00:00');
        expect(timeElement).toHaveClass('task-text', 'task-text--secondary');
      });
    });
  });
});
