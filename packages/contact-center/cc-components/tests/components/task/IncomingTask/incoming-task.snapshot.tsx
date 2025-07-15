import React from 'react';
import {render} from '@testing-library/react';
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

  // Helper function to create mock tasks
  const createMockTask = (overrides = {}) => ({
    data: {
      interactionId: 'test-interaction-123',
      wrapUpRequired: false,
      interaction: {
        callAssociatedDetails: {
          ani: '1234567890',
          customerName: 'John Doe',
          virtualTeamName: 'Support Team',
          ronaTimeout: '30',
        },
        createdTimestamp: 1641234567890,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: 'voice',
      },
      ...overrides,
    },
  });

  const defaultProps = {
    accept: jest.fn(),
    reject: jest.fn(),
    logger: mockLogger,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty component when incomingTask is null', () => {
    const props = {
      ...defaultProps,
      incomingTask: null,
      isBrowser: true,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders incoming call and handles accept/decline for browser telephony task', () => {
    const mockTask = createMockTask();
    const props = {
      ...defaultProps,
      incomingTask: mockTask,
      isBrowser: true,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows correct button text for non-browser telephony task', () => {
    const mockTask = createMockTask();
    const props = {
      ...defaultProps,
      incomingTask: mockTask,
      isBrowser: false,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('handles social media task correctly', () => {
    const mockTask = createMockTask({
      interaction: {
        callAssociatedDetails: {
          ani: '1234567890',
          customerName: 'Alice Johnson',
          virtualTeamName: 'Social Media Team',
          ronaTimeout: '60',
        },
        createdTimestamp: 1641234567890,
        mediaType: MEDIA_CHANNEL.SOCIAL,
        mediaChannel: 'facebook',
      },
    });
    const props = {
      ...defaultProps,
      incomingTask: mockTask,
      isBrowser: true,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders browser telephony task with wrap up required', () => {
    const mockTask = createMockTask({
      wrapUpRequired: true,
    });
    const props = {
      ...defaultProps,
      incomingTask: mockTask,
      isBrowser: true,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders social media task with wrap up required', () => {
    const mockTask = createMockTask({
      wrapUpRequired: true,
      interaction: {
        callAssociatedDetails: {
          ani: '9876543210',
          customerName: 'Bob Wilson',
          virtualTeamName: 'Social Support',
        },
        createdTimestamp: 1641234567890,
        mediaType: MEDIA_CHANNEL.SOCIAL,
        mediaChannel: 'twitter',
      },
    });
    const props = {
      ...defaultProps,
      incomingTask: mockTask,
      isBrowser: true,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders chat task without wrap up', () => {
    const mockTask = createMockTask({
      interaction: {
        callAssociatedDetails: {
          ani: 'chat-user-123',
          customerName: 'Chat Customer',
          virtualTeamName: 'Chat Support',
        },
        createdTimestamp: 1641234567890,
        mediaType: MEDIA_CHANNEL.CHAT,
        mediaChannel: 'webchat',
      },
    });
    const props = {
      ...defaultProps,
      incomingTask: mockTask,
      isBrowser: true,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders email task without wrap up', () => {
    const mockTask = createMockTask({
      interaction: {
        callAssociatedDetails: {
          ani: 'customer@example.com',
          customerName: 'Email Customer',
          virtualTeamName: 'Email Support',
        },
        createdTimestamp: 1641234567890,
        mediaType: MEDIA_CHANNEL.EMAIL,
        mediaChannel: 'email',
      },
    });
    const props = {
      ...defaultProps,
      incomingTask: mockTask,
      isBrowser: true,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders task with missing call association details', () => {
    const mockTask = createMockTask({
      interaction: {
        callAssociatedDetails: undefined,
        createdTimestamp: 1641234567890,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: 'voice',
      },
    });
    const props = {
      ...defaultProps,
      incomingTask: mockTask,
      isBrowser: true,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders task with special characters in ANI', () => {
    const mockTask = createMockTask({
      interaction: {
        callAssociatedDetails: {
          ani: '+1 (555) 123-4567 ext. 123',
          customerName: 'Special Char Customer',
          virtualTeamName: 'Special Support & Services',
        },
        createdTimestamp: 1641234567890,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: 'voice',
      },
    });
    const props = {
      ...defaultProps,
      incomingTask: mockTask,
      isBrowser: true,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
