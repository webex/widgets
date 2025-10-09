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
    agentId: '',
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

      const screenNull = await render(<TaskListComponent {...propsWithNull} />);

      expect(isTaskListEmptySpy).toHaveBeenCalledWith(null);
      expect(screenNull.container).toBeEmptyDOMElement();
      expect(screenNull.queryByTestId('task-list')).not.toBeInTheDocument();
      expect(getTasksArraySpy).not.toHaveBeenCalled();

      jest.clearAllMocks();

      // Test with undefined
      const propsWithUndefined: TaskListComponentProps = {
        ...defaultProps,
        taskList: undefined,
      };

      const screenUndefined = await render(<TaskListComponent {...propsWithUndefined} />);

      expect(isTaskListEmptySpy).toHaveBeenCalledWith(undefined);
      expect(screenUndefined.container).toBeEmptyDOMElement();
      expect(screenUndefined.queryByTestId('task-list')).not.toBeInTheDocument();
      expect(getTasksArraySpy).not.toHaveBeenCalled();
    });

    it('should return empty component when taskList is empty object', async () => {
      const propsWithEmptyObject: TaskListComponentProps = {
        ...defaultProps,
        taskList: {}, // Empty object
      };

      const screen = await render(<TaskListComponent {...propsWithEmptyObject} />);

      expect(isTaskListEmptySpy).toHaveBeenCalledWith({});
      expect(screen.container).toBeEmptyDOMElement();
      expect(screen.queryByTestId('task-list')).not.toBeInTheDocument();
      expect(getTasksArraySpy).not.toHaveBeenCalled();
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

      const props: TaskListComponentProps = {
        ...defaultProps,
        taskList,
      };

      const screen = await render(<TaskListComponent {...props} />);
      // Verify task list structure
      const taskListElement = screen.getByTestId('task-list');
      expect(taskListElement).toBeInTheDocument();
      expect(taskListElement.tagName).toBe('UL');
      expect(taskListElement).toHaveClass('task-list');

      // Verify correct number of tasks rendered
      expect(getTasksArraySpy).toHaveBeenCalledWith(taskList);
      expect(extractTaskListItemDataSpy).toHaveBeenCalledTimes(3);

      const taskItems = screen.getAllByRole('listitem');
      expect(taskItems).toHaveLength(3);

      // Test each task has common attributes
      taskItems.forEach((taskItem) => {
        expect(taskItem).toHaveClass('task-list-item', 'md-list-item-base-wrapper');
        expect(taskItem).toHaveAttribute('data-interactive', 'true');
        expect(taskItem).toHaveAttribute('data-size', '40');
        expect(taskItem).toHaveAttribute('role', 'listitem');
        expect(taskItem).toHaveAttribute('tabindex', '0');
      });

      // Verify telephony task (first task)
      const telephonyTaskElement = taskItems[0];
      expect(telephonyTaskElement).toHaveAttribute('id', 'telephony-task');
      expect(telephonyTaskElement).toHaveClass('task-list-item');
      expect(telephonyTaskElement).toHaveAttribute('data-allow-text-select', 'false');
      expect(telephonyTaskElement).toHaveAttribute('data-disabled', 'false');
      expect(telephonyTaskElement).toHaveAttribute('data-padded', 'false');
      expect(telephonyTaskElement).toHaveAttribute('data-shape', 'rectangle');

      const telephonyAvatar = telephonyTaskElement.querySelector('mdc-avatar') as HTMLElement;
      expect(telephonyAvatar).toHaveClass('telephony');
      expect(telephonyAvatar).toHaveAttribute('icon-name', 'handset-filled');
      expect(telephonyAvatar).toHaveAttribute('size', '32');

      const telephonyTitle = telephonyTaskElement.querySelector('.task-title') as HTMLElement;
      expect(telephonyTitle).toHaveTextContent('1234567890');
      expect(telephonyTitle).toHaveAttribute('type', 'body-large-medium');
      expect(telephonyTitle).toHaveAttribute('tagname', 'span');

      // Verify chat task (second task)
      const chatTaskElement = taskItems[1];
      expect(chatTaskElement).toHaveAttribute('id', 'chat-task');
      const chatAvatar = chatTaskElement.querySelector('mdc-avatar') as HTMLElement;
      expect(chatAvatar).toHaveClass('chat');
      expect(chatAvatar).toHaveAttribute('icon-name', 'chat-filled');
      expect(chatAvatar).toHaveAttribute('size', '32');

      const chatTitle = chatTaskElement.querySelector('.task-digital-title') as HTMLElement;
      expect(chatTitle).toHaveTextContent('Chat Customer');
      expect(chatTitle).toHaveAttribute('type', 'body-large-medium');
      expect(chatTitle).toHaveAttribute('aria-describedby', 'tooltip-chat-task');
      expect(chatTitle).toHaveAttribute('id', 'tooltip-trigger-chat-task');

      // Verify chat tooltip
      const chatTooltip = chatTaskElement.querySelector('mdc-tooltip') as HTMLElement;
      expect(chatTooltip).toBeInTheDocument();
      expect(chatTooltip).toHaveAttribute('role', 'tooltip');
      expect(chatTooltip).toHaveAttribute('id', 'tooltip-chat-task');
      expect(chatTooltip).toHaveTextContent('Chat Customer');

      // Verify social (Facebook) task (third task) - Different structure!
      const socialTaskElement = taskItems[2];
      expect(socialTaskElement).toHaveAttribute('id', 'social-task');

      // Facebook uses brand-visual-background instead of mdc-avatar
      const brandVisualBackground = socialTaskElement.querySelector('.brand-visual-background') as HTMLElement;
      expect(brandVisualBackground).toBeInTheDocument();

      const socialBrandVisual = socialTaskElement.querySelector('mdc-brandvisual') as HTMLElement;
      expect(socialBrandVisual).toHaveClass('facebook');
      expect(socialBrandVisual).toHaveAttribute('name', 'social-facebook-color');

      const socialTitle = socialTaskElement.querySelector('.task-digital-title') as HTMLElement;
      expect(socialTitle).toHaveTextContent('Facebook Customer');
      expect(socialTitle).toHaveAttribute('type', 'body-large-medium');
      expect(socialTitle).toHaveAttribute('aria-describedby', 'tooltip-social-task');
      expect(socialTitle).toHaveAttribute('id', 'tooltip-trigger-social-task');

      // Verify social tooltip
      const socialTooltip = socialTaskElement.querySelector('mdc-tooltip') as HTMLElement;
      expect(socialTooltip).toBeInTheDocument();
      expect(socialTooltip).toHaveAttribute('role', 'tooltip');
      expect(socialTooltip).toHaveAttribute('id', 'tooltip-social-task');
      expect(socialTooltip).toHaveTextContent('Facebook Customer');

      // Verify each task has proper layout structure
      taskItems.forEach((taskItem) => {
        const startDiv = taskItem.querySelector('[data-position="start"]') as HTMLElement;
        const fillDiv = taskItem.querySelector('[data-position="fill"]') as HTMLElement;
        const endDiv = taskItem.querySelector('[data-position="end"]') as HTMLElement;

        expect(startDiv).toBeInTheDocument();
        expect(fillDiv).toBeInTheDocument();
        expect(endDiv).toBeInTheDocument();

        // Each task should have task details section
        const taskDetails = taskItem.querySelector('.task-details') as HTMLElement;
        expect(taskDetails.tagName).toBe('SECTION');
        expect(fillDiv).toContainElement(taskDetails);

        // Each task should have empty button container for active tasks
        const buttonContainer = taskItem.querySelector('.task-button-container') as HTMLElement;
        expect(buttonContainer).toBeInTheDocument();
        expect(buttonContainer.children).toHaveLength(0); // No buttons for active tasks
      });

      // Verify task status and time elements for all tasks
      taskItems.forEach((taskItem) => {
        const taskTextElements = taskItem.querySelectorAll('mdc-text.task-text');
        expect(taskTextElements[0]).toHaveTextContent('Active');
        expect(taskTextElements[1]).toHaveTextContent('Handle Time:');

        const timeElement = taskItem.querySelector('time') as HTMLElement;
        expect(timeElement).toHaveTextContent('00:00');
        expect(timeElement).toHaveAttribute('datetime', '00:00');
        expect(timeElement).toHaveClass('task-text', 'task-text--secondary');
      });

      // Verify utility function calls
      const extractedData = extractTaskListItemDataSpy.mock.results;
      expect(extractedData[0].value.mediaType).toBe(MEDIA_CHANNEL.TELEPHONY);
      expect(extractedData[0].value.isTelephony).toBe(true);
      expect(extractedData[1].value.mediaType).toBe(MEDIA_CHANNEL.CHAT);
      expect(extractedData[1].value.isTelephony).toBe(false);
      expect(extractedData[2].value.mediaType).toBe(MEDIA_CHANNEL.SOCIAL);
      expect(extractedData[2].value.mediaChannel).toBe(MEDIA_CHANNEL.FACEBOOK);
      expect(extractedData[2].value.isSocial).toBe(true);
    });

    it('should show selected state with bold title', async () => {
      const taskList = {'test-task-123': sampleTask};
      const props: TaskListComponentProps = {
        ...defaultProps,
        taskList,
        currentTask: sampleTask,
      };

      const screen = await render(<TaskListComponent {...props} />);

      const taskElement = screen.getByRole('listitem');
      expect(taskElement).toHaveClass('task-list-item--selected');

      const taskTitle = screen.container.querySelector('.task-title') as HTMLElement;
      expect(taskTitle).toHaveAttribute('type', 'body-large-bold');
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

      const props: TaskListComponentProps = {
        ...defaultProps,
        taskList: {'webrtc-telephony-task': incomingTask},
        isBrowser: true, // WebRTC mode
      };

      const screen = await render(<TaskListComponent {...props} />);

      // Verify both buttons are present
      const acceptButton = screen.getByTestId('task:accept-button');
      const declineButton = screen.getByTestId('task:decline-button');

      expect(acceptButton).toHaveAttribute('data-color', 'join');
      expect(acceptButton).toHaveTextContent('Accept');
      expect(acceptButton).toHaveAttribute('data-disabled', 'false');

      expect(declineButton).toHaveAttribute('data-color', 'cancel');
      expect(declineButton).toHaveTextContent('Decline');

      // Verify button container has both buttons
      const buttonContainer = screen.container.querySelector('.task-button-container') as HTMLElement;
      expect(buttonContainer.children).toHaveLength(2);

      // Verify task content for incoming tasks
      const taskTextElements = screen.container.querySelectorAll('mdc-text.task-text');
      expect(taskTextElements[0]).toHaveTextContent('Support'); // Queue name
      expect(taskTextElements[1]).toHaveTextContent('Time Left:'); // Incoming task timing
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

      const props: TaskListComponentProps = {
        ...defaultProps,
        taskList: {'extension-telephony-task': incomingTask},
        isBrowser: false, // Extension mode
      };

      const screen = await render(<TaskListComponent {...props} />);

      // Verify only accept button (disabled, showing "Ringing...")
      const acceptButton = screen.getByTestId('task:accept-button');
      expect(acceptButton).toHaveAttribute('data-color', 'join');
      expect(acceptButton).toHaveTextContent('Ringing...');
      expect(acceptButton).toHaveAttribute('data-disabled', 'true');

      // Verify no decline button in extension mode
      expect(screen.queryByTestId('task:decline-button')).not.toBeInTheDocument();

      // Verify button container has only one button
      const buttonContainer = screen.container.querySelector('.task-button-container') as HTMLElement;
      expect(buttonContainer.children).toHaveLength(1);
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

      const props: TaskListComponentProps = {
        ...defaultProps,
        taskList: {'incoming-chat-task': incomingChatTask},
        isBrowser: true,
      };

      const screen = await render(<TaskListComponent {...props} />);

      // Verify only accept button for digital channels
      const acceptButton = screen.getByTestId('task:accept-button');
      expect(acceptButton).toHaveAttribute('data-color', 'join');
      expect(acceptButton).toHaveTextContent('Accept');
      expect(acceptButton).toHaveAttribute('data-disabled', 'false');

      // Verify no decline button for digital channels
      expect(screen.queryByTestId('task:decline-button')).not.toBeInTheDocument();

      // Verify button container has only one button
      const buttonContainer = screen.container.querySelector('.task-button-container') as HTMLElement;
      expect(buttonContainer.children).toHaveLength(1);

      // Verify digital incoming task uses specific class name for incoming digital tasks
      const digitalTitle = screen.container.querySelector('.incoming-digital-task-title') as HTMLElement;
      expect(digitalTitle).toHaveTextContent('Chat Customer');
      expect(digitalTitle).toHaveAttribute('aria-describedby', 'tooltip-incoming-chat-task');
      expect(digitalTitle).toHaveAttribute('id', 'tooltip-trigger-incoming-chat-task');
      expect(digitalTitle).toHaveAttribute('type', 'body-large-medium');

      // Verify chat avatar
      const chatAvatar = screen.container.querySelector('mdc-avatar') as HTMLElement;
      expect(chatAvatar).toHaveClass('chat');
      expect(chatAvatar).toHaveAttribute('icon-name', 'chat-filled');
      expect(chatAvatar).toHaveAttribute('size', '32');

      // Verify digital task tooltip
      const digitalTooltip = screen.container.querySelector('mdc-tooltip') as HTMLElement;
      expect(digitalTooltip).toBeInTheDocument();
      expect(digitalTooltip).toHaveAttribute('role', 'tooltip');
      expect(digitalTooltip).toHaveAttribute('id', 'tooltip-incoming-chat-task');
      expect(digitalTooltip).toHaveTextContent('Chat Customer');

      // Verify task content for incoming digital tasks
      const taskTextElements = screen.container.querySelectorAll('mdc-text.task-text');
      expect(taskTextElements[0]).toHaveTextContent('Chat Support'); // Queue name instead of "Active"
      expect(taskTextElements[1]).toHaveTextContent('Time Left:'); // Incoming task timing

      // Verify time element
      const timeElement = screen.container.querySelector('time') as HTMLElement;
      expect(timeElement).toHaveTextContent('00:00');
      expect(timeElement).toHaveAttribute('datetime', '00:00');
      expect(timeElement).toHaveClass('task-text', 'task-text--secondary');
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
      const props: TaskListComponentProps = {
        ...defaultProps,
        taskList,
      };

      const screen = await render(<TaskListComponent {...props} />);

      const acceptButton = screen.getByTestId('task:accept-button');
      fireEvent.click(acceptButton);

      expect(mockAcceptTask).toHaveBeenCalledTimes(1);
      expect(mockAcceptTask).toHaveBeenCalledWith(actionTask);
    });

    it('should call declineTask when decline button is clicked', async () => {
      const taskList = {'action-task': actionTask};
      const props: TaskListComponentProps = {
        ...defaultProps,
        taskList,
      };

      const screen = await render(<TaskListComponent {...props} />);

      const declineButton = screen.getByTestId('task:decline-button');
      fireEvent.click(declineButton);

      expect(mockDeclineTask).toHaveBeenCalledTimes(1);
      expect(mockDeclineTask).toHaveBeenCalledWith(actionTask);
    });

    it('should call onTaskSelect when task is clicked', async () => {
      // Create an ACTIVE task without buttons for this test
      const activeTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'active-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'active', // Active task, not incoming
            mediaType: MEDIA_CHANNEL.TELEPHONY,
          },
        },
      };

      // Mock return value for ACTIVE task (no buttons)
      extractTaskListItemDataSpy.mockReturnValue(mockTaskData.action.activeTask);

      const taskList = {'active-task': activeTask};
      const props: TaskListComponentProps = {
        ...defaultProps,
        taskList,
        currentTask: null,
      };

      const screen = await render(<TaskListComponent {...props} />);

      const taskElement = screen.getByRole('listitem');

      // Verify this is an active task without buttons
      const buttonContainer = screen.container.querySelector('.task-button-container') as HTMLElement;
      expect(buttonContainer.children).toHaveLength(0); // No buttons for active task

      fireEvent.click(taskElement);

      expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);
      expect(mockOnTaskSelect).toHaveBeenCalledWith(activeTask);
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

      // Get both task elements
      const taskElements = container.querySelectorAll('[role="listitem"]');
      const selectedTaskElement = taskElements[0]; // action-task (telephony)
      const unselectedTaskElement = taskElements[1]; // unselected-chat-task (chat)

      // Verify initial selection state
      expect(selectedTaskElement).toHaveClass('task-list-item--selected');
      expect(selectedTaskElement).toHaveAttribute('id', 'action-task');
      expect(unselectedTaskElement).not.toHaveClass('task-list-item--selected');
      expect(unselectedTaskElement).toHaveAttribute('id', 'unselected-chat-task');

      // Verify visual differences for selected vs unselected tasks
      // Selected task should have bold title
      const selectedTitle = selectedTaskElement.querySelector('.task-title') as HTMLElement;
      expect(selectedTitle).toHaveAttribute('type', 'body-large-bold');
      expect(selectedTitle).toHaveTextContent('1111111111'); // Phone number

      // Unselected task should have normal weight title
      const unselectedTitle = unselectedTaskElement.querySelector('.task-digital-title') as HTMLElement;
      expect(unselectedTitle).toHaveAttribute('type', 'body-large-medium');
      expect(unselectedTitle).toHaveTextContent('Unselected Chat Customer'); // Customer name

      // Verify different media type characteristics
      const telephonyAvatar = selectedTaskElement.querySelector('mdc-avatar') as HTMLElement;
      expect(telephonyAvatar).toHaveClass('telephony');
      expect(telephonyAvatar).toHaveAttribute('icon-name', 'handset-filled');

      const chatAvatar = unselectedTaskElement.querySelector('mdc-avatar') as HTMLElement;
      expect(chatAvatar).toHaveClass('chat');
      expect(chatAvatar).toHaveAttribute('icon-name', 'chat-filled');

      // Digital tasks have tooltips, telephony doesn't
      const chatTooltip = unselectedTaskElement.querySelector('mdc-tooltip');
      expect(chatTooltip).toBeInTheDocument();
      expect(chatTooltip).toHaveAttribute('role', 'tooltip');

      const telephonyTooltip = selectedTaskElement.querySelector('mdc-tooltip');
      expect(telephonyTooltip).not.toBeInTheDocument();

      // Verify selected task has buttons (incoming), unselected task doesn't (active)
      const selectedButtonContainer = selectedTaskElement.querySelector('.task-button-container') as HTMLElement;
      expect(selectedButtonContainer.children).toHaveLength(2); // Accept & Decline buttons

      const unselectedButtonContainer = unselectedTaskElement.querySelector('.task-button-container') as HTMLElement;
      expect(unselectedButtonContainer.children).toHaveLength(0); // No buttons for active task

      // Test task interaction - clicking unselected task
      fireEvent.click(unselectedTaskElement);

      // Verify onTaskSelect was called with the correct task
      expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);
      expect(mockOnTaskSelect).toHaveBeenCalledWith(secondTask);

      // Re-verify selection state after click (Note: In this test, the selection state doesn't change
      // because the parent component would handle the state update. This verifies current behavior)
      expect(selectedTaskElement).toHaveClass('task-list-item--selected');
      expect(selectedTaskElement).toHaveAttribute('id', 'action-task');
      expect(unselectedTaskElement).not.toHaveClass('task-list-item--selected');
      expect(unselectedTaskElement).toHaveAttribute('id', 'unselected-chat-task');

      // Verify utility function calls
      expect(extractTaskListItemDataSpy).toHaveBeenCalledTimes(2);
      const extractedData = extractTaskListItemDataSpy.mock.results;
      expect(extractedData[0].value.mediaType).toBe(MEDIA_CHANNEL.TELEPHONY);
      expect(extractedData[0].value.isIncomingTask).toBe(true);
      expect(extractedData[1].value.mediaType).toBe(MEDIA_CHANNEL.CHAT);
      expect(extractedData[1].value.isIncomingTask).toBe(false);

      // Additional verification: ensure task content reflects different states
      const selectedTaskTexts = selectedTaskElement.querySelectorAll('mdc-text.task-text');
      expect(selectedTaskTexts[0]).toHaveTextContent('Selected Team'); // Queue name for incoming
      expect(selectedTaskTexts[1]).toHaveTextContent('Time Left:'); // Incoming task timing

      const unselectedTaskTexts = unselectedTaskElement.querySelectorAll('mdc-text.task-text');
      expect(unselectedTaskTexts[0]).toHaveTextContent('Active'); // Status for active task
      expect(unselectedTaskTexts[1]).toHaveTextContent('Handle Time:'); // Active task timing
    });
  });
});
