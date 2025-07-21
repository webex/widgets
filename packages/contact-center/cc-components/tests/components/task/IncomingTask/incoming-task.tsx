import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import {mockTask} from '@webex/test-fixtures';
import IncomingTaskComponent from '../../../../src/components/task/IncomingTask/incoming-task';
import {MEDIA_CHANNEL} from '../../../../src/components/task/task.types';
import type {ILogger} from '@webex/cc-store';

// Mock TaskTimer component
jest.mock('../../../../src/components/task/TaskTimer', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="mock-timer">Timer</div>,
  };
});

describe('IncomingTaskComponent', () => {
  // Mock logger with all required ILogger methods
  const mockLogger: ILogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty component when incomingTask is null', () => {
    const props = {
      incomingTask: null,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      logger: mockLogger,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders incoming call and handles accept/decline for browser telephony task', () => {
    const acceptMock = jest.fn();
    const rejectMock = jest.fn();

    const props = {
      incomingTask: mockTask,
      accept: acceptMock,
      reject: rejectMock,
      isBrowser: true,
      logger: mockLogger,
    };

    render(<IncomingTaskComponent {...props} />);

    // Check basic rendering - use the actual rendered element
    expect(screen.getByRole('listitem')).toBeInTheDocument();

    // Alternative: Check for the task-list-item class
    // expect(document.querySelector('.task-list-item')).toBeInTheDocument();

    const acceptButton = screen.getByTestId('task:accept-button');
    expect(acceptButton).toHaveTextContent('Accept');
    fireEvent.click(acceptButton);
    expect(acceptMock).toHaveBeenCalledWith(mockTask);

    const declineButton = screen.getByTestId('task:decline-button');
    expect(declineButton).toHaveTextContent('Decline');
    fireEvent.click(declineButton);
    expect(rejectMock).toHaveBeenCalledWith(mockTask);
  });

  it('shows correct button text for non-browser telephony task', () => {
    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: false,
      logger: mockLogger,
    };

    render(<IncomingTaskComponent {...props} />);

    // For non-browser telephony, accept button should show "Ringing..."
    const acceptButton = screen.getByTestId('task:accept-button');
    expect(acceptButton).toHaveTextContent('Ringing...');
    expect(acceptButton).toBeDisabled();

    // Decline button should not be visible for non-browser
    expect(screen.queryByTestId('task:decline-button')).not.toBeInTheDocument();
  });

  it('handles social media task correctly', () => {
    const originalMediaType = mockTask.data.interaction.mediaType;
    mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;

    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      logger: mockLogger,
    };

    render(<IncomingTaskComponent {...props} />);

    // Accept button should show "Accept"
    const acceptButton = screen.getByTestId('task:accept-button');
    expect(acceptButton).toHaveTextContent('Accept');
    expect(screen.queryByTestId('task:decline-button')).not.toBeInTheDocument();

    // Restore original mediaType
    mockTask.data.interaction.mediaType = originalMediaType;
  });
});
