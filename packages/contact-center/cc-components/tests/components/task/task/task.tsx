import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import {mockTask} from '@webex/test-fixtures';
import Task from '../../../../src/components/task/Task';
import {MEDIA_CHANNEL, TaskState, TaskQueue} from '../../../../src/components/task/task.types';
import {setupTaskTimerMocks} from '../../../utils/browser-api-mocks';
import * as taskUtils from '../../../../src/components/task/Task/task.utils';

setupTaskTimerMocks();

describe('Task Component', () => {
  const mockAcceptTask = jest.fn();
  const mockDeclineTask = jest.fn();
  const mockOnTaskSelect = jest.fn();

  const defaultTaskData = {
    ...mockTask,
    data: {
      ...mockTask.data,
      interactionId: 'test-interaction-123',
      interaction: {
        ...mockTask.data.interaction,
        state: TaskState.NEW,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        callAssociatedDetails: {
          ani: '1234567890',
          customerName: 'Test Customer',
          virtualTeamName: 'Test Team',
          ronaTimeout: '30',
        },
      },
    },
  };

  const extractTaskComponentDataSpy = jest.spyOn(taskUtils, 'extractTaskComponentData');
  const getTaskListItemClassesSpy = jest.spyOn(taskUtils, 'getTaskListItemClasses');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    extractTaskComponentDataSpy.mockRestore();
    getTaskListItemClassesSpy.mockRestore();
  });

  describe('Basic rendering', () => {
    it('should render task component with momentum UI components', () => {
      render(
        <Task
          title="Test Task"
          interactionId="test-123"
          state={TaskState.ACTIVE}
          startTimeStamp={1641234567890}
          selected={true}
          styles="custom-style"
        />
      );

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(extractTaskComponentDataSpy).toHaveBeenCalledWith({
        mediaType: undefined,
        mediaChannel: undefined,
        isIncomingTask: false,
        interactionId: 'test-123',
        state: TaskState.ACTIVE,
        queue: undefined,
        ronaTimeout: undefined,
        startTimeStamp: 1641234567890,
      });
      expect(getTaskListItemClassesSpy).toHaveBeenCalledWith(true, 'custom-style');
    });

    it('should render task title when provided', () => {
      render(<Task title="Test Task Title" interactionId="test-123" />);
      expect(screen.getByText('Test Task Title')).toBeInTheDocument();
    });

    it('should not render title when not provided', () => {
      render(<Task interactionId="test-123" />);
      expect(screen.queryByText(/Test Task/)).not.toBeInTheDocument();
    });

    it('should render task with proper types for state and queue', () => {
      render(
        <Task
          title="Typed Task"
          mediaType={MEDIA_CHANNEL.TELEPHONY}
          mediaChannel={MEDIA_CHANNEL.TELEPHONY}
          isIncomingTask={true}
          interactionId="test-123"
          state={TaskState.NEW}
          queue={TaskQueue.SUPPORT}
          ronaTimeout={30}
          startTimeStamp={1641234567890}
        />
      );

      expect(extractTaskComponentDataSpy).toHaveBeenCalledWith({
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: true,
        interactionId: 'test-123',
        state: TaskState.NEW,
        queue: TaskQueue.SUPPORT,
        ronaTimeout: 30,
        startTimeStamp: 1641234567890,
      });
    });
  });

  describe('Media type rendering', () => {
    it('should render Avatar for most media types and Brandvisual only for specific social channels', () => {
      const avatarMediaTypes = [
        {mediaType: MEDIA_CHANNEL.TELEPHONY, mediaChannel: MEDIA_CHANNEL.TELEPHONY},
        {mediaType: MEDIA_CHANNEL.EMAIL, mediaChannel: MEDIA_CHANNEL.EMAIL},
        {mediaType: MEDIA_CHANNEL.CHAT, mediaChannel: MEDIA_CHANNEL.CHAT},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.SOCIAL},
      ];

      avatarMediaTypes.forEach(({mediaType, mediaChannel}) => {
        const {unmount} = render(<Task title="Task" mediaType={mediaType} mediaChannel={mediaChannel} />);
        expect(document.querySelector('mdc-avatar')).toBeInTheDocument();
        expect(document.querySelector('mdc-brandvisual')).not.toBeInTheDocument();
        unmount();
      });

      const brandvisualMediaTypes = [
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.FACEBOOK},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.WHATSAPP},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.APPLE},
      ];

      brandvisualMediaTypes.forEach(({mediaType, mediaChannel}) => {
        const {unmount} = render(<Task title="Task" mediaType={mediaType} mediaChannel={mediaChannel} />);
        expect(document.querySelector('mdc-brandvisual')).toBeInTheDocument();
        expect(document.querySelector('.brand-visual-background')).toBeInTheDocument();
        expect(document.querySelector('mdc-avatar')).not.toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('TaskTimer integration', () => {
    it('should render TaskTimer for handle time display', () => {
      render(
        <Task title="Active Task" startTimeStamp={1641234567890} isIncomingTask={false} state={TaskState.CONNECTED} />
      );

      const timerElement = document.querySelector('time');
      expect(timerElement).toBeInTheDocument();
      expect(timerElement).toHaveClass('task-text', 'task-text--secondary');
    });

    it('should render TaskTimer with countdown for incoming tasks', () => {
      render(<Task title="Incoming Task" isIncomingTask={true} ronaTimeout={30} state={TaskState.NEW} />);

      const timerElement = document.querySelector('time');
      expect(timerElement).toBeInTheDocument();
      expect(timerElement).toHaveClass('task-text', 'task-text--secondary');
    });
  });

  describe('Button interactions', () => {
    it('should render accept button and handle clicks', () => {
      render(<Task title="Incoming Task" acceptText="Accept" acceptTask={mockAcceptTask} />);

      const acceptButton = screen.getByTestId('task:accept-button');
      expect(acceptButton).toBeInTheDocument();
      expect(acceptButton).toHaveTextContent('Accept');

      fireEvent.click(acceptButton);
      expect(mockAcceptTask).toHaveBeenCalledTimes(1);
    });

    it('should render decline button and handle clicks', () => {
      render(<Task title="Incoming Task" declineText="Decline" declineTask={mockDeclineTask} />);

      const declineButton = screen.getByTestId('task:decline-button');
      expect(declineButton).toBeInTheDocument();
      expect(declineButton).toHaveTextContent('Decline');

      fireEvent.click(declineButton);
      expect(mockDeclineTask).toHaveBeenCalledTimes(1);
    });

    it('should handle button states correctly', () => {
      render(<Task title="Incoming Task" acceptText="Accept" acceptTask={mockAcceptTask} disableAccept={true} />);

      const acceptButton = screen.getByTestId('task:accept-button');
      expect(acceptButton).toBeDisabled();
    });
  });

  describe('Task selection and styling', () => {
    it('should handle task selection', () => {
      render(<Task title="Selectable Task" onTaskSelect={mockOnTaskSelect} />);

      const taskItem = screen.getByRole('listitem');
      fireEvent.click(taskItem);

      expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);
    });

    it('should apply correct CSS classes', () => {
      render(<Task title="Styled Task" selected={true} styles="custom-style" />);

      const taskItem = screen.getByRole('listitem');
      expect(getTaskListItemClassesSpy).toHaveBeenCalledWith(true, 'custom-style');
      expect(taskItem).toHaveClass('task-list-item');
    });
  });

  describe('Tooltip functionality', () => {
    it('should render tooltip for digital media types', () => {
      render(<Task title="Digital Task" mediaType={MEDIA_CHANNEL.CHAT} mediaChannel={MEDIA_CHANNEL.CHAT} />);

      const tooltip = document.querySelector('mdc-tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('State and queue display', () => {
    it('should display task state when configured', () => {
      render(<Task title="Active Task" state={TaskState.CONNECTED} />);
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    it('should display queue information for incoming tasks', () => {
      render(<Task title="Incoming Task" queue={TaskQueue.SUPPORT} isIncomingTask={true} />);
      expect(screen.getByText(/Support/i)).toBeInTheDocument();
    });
  });

  describe('Integration with test fixtures', () => {
    it('should render task using mockTask data', () => {
      render(
        <Task
          title={defaultTaskData.data.interaction.callAssociatedDetails?.customerName}
          mediaType={defaultTaskData.data.interaction.mediaType}
          mediaChannel={defaultTaskData.data.interaction.mediaType}
          state={TaskState.NEW}
          queue={TaskQueue.SUPPORT}
          interactionId={defaultTaskData.data.interactionId}
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
          onTaskSelect={mockOnTaskSelect}
        />
      );

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(extractTaskComponentDataSpy).toHaveBeenCalledWith({
        mediaType: defaultTaskData.data.interaction.mediaType,
        mediaChannel: defaultTaskData.data.interaction.mediaType,
        isIncomingTask: false,
        interactionId: defaultTaskData.data.interactionId,
        state: TaskState.NEW,
        queue: TaskQueue.SUPPORT,
        ronaTimeout: undefined,
        startTimeStamp: undefined,
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing props gracefully', () => {
      render(<Task />);

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(extractTaskComponentDataSpy).toHaveBeenCalledWith({
        mediaType: undefined,
        mediaChannel: undefined,
        isIncomingTask: false,
        interactionId: undefined,
        state: undefined,
        queue: undefined,
        ronaTimeout: undefined,
        startTimeStamp: undefined,
      });
    });

    it('should handle all button combinations', () => {
      render(
        <Task
          title="Full Task"
          acceptText="Accept Call"
          declineText="Decline Call"
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
        />
      );

      expect(screen.getByTestId('task:accept-button')).toBeInTheDocument();
      expect(screen.getByTestId('task:decline-button')).toBeInTheDocument();
    });
  });

  describe('Component integration', () => {
    it('should integrate properly with all momentum components', () => {
      render(
        <Task
          title="Complete Integration Task"
          mediaType={MEDIA_CHANNEL.TELEPHONY}
          mediaChannel={MEDIA_CHANNEL.TELEPHONY}
          state={TaskState.ACTIVE}
          queue={TaskQueue.SALES}
          startTimeStamp={1641234567890}
          selected={true}
          acceptText="Accept"
          declineText="Decline"
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
          onTaskSelect={mockOnTaskSelect}
        />
      );

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(document.querySelector('mdc-avatar')).toBeInTheDocument();
      expect(document.querySelector('time')).toBeInTheDocument();
      expect(screen.getByTestId('task:accept-button')).toBeInTheDocument();
      expect(screen.getByTestId('task:decline-button')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('listitem'));
      expect(mockOnTaskSelect).toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('task:accept-button'));
      expect(mockAcceptTask).toHaveBeenCalled();
    });
  });
});
