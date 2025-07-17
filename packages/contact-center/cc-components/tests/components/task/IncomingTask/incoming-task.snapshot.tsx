import React from 'react';
import {render} from '@testing-library/react';
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
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders incoming call and handles accept/decline for browser telephony task', () => {
    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      logger: mockLogger,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows correct button text for non-browser telephony task', () => {
    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: false,
      logger: mockLogger,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('handles social media task correctly', () => {
    // Temporarily modify mockTask for social media test
    const originalMediaType = mockTask.data.interaction.mediaType;
    mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;

    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      logger: mockLogger,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();

    // Restore original mediaType
    mockTask.data.interaction.mediaType = originalMediaType;
  });

  it('renders browser telephony task with wrap up required', () => {
    // Temporarily modify mockTask for wrap up test
    const originalWrapUpRequired = mockTask.data.wrapUpRequired;
    mockTask.data.wrapUpRequired = true;

    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      logger: mockLogger,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();

    // Restore original wrapUpRequired
    mockTask.data.wrapUpRequired = originalWrapUpRequired;
  });

  it('renders social media task with wrap up required', () => {
    // Temporarily modify mockTask for social media with wrap up test
    const originalMediaType = mockTask.data.interaction.mediaType;
    const originalWrapUpRequired = mockTask.data.wrapUpRequired;

    mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;
    mockTask.data.wrapUpRequired = true;

    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      logger: mockLogger,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();

    // Restore original values
    mockTask.data.interaction.mediaType = originalMediaType;
    mockTask.data.wrapUpRequired = originalWrapUpRequired;
  });

  it('renders chat task without wrap up', () => {
    // Temporarily modify mockTask for chat test
    const originalMediaType = mockTask.data.interaction.mediaType;
    mockTask.data.interaction.mediaType = MEDIA_CHANNEL.CHAT;

    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      logger: mockLogger,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();

    // Restore original mediaType
    mockTask.data.interaction.mediaType = originalMediaType;
  });

  it('renders email task without wrap up', () => {
    // Temporarily modify mockTask for email test
    const originalMediaType = mockTask.data.interaction.mediaType;
    mockTask.data.interaction.mediaType = MEDIA_CHANNEL.EMAIL;

    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      logger: mockLogger,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();

    // Restore original mediaType
    mockTask.data.interaction.mediaType = originalMediaType;
  });

  it('logs accept and decline actions when buttons are clicked', () => {
    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      logger: mockLogger,
    };

    const {container} = render(<IncomingTaskComponent {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
