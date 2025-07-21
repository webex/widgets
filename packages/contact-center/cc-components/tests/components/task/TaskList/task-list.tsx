import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import {mockTask} from '@webex/test-fixtures';
import TaskListComponent from '../../../../src/components/task/TaskList/task-list';
import {MEDIA_CHANNEL, TaskListComponentProps} from '../../../../src/components/task/task.types';

// ✅ Define proper interface for MockTask props
interface MockTaskProps {
  interactionId: string;
  title: string;
  state: string;
  queue: string;
  startTimeStamp: number;
  isIncomingTask: boolean;
  selected: boolean;
  ronaTimeout: number | null;
  acceptText?: string;
  declineText?: string;
  disableAccept: boolean;
  mediaType: string;
  mediaChannel: string;
  acceptTask?: () => void;
  declineTask?: () => void;
  onTaskSelect?: () => void;
}

// Mock the Task component
jest.mock('../../../../src/components/task/Task', () => {
  return function MockTask(props: MockTaskProps) {
    return (
      <li data-testid="mock-task" data-interaction-id={props.interactionId}>
        <div data-testid="task-title">{props.title}</div>
        <div data-testid="task-state">{props.state}</div>
        <div data-testid="task-queue">{props.queue}</div>
        <div data-testid="task-timestamp">{props.startTimeStamp}</div>
        <div data-testid="task-incoming">{props.isIncomingTask ? 'incoming' : 'active'}</div>
        <div data-testid="task-selected">{props.selected ? 'selected' : 'not-selected'}</div>
        <div data-testid="task-rona-timeout">{props.ronaTimeout}</div>
        <div data-testid="task-accept-text">{props.acceptText}</div>
        <div data-testid="task-decline-text">{props.declineText}</div>
        <div data-testid="task-disable-accept">{props.disableAccept ? 'disabled' : 'enabled'}</div>
        <div data-testid="task-media-type">{props.mediaType}</div>
        <div data-testid="task-media-channel">{props.mediaChannel}</div>
        {props.acceptTask && (
          <button data-testid="accept-button" onClick={props.acceptTask}>
            Accept
          </button>
        )}
        {props.declineTask && (
          <button data-testid="decline-button" onClick={props.declineTask}>
            Decline
          </button>
        )}
        {props.onTaskSelect && (
          <button data-testid="select-button" onClick={props.onTaskSelect}>
            Select
          </button>
        )}
      </li>
    );
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
      expect(container.firstChild).toBeNull();
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
      expect(container.firstChild).toBeNull();
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
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Task list with tasks', () => {
    it('should render task list with single task', () => {
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

      render(<TaskListComponent {...props} />);

      expect(screen.getByTestId('task-list')).toBeInTheDocument();
      expect(screen.getByTestId('mock-task')).toBeInTheDocument();
      expect(screen.getByTestId('task-title')).toHaveTextContent('1234567890');
      expect(screen.getByTestId('task-queue')).toHaveTextContent('Support Team');
      expect(screen.getByTestId('task-incoming')).toHaveTextContent('active');
      expect(screen.getByTestId('task-selected')).toHaveTextContent('not-selected');

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

      render(<TaskListComponent {...props} />);

      const mockTasks = screen.getAllByTestId('mock-task');
      expect(mockTasks).toHaveLength(2);
      expect(screen.getByTestId('task-list')).toBeInTheDocument();
    });

    it('should show selected task correctly', () => {
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

      render(<TaskListComponent {...props} />);

      expect(screen.getByTestId('task-selected')).toHaveTextContent('selected');
    });
  });

  describe('Different media types', () => {
    it('should render telephony task correctly', () => {
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

      render(<TaskListComponent {...props} />);

      expect(screen.getByTestId('task-media-type')).toHaveTextContent(MEDIA_CHANNEL.TELEPHONY);
      expect(screen.getByTestId('task-title')).toHaveTextContent('1234567890'); // ANI for telephony

      // Restore original values
      mockTask.data.interaction.mediaType = originalMediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });

    it('should render social media task correctly', () => {
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

      render(<TaskListComponent {...props} />);

      expect(screen.getByTestId('task-media-type')).toHaveTextContent(MEDIA_CHANNEL.SOCIAL);
      expect(screen.getByTestId('task-title')).toHaveTextContent('Social Customer'); // Customer name for social

      // Restore original values
      mockTask.data.interaction.mediaType = originalMediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });

    it('should render chat task correctly', () => {
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

      render(<TaskListComponent {...props} />);

      expect(screen.getByTestId('task-media-type')).toHaveTextContent(MEDIA_CHANNEL.CHAT);
      expect(screen.getByTestId('task-title')).toHaveTextContent('chat-user-123'); // ANI for chat

      // Restore original values
      mockTask.data.interaction.mediaType = originalMediaType;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });
  });

  describe('Incoming vs Active tasks', () => {
    it('should render incoming task (state: new) correctly', () => {
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

      render(<TaskListComponent {...props} />);

      expect(screen.getByTestId('task-incoming')).toHaveTextContent('incoming');
      expect(screen.getByTestId('task-state')).toHaveTextContent(''); // Empty for incoming
      expect(screen.getByTestId('task-rona-timeout')).toHaveTextContent('45');
      expect(screen.getByTestId('task-accept-text')).toHaveTextContent('Accept');
      expect(screen.getByTestId('task-decline-text')).toHaveTextContent('Decline');
      expect(screen.getByTestId('task-disable-accept')).toHaveTextContent('enabled');

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });

    it('should render consult task correctly', () => {
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

      render(<TaskListComponent {...props} />);

      expect(screen.getByTestId('task-incoming')).toHaveTextContent('incoming');
      expect(screen.getByTestId('task-state')).toHaveTextContent(''); // Empty for incoming

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });

    it('should render active task correctly', () => {
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

      render(<TaskListComponent {...props} />);

      expect(screen.getByTestId('task-incoming')).toHaveTextContent('active');
      expect(screen.getByTestId('task-state')).toHaveTextContent('connected');
      expect(screen.getByTestId('task-rona-timeout')).toHaveTextContent(''); // No RONA for active

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });
  });

  describe('Browser vs Non-browser behavior', () => {
    it('should handle non-browser telephony incoming task', () => {
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

      render(<TaskListComponent {...props} />);

      expect(screen.getByTestId('task-accept-text')).toHaveTextContent('Ringing...');
      expect(screen.getByTestId('task-decline-text')).toHaveTextContent(''); // No decline for non-browser
      expect(screen.getByTestId('task-disable-accept')).toHaveTextContent('disabled');

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });
  });

  describe('Task interactions', () => {
    it('should call acceptTask when accept button is clicked', () => {
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

      render(<TaskListComponent {...props} />);

      const acceptButton = screen.getByTestId('accept-button');
      fireEvent.click(acceptButton);

      expect(mockAcceptTask).toHaveBeenCalledWith(mockTask);

      // Restore original values
      mockTask.data.interactionId = originalInteractionId;
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });

    it('should call declineTask when decline button is clicked', () => {
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

      render(<TaskListComponent {...props} />);

      const declineButton = screen.getByTestId('decline-button');
      fireEvent.click(declineButton);

      expect(mockDeclineTask).toHaveBeenCalledWith(mockTask);

      // Restore original values
      mockTask.data.interactionId = originalInteractionId;
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });

    it('should call onTaskSelect when select button is clicked for selectable task', () => {
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

      render(<TaskListComponent {...props} />);

      const selectButton = screen.getByTestId('select-button');
      fireEvent.click(selectButton);

      expect(mockOnTaskSelect).toHaveBeenCalledWith(mockTask);

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

      render(<TaskListComponent {...props} />);

      expect(mockLogger.info).toHaveBeenCalledWith('CC-Widgets: TaskList: rendering task list', {
        module: 'task-list.tsx',
        method: 'renderItem',
      });
    });

    it('should log for each task when multiple tasks are rendered', () => {
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

      render(<TaskListComponent {...props} />);

      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle task with missing call association details', () => {
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

      render(<TaskListComponent {...props} />);

      expect(screen.getByTestId('mock-task')).toBeInTheDocument();
      expect(screen.getByTestId('task-title')).toHaveTextContent(''); // undefined becomes empty

      // Restore original values
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
    });

    it('should handle task with wrap up required', () => {
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

      render(<TaskListComponent {...props} />);

      expect(screen.getByTestId('task-accept-text')).toHaveTextContent(''); // No accept text
      expect(screen.getByTestId('task-decline-text')).toHaveTextContent(''); // No decline text

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
    });
  });
});
