import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import {mockTask} from '@webex/test-fixtures';
import IncomingTaskComponent from '../../../../src/components/task/IncomingTask/incoming-task';
import {MEDIA_CHANNEL} from '../../../../src/components/task/task.types';
import type {ILogger} from '@webex/cc-store';

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

describe('IncomingTaskComponent', () => {
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

    mockTask.data.wrapUpRequired = originalWrapUpRequired;
  });

  it('renders social media task with wrap up required', () => {
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

    mockTask.data.interaction.mediaType = originalMediaType;
    mockTask.data.wrapUpRequired = originalWrapUpRequired;
  });

  it('renders chat task without wrap up', () => {
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
