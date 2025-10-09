import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import {mockTask, mockTaskData} from '@webex/test-fixtures';
import TaskListComponent from '../../../../src/components/task/TaskList/task-list';
import {TaskListComponentProps, MEDIA_CHANNEL} from '../../../../src/components/task/task.types';
import type {ILogger} from '@webex/cc-store';
import * as taskListUtils from '../../../../src/components/task/TaskList/task-list.utils';

// Simple Worker mock
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

describe('TaskListComponent', () => {
  // Mock functions
  const mockAcceptTask = jest.fn();
  const mockDeclineTask = jest.fn();
  const mockOnTaskSelect = jest.fn();
  const mockLogger: ILogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  };

  // Default props using TaskListComponentProps interface
  const defaultProps: TaskListComponentProps = {
    currentTask: null,
    taskList: null,
    acceptTask: mockAcceptTask,
    declineTask: mockDeclineTask,
    isBrowser: true,
    onTaskSelect: mockOnTaskSelect,
    logger: mockLogger,
    agentId: mockTask.data.agentId,
  };

  // Utility function spies
  const isTaskListEmptySpy = jest.spyOn(taskListUtils, 'isTaskListEmpty');
  const getTasksArraySpy = jest.spyOn(taskListUtils, 'getTasksArray');
  const extractTaskListItemDataSpy = jest.spyOn(taskListUtils, 'extractTaskListItemData');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    isTaskListEmptySpy.mockRestore();
    getTasksArraySpy.mockRestore();
    extractTaskListItemDataSpy.mockRestore();
  });

  describe('Empty TaskList Scenarios', () => {
    it('should return empty component when taskList is null or undefined', async () => {
      // Test with null
      const propsWithNull: TaskListComponentProps = {
        ...defaultProps,
        taskList: null,
      };

      const {container: containerNull} = await render(<TaskListComponent {...propsWithNull} />);
      expect(containerNull).toMatchSnapshot();

      // Test with undefined
      const propsWithUndefined: TaskListComponentProps = {
        ...defaultProps,
        taskList: undefined,
      };

      const {container: containerUndefined} = await render(<TaskListComponent {...propsWithUndefined} />);
      expect(containerUndefined).toMatchSnapshot();
    });

    it('should return empty component when taskList is empty object', async () => {
      const propsWithEmptyObject: TaskListComponentProps = {
        ...defaultProps,
        taskList: {}, // Empty object
      };

      const {container} = await render(<TaskListComponent {...propsWithEmptyObject} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Rendering with Tasks', () => {
    const sampleTask = {
      ...mockTask,
      data: {
        ...mockTask.data,
        interactionId: 'test-task-123',
        interaction: {
          ...mockTask.data.interaction,
          state: 'active',
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          callAssociatedDetails: {
            ani: '1234567890',
            customerName: 'John Doe',
            virtualTeamName: 'Support Team',
          },
        },
      },
    };

    beforeEach(() => {
      extractTaskListItemDataSpy.mockReturnValue(mockTaskData.active.telephony);
    });

    it('should render multiple tasks with different media types and their corresponding icons and labels', async () => {
      // Create telephony task
      const telephonyTask = {
        ...sampleTask,
        data: {
          ...sampleTask.data,
          interactionId: 'telephony-task',
          interaction: {
            ...sampleTask.data.interaction,
            state: 'active',
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Telephony Customer',
              virtualTeamName: 'Telephony Team',
            },
          },
        },
      };

      // Create chat task
      const chatTask = {
        ...sampleTask,
        data: {
          ...sampleTask.data,
          interactionId: 'chat-task',
          interaction: {
            ...sampleTask.data.interaction,
            state: 'active',
            mediaType: MEDIA_CHANNEL.CHAT,
            callAssociatedDetails: {
              ani: 'chat-user-123',
              customerName: 'Chat Customer',
              virtualTeamName: 'Chat Team',
            },
          },
        },
      };

      // Create social (Facebook) task
      const socialTask = {
        ...sampleTask,
        data: {
          ...sampleTask.data,
          interactionId: 'social-task',
          interaction: {
            ...sampleTask.data.interaction,
            state: 'active',
            mediaType: MEDIA_CHANNEL.SOCIAL,
            mediaChannel: MEDIA_CHANNEL.FACEBOOK,
            callAssociatedDetails: {
              ani: 'facebook-user-456',
              customerName: 'Facebook Customer',
              virtualTeamName: 'Social Team',
            },
          },
        },
      };

      // Mock different return values for each media type using common data
      extractTaskListItemDataSpy
        .mockReturnValueOnce(mockTaskData.active.telephony)
        .mockReturnValueOnce(mockTaskData.active.chat)
        .mockReturnValueOnce(mockTaskData.active.facebook);

      const taskList = {
        'telephony-task': telephonyTask,
        'chat-task': chatTask,
        'social-task': socialTask,
      };

      const {container} = await render(<TaskListComponent {...defaultProps} taskList={taskList} />);
      expect(container).toMatchSnapshot();
    });

    it('should show selected state with bold title', async () => {
      const taskList = {'test-task-123': sampleTask};
      const {container} = await render(
        <TaskListComponent {...defaultProps} taskList={taskList} currentTask={sampleTask} />
      );
      expect(container).toMatchSnapshot();
    });

    it('should render telephony incoming task with Accept/Decline buttons in WebRTC mode', async () => {
      extractTaskListItemDataSpy.mockReturnValue(mockTaskData.incoming.webrtcTelephony);

      const incomingTask = {
        ...sampleTask,
        data: {
          ...sampleTask.data,
          interactionId: 'webrtc-telephony-task',
          interaction: {
            ...sampleTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.TELEPHONY,
          },
          wrapUpRequired: false,
        },
      };

      const {container} = await render(
        <TaskListComponent {...defaultProps} taskList={{'webrtc-telephony-task': incomingTask}} isBrowser={true} />
      );
      expect(container).toMatchSnapshot();
    });

    it('should render telephony incoming task with disabled Accept button in Extension mode', async () => {
      extractTaskListItemDataSpy.mockReturnValue(mockTaskData.incoming.extensionTelephony);

      const incomingTask = {
        ...sampleTask,
        data: {
          ...sampleTask.data,
          interactionId: 'extension-telephony-task',
          interaction: {
            ...sampleTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.TELEPHONY,
          },
          wrapUpRequired: false,
        },
      };

      const {container} = await render(
        <TaskListComponent {...defaultProps} taskList={{'extension-telephony-task': incomingTask}} isBrowser={false} />
      );
      expect(container).toMatchSnapshot();
    });

    it('should render digital incoming task with Accept button only', async () => {
      extractTaskListItemDataSpy.mockReturnValue(mockTaskData.incoming.chat);

      const incomingChatTask = {
        ...sampleTask,
        data: {
          ...sampleTask.data,
          interactionId: 'incoming-chat-task',
          interaction: {
            ...sampleTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.CHAT,
          },
          wrapUpRequired: false,
        },
      };

      const {container} = await render(
        <TaskListComponent {...defaultProps} taskList={{'incoming-chat-task': incomingChatTask}} isBrowser={true} />
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Actions', () => {
    const actionTask = {
      ...mockTask,
      data: {
        ...mockTask.data,
        interactionId: 'action-task',
        interaction: {
          ...mockTask.data.interaction,
          state: 'new',
          mediaType: MEDIA_CHANNEL.TELEPHONY,
        },
        wrapUpRequired: false,
      },
    };

    beforeEach(() => {
      extractTaskListItemDataSpy.mockReturnValue(mockTaskData.action.telephony);
    });

    it('should call acceptTask when accept button is clicked', async () => {
      const taskList = {'action-task': actionTask};
      const {container} = await render(<TaskListComponent {...defaultProps} taskList={taskList} />);

      expect(container).toMatchSnapshot();

      const acceptButton = container.querySelector('[data-testid="task:accept-button"]') as HTMLElement;
      fireEvent.click(acceptButton);

      expect(container).toMatchSnapshot();
    });

    it('should call declineTask when decline button is clicked', async () => {
      const taskList = {'action-task': actionTask};
      const {container} = await render(<TaskListComponent {...defaultProps} taskList={taskList} />);

      expect(container).toMatchSnapshot();

      const declineButton = container.querySelector('[data-testid="task:decline-button"]') as HTMLElement;
      fireEvent.click(declineButton);

      expect(container).toMatchSnapshot();
    });

    it('should call onTaskSelect when task is clicked', async () => {
      extractTaskListItemDataSpy.mockReturnValue(mockTaskData.action.activeTask);

      const activeTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'active-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'active',
            mediaType: MEDIA_CHANNEL.TELEPHONY,
          },
        },
      };

      const taskList = {'active-task': activeTask};
      const {container} = await render(<TaskListComponent {...defaultProps} taskList={taskList} currentTask={null} />);

      expect(container).toMatchSnapshot();

      const taskElement = container.querySelector('[role="listitem"]') as HTMLElement;
      fireEvent.click(taskElement);

      expect(container).toMatchSnapshot();
    });

    it('should handle task selection between multiple tasks', async () => {
      // Create second task as CHAT task with different mock data
      const secondTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'unselected-chat-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'active',
            mediaType: MEDIA_CHANNEL.CHAT,
          },
        },
      };

      // Mock different return values for each task using common data
      extractTaskListItemDataSpy
        .mockReturnValueOnce(mockTaskData.selection.selectedTelephony)
        .mockReturnValueOnce(mockTaskData.selection.unselectedChat);

      const taskList = {
        'action-task': actionTask,
        'unselected-chat-task': secondTask,
      };

      const {container} = await render(
        <TaskListComponent {...defaultProps} taskList={taskList} currentTask={actionTask} />
      );

      // Capture initial state with selected telephony task
      expect(container).toMatchSnapshot();

      const taskElements = container.querySelectorAll('[role="listitem"]');
      const unselectedTaskElement = taskElements[1] as HTMLElement;
      fireEvent.click(unselectedTaskElement);

      // Capture state after clicking unselected chat task
      expect(container).toMatchSnapshot();
    });
  });
});
