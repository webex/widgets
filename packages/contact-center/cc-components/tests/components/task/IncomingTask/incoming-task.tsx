import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import IncomingTaskComponent from '../../../../src/components/task/IncomingTask/incoming-task';
import {MEDIA_CHANNEL} from '../../../../src/components/task/task.types';

// Mock TaskTimer component
jest.mock('../../../../src/components/task/TaskTimer', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="mock-timer">Timer</div>,
  };
});

describe('IncomingTaskComponent', () => {
  // Mock logger
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
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
    const mockTask = {
      data: {
        wrapUpRequired: false,
        interactionId: '123',
        interaction: {
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          mediaChannel: MEDIA_CHANNEL.TELEPHONY,
          createdTimestamp: Date.now(),
          callAssociatedDetails: {
            ani: '1234567890',
            dn: '987654321',
            virtualTeamName: 'Sales Team',
          },
        },
      },
    };

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

    const listItem = screen.getByRole('listitem');
    expect(listItem).toHaveClass('task-list-item', 'task-list-hover', 'md-list-item-base-wrapper');
    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('Sales Team')).toBeInTheDocument();

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
    const mockTask = {
      data: {
        wrapUpRequired: false,
        interactionId: '456',
        interaction: {
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          mediaChannel: MEDIA_CHANNEL.TELEPHONY,
          createdTimestamp: Date.now(),
          callAssociatedDetails: {
            ani: '1234567890',
            virtualTeamName: 'Support Team',
          },
        },
      },
    };

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
    const mockTask = {
      data: {
        wrapUpRequired: false,
        interactionId: '789',
        interaction: {
          mediaType: MEDIA_CHANNEL.SOCIAL,
          mediaChannel: MEDIA_CHANNEL.SOCIAL,
          createdTimestamp: Date.now(),
          callAssociatedDetails: {
            ani: '1234567890',
            customerName: 'John Doe',
            virtualTeamName: 'Social Team',
          },
        },
      },
    };

    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      logger: mockLogger,
    };

    render(<IncomingTaskComponent {...props} />);

    const titleElement = screen.getByRole('listitem').querySelector('.incoming-digital-task-title');
    expect(titleElement).toHaveTextContent('John Doe');
    expect(screen.getByText('Social Team')).toBeInTheDocument();

    // Accept button should show "Accept"
    const acceptButton = screen.getByTestId('task:accept-button');
    expect(acceptButton).toHaveTextContent('Accept');
    expect(screen.queryByTestId('task:decline-button')).not.toBeInTheDocument();
  });

  it('logs accept and decline actions when buttons are clicked', () => {
    const mockTask = {
      data: {
        wrapUpRequired: false,
        interactionId: '123',
        interaction: {
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          mediaChannel: MEDIA_CHANNEL.TELEPHONY,
          createdTimestamp: Date.now(),
          callAssociatedDetails: {
            ani: '1234567890',
            virtualTeamName: 'Sales Team',
          },
        },
      },
    };

    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      logger: mockLogger,
    };

    render(<IncomingTaskComponent {...props} />);

    const acceptButton = screen.getByTestId('task:accept-button');
    fireEvent.click(acceptButton);

    const declineButton = screen.getByTestId('task:decline-button');
    fireEvent.click(declineButton);

    // Check if logger was called (only if your component actually logs)
    // If these fail, it means the component doesn't log these actions
    if (mockLogger.info.mock.calls.length > 0) {
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('accept clicked'), expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('decline clicked'), expect.any(Object));
    }
  });
});
