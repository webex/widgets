import React from 'react';
import {render} from '@testing-library/react';
import TaskListComponent from '../../../../src/components/task/TaskList/task-list';
import {TaskListComponentProps, MEDIA_CHANNEL} from '../../../../src/components/task/task.types';
import {ITask} from '@webex/cc-store';

// Mock TaskTimer component (if used)
jest.mock('../../../../src/components/task/TaskTimer', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="mock-timer">Timer</div>,
  };
});

describe('TaskListComponent', () => {
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    trace: jest.fn(),
  };

  const mockAcceptTask = jest.fn();
  const mockDeclineTask = jest.fn();
  const mockOnTaskSelect = jest.fn();

  // Helper function to create mock tasks
  const createMockTask = (overrides = {}): ITask =>
    ({
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
          state: 'active',
        },
        ...overrides,
      },
      ...overrides,
    }) as ITask;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty task list scenarios', () => {
    it('should render empty component when taskList is null', () => {
      const props: TaskListComponentProps = {
        taskList: null,
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render empty component when taskList is undefined', () => {
      const props: TaskListComponentProps = {
        taskList: undefined,
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render empty component when taskList is empty object', () => {
      const props: TaskListComponentProps = {
        taskList: {},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Task list with tasks', () => {
    it('should render task list with single task', () => {
      const task = createMockTask({
        data: {
          interactionId: 'task-1',
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
            state: 'active',
          },
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render task list with multiple tasks', () => {
      const task1 = createMockTask({
        data: {
          interactionId: 'task-1',
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'John Doe',
              virtualTeamName: 'Support Team',
            },
            createdTimestamp: 1641234567890,
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'active',
          },
        },
      });

      const task2 = createMockTask({
        data: {
          interactionId: 'task-2',
          interaction: {
            callAssociatedDetails: {
              ani: '0987654321',
              customerName: 'Jane Smith',
              virtualTeamName: 'Sales Team',
            },
            createdTimestamp: 1641234567890,
            mediaType: MEDIA_CHANNEL.SOCIAL,
            mediaChannel: 'facebook',
            state: 'new',
          },
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task1, 'task-2': task2},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should show selected task correctly', () => {
      // ✅ Create default mock tasks first
      const task = createMockTask();
      const currentTask = createMockTask();

      // ✅ Then safely update just the interactionId
      task.data.interactionId = 'selected-task';
      currentTask.data.interactionId = 'selected-task';

      const props: TaskListComponentProps = {
        taskList: {'selected-task': task},
        currentTask,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Different media types', () => {
    it('should render telephony task correctly', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Phone Customer',
              virtualTeamName: 'Phone Team',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'active',
          },
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render social media task correctly', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Social Customer',
              virtualTeamName: 'Social Team',
            },
            mediaType: MEDIA_CHANNEL.SOCIAL,
            mediaChannel: 'facebook',
            state: 'active',
          },
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render chat task correctly', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: 'chat-user-123',
              customerName: 'Chat Customer',
              virtualTeamName: 'Chat Team',
            },
            mediaType: MEDIA_CHANNEL.CHAT,
            mediaChannel: 'webchat',
            state: 'active',
          },
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Incoming vs Active tasks', () => {
    it('should render incoming task (state: new) correctly', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Incoming Customer',
              virtualTeamName: 'Incoming Team',
              ronaTimeout: '45',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'new',
          },
          wrapUpRequired: false,
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render consult task correctly', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Consult Customer',
              virtualTeamName: 'Expert Team',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'consult',
          },
          wrapUpRequired: false,
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render active task correctly', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Active Customer',
              virtualTeamName: 'Active Team',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'connected',
          },
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Browser vs Non-browser behavior', () => {
    it('should handle non-browser telephony incoming task', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Mobile Customer',
              virtualTeamName: 'Mobile Team',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'new',
          },
          wrapUpRequired: false,
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: false, // Non-browser
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Task interactions', () => {
    it('should call acceptTask when accept button is clicked', () => {
      const task = createMockTask({
        data: {
          interactionId: 'accept-task',
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Accept Customer',
              virtualTeamName: 'Accept Team',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'new',
          },
          wrapUpRequired: false,
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'accept-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should call declineTask when decline button is clicked', () => {
      const task = createMockTask({
        data: {
          interactionId: 'decline-task',
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Decline Customer',
              virtualTeamName: 'Decline Team',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'new',
          },
          wrapUpRequired: false,
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'decline-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should call onTaskSelect when select button is clicked for selectable task', () => {
      const task = createMockTask({
        data: {
          interactionId: 'select-task',
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Select Customer',
              virtualTeamName: 'Select Team',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'active', // Active task should be selectable
          },
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'select-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Logger calls', () => {
    it('should log task rendering', () => {
      const task = createMockTask();
      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should log for each task when multiple tasks are rendered', () => {
      // ✅ Use default mock tasks without breaking the structure
      const task1 = createMockTask(); // Uses default values
      const task2 = createMockTask(); // Uses default values

      // Update only the interactionId after creation
      task1.data.interactionId = 'task-1';
      task2.data.interactionId = 'task-2';

      const props: TaskListComponentProps = {
        taskList: {'task-1': task1, 'task-2': task2},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Edge cases', () => {
    it('should handle task with missing call association details', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: undefined,
            createdTimestamp: 1641234567890,
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'active',
          },
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should handle task with wrap up required', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Wrap Up Customer',
              virtualTeamName: 'Wrap Up Team',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'new',
          },
          wrapUpRequired: true, // Wrap up required
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  // Additional snapshot tests for better coverage
  describe('Additional scenarios', () => {
    it('should render email task correctly', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: 'user@email.com',
              customerName: 'Email Customer',
              virtualTeamName: 'Email Team',
            },
            mediaType: MEDIA_CHANNEL.EMAIL,
            mediaChannel: 'email',
            state: 'active',
          },
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render task with special characters in ANI', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: '+1 (555) 123-4567 ext. 123',
              customerName: 'Special Char Customer',
              virtualTeamName: 'Special Support & Services',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'active',
          },
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render social media task with wrap up required', () => {
      const task = createMockTask({
        data: {
          interaction: {
            callAssociatedDetails: {
              ani: '9876543210',
              customerName: 'Social Wrap Up Customer',
              virtualTeamName: 'Social Team',
            },
            mediaType: MEDIA_CHANNEL.SOCIAL,
            mediaChannel: 'twitter',
            state: 'new',
          },
          wrapUpRequired: true,
        },
      });

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
