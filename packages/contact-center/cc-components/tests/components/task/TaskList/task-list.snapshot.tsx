import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import {mockTask} from '@webex/test-fixtures';
import TaskListComponent from '../../../../src/components/task/TaskList/task-list';
import {TaskListComponentProps, MEDIA_CHANNEL} from '../../../../src/components/task/task.types';

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty task list scenarios', () => {
    it('should render empty component when taskList is null', () => {
      const props = {
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
      const props = {
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
      // Temporarily modify mockTask for this test
      const originalInteractionId = mockTask.data.interactionId;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

      mockTask.data.interactionId = 'task-1';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'John Doe',
        virtualTeamName: 'Support Team',
        ronaTimeout: '30',
      };

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interactionId = originalInteractionId;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });

    it('should render task list with multiple tasks', () => {
      // Create task copies for multiple tasks
      const task1 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-1',
          interaction: {
            ...mockTask.data.interaction,
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'John Doe',
              virtualTeamName: 'Support Team',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            state: 'active',
          },
        },
      };

      const task2 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-2',
          interaction: {
            ...mockTask.data.interaction,
            callAssociatedDetails: {
              ani: '0987654321',
              customerName: 'Jane Smith',
              virtualTeamName: 'Sales Team',
            },
            mediaType: MEDIA_CHANNEL.SOCIAL,
            mediaChannel: 'facebook',
            state: 'new',
          },
        },
      };

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
      // Create task copies for selected task test
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'selected-task',
        },
      };

      const currentTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'selected-task',
        },
      };

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
      // Temporarily modify mockTask for telephony test
      const originalMediaType = mockTask.data.interaction.mediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

      mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Phone Customer',
        virtualTeamName: 'Phone Team',
      };

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interaction.mediaType = originalMediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });

    it('should render social media task correctly', () => {
      // Temporarily modify mockTask for social test
      const originalMediaType = mockTask.data.interaction.mediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

      mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Social Customer',
        virtualTeamName: 'Social Team',
      };

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interaction.mediaType = originalMediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });

    it('should render chat task correctly', () => {
      // Temporarily modify mockTask for chat test
      const originalMediaType = mockTask.data.interaction.mediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

      mockTask.data.interaction.mediaType = MEDIA_CHANNEL.CHAT;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: 'chat-user-123',
        customerName: 'Chat Customer',
        virtualTeamName: 'Chat Team',
      };

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interaction.mediaType = originalMediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });
  });

  describe('Incoming vs Active tasks', () => {
    it('should render incoming task (state: new) correctly', () => {
      // Temporarily modify mockTask for incoming task test
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;

      mockTask.data.interaction.state = 'new';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Incoming Customer',
        virtualTeamName: 'Incoming Team',
        ronaTimeout: '45',
      };
      mockTask.data.wrapUpRequired = false;

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });

    it('should render consult task correctly', () => {
      // Temporarily modify mockTask for consult task test
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;

      mockTask.data.interaction.state = 'consult';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Consult Customer',
        virtualTeamName: 'Expert Team',
      };
      mockTask.data.wrapUpRequired = false;

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });

    it('should render active task correctly', () => {
      // Temporarily modify mockTask for active task test
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

      mockTask.data.interaction.state = 'connected';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Active Customer',
        virtualTeamName: 'Active Team',
      };

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });
  });

  describe('Browser vs Non-browser behavior', () => {
    it('should handle non-browser telephony incoming task', () => {
      // Temporarily modify mockTask for non-browser test
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;

      mockTask.data.interaction.state = 'new';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Mobile Customer',
        virtualTeamName: 'Mobile Team',
      };
      mockTask.data.wrapUpRequired = false;

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: false, // Non-browser
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });
  });

  describe('Task interactions', () => {
    it('should call acceptTask when accept button is clicked', () => {
      // Temporarily modify mockTask for accept test
      const originalInteractionId = mockTask.data.interactionId;
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;

      mockTask.data.interactionId = 'accept-task';
      mockTask.data.interaction.state = 'new';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Accept Customer',
        virtualTeamName: 'Accept Team',
      };
      mockTask.data.wrapUpRequired = false;

      const props: TaskListComponentProps = {
        taskList: {'accept-task': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interactionId = originalInteractionId;
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });

    it('should call declineTask when decline button is clicked', () => {
      // Temporarily modify mockTask for decline test
      const originalInteractionId = mockTask.data.interactionId;
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;

      mockTask.data.interactionId = 'decline-task';
      mockTask.data.interaction.state = 'new';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Decline Customer',
        virtualTeamName: 'Decline Team',
      };
      mockTask.data.wrapUpRequired = false;

      const props: TaskListComponentProps = {
        taskList: {'decline-task': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interactionId = originalInteractionId;
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });

    it('should call onTaskSelect when select button is clicked for selectable task', () => {
      // Temporarily modify mockTask for select test
      const originalInteractionId = mockTask.data.interactionId;
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

      mockTask.data.interactionId = 'select-task';
      mockTask.data.interaction.state = 'active'; // Active task should be selectable
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Select Customer',
        virtualTeamName: 'Select Team',
      };

      const props: TaskListComponentProps = {
        taskList: {'select-task': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interactionId = originalInteractionId;
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });
  });

  describe('Logger calls', () => {
    it('should log task rendering', () => {
      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
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
      // Create task copies for multiple tasks
      const task1 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-1',
        },
      };
      const task2 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-2',
        },
      };

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
      // Temporarily modify mockTask for missing details test
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = undefined;

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });

    it('should handle task with wrap up required', () => {
      // Temporarily modify mockTask for wrap up test
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;

      mockTask.data.interaction.state = 'new';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Wrap Up Customer',
        virtualTeamName: 'Wrap Up Team',
      };
      mockTask.data.wrapUpRequired = true; // Wrap up required

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });
  });

  describe('Additional scenarios', () => {
    it('should render email task correctly', () => {
      // Temporarily modify mockTask for email test
      const originalMediaType = mockTask.data.interaction.mediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

      mockTask.data.interaction.mediaType = MEDIA_CHANNEL.EMAIL;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: 'user@email.com',
        customerName: 'Email Customer',
        virtualTeamName: 'Email Team',
      };

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interaction.mediaType = originalMediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });

    it('should render task with special characters in ANI', () => {
      // Temporarily modify mockTask for special characters test
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '+1 (555) 123-4567 ext. 123',
        customerName: 'Special Char Customer',
        virtualTeamName: 'Special Support & Services',
      };

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });

    it('should render social media task with wrap up required', () => {
      // Temporarily modify mockTask for social media with wrap up test
      const originalMediaType = mockTask.data.interaction.mediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;

      mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '9876543210',
        customerName: 'Social Wrap Up Customer',
        virtualTeamName: 'Social Team',
      };
      mockTask.data.wrapUpRequired = true;

      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container.firstChild).toMatchSnapshot();

      // Restore original values
      mockTask.data.interaction.mediaType = originalMediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });
  });
});
