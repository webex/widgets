import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import Task, {TaskProps} from '../../../../src/components/task/Task';
import {MEDIA_CHANNEL, TaskState, TaskQueue} from '../../../../src/components/task/task.types';
import * as taskUtils from '../../../../src/components/task/Task/task.utils';

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

describe('Task Component', () => {
  const mockAcceptTask = jest.fn();
  const mockDeclineTask = jest.fn();
  const mockOnTaskSelect = jest.fn();

  // Properly typed default props based on TaskProps interface
  const defaultProps: TaskProps = {
    interactionId: 'test-interaction-123',
    title: 'Test Task',
    state: TaskState.ACTIVE,
    startTimeStamp: 1641234567890,
    ronaTimeout: undefined,
    selected: false,
    isIncomingTask: false,
    queue: undefined,
    acceptTask: undefined,
    declineTask: undefined,
    onTaskSelect: undefined,
    acceptText: undefined,
    declineText: undefined,
    disableAccept: false,
    styles: undefined,
    mediaType: MEDIA_CHANNEL.TELEPHONY,
    mediaChannel: MEDIA_CHANNEL.TELEPHONY,
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

  describe('Rendering', () => {
    it('renders the component correctly with default props', () => {
      render(<Task {...defaultProps} />);

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(extractTaskComponentDataSpy).toHaveBeenCalledWith({
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: false,
        interactionId: 'test-interaction-123',
        state: TaskState.ACTIVE,
        queue: undefined,
        ronaTimeout: undefined,
        startTimeStamp: 1641234567890,
      });
      expect(getTaskListItemClassesSpy).toHaveBeenCalledWith(false, undefined);
    });

    it('renders with minimal props', () => {
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
      expect(getTaskListItemClassesSpy).toHaveBeenCalledWith(false, undefined);
    });

    it('renders with selected state and custom styles', () => {
      render(<Task {...defaultProps} selected={true} styles="custom-style" />);

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(getTaskListItemClassesSpy).toHaveBeenCalledWith(true, 'custom-style');
    });

    it('renders task state for non-incoming tasks', () => {
      render(<Task {...defaultProps} state={TaskState.CONNECTED} isIncomingTask={false} />);

      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    it('renders queue information for incoming tasks', () => {
      render(<Task {...defaultProps} queue={TaskQueue.SUPPORT} isIncomingTask={true} />);

      expect(screen.getByText(/Support/i)).toBeInTheDocument();
    });

    it('does not render title when not provided', () => {
      render(<Task {...defaultProps} title={undefined} />);

      expect(screen.queryByText(/Test Task/)).not.toBeInTheDocument();
    });
  });

  describe('Media Type Rendering', () => {
    it('renders Avatar for voice media types', () => {
      render(<Task {...defaultProps} mediaType={MEDIA_CHANNEL.TELEPHONY} mediaChannel={MEDIA_CHANNEL.TELEPHONY} />);

      expect(document.querySelector('mdc-avatar[icon-name="handset-filled"]')).toBeInTheDocument();
      expect(document.querySelector('mdc-brandvisual')).not.toBeInTheDocument();
    });

    it('renders Avatar for non-brand visual digital media types', () => {
      const digitalMediaTypes = [
        {mediaType: MEDIA_CHANNEL.EMAIL, mediaChannel: MEDIA_CHANNEL.EMAIL},
        {mediaType: MEDIA_CHANNEL.CHAT, mediaChannel: MEDIA_CHANNEL.CHAT},
        {mediaType: MEDIA_CHANNEL.SMS, mediaChannel: MEDIA_CHANNEL.SMS},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.SOCIAL},
      ];

      digitalMediaTypes.forEach(({mediaType, mediaChannel}) => {
        const {unmount} = render(
          <Task {...defaultProps} title="Digital Task" mediaType={mediaType} mediaChannel={mediaChannel} />
        );

        expect(document.querySelector('mdc-avatar')).toBeInTheDocument();
        expect(document.querySelector('mdc-brandvisual')).not.toBeInTheDocument();

        unmount();
      });
    });

    it('renders Brandvisual for specific social channels', () => {
      const brandvisualMediaTypes = [
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.FACEBOOK},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.WHATSAPP},
      ];

      brandvisualMediaTypes.forEach(({mediaType, mediaChannel}) => {
        const {unmount} = render(
          <Task {...defaultProps} title="Social Task" mediaType={mediaType} mediaChannel={mediaChannel} />
        );

        expect(document.querySelector('mdc-brandvisual')).toBeInTheDocument();
        expect(document.querySelector('.brand-visual-background')).toBeInTheDocument();
        expect(document.querySelector('mdc-avatar')).not.toBeInTheDocument();

        unmount();
      });
    });

    it('renders tooltip for digital media types', () => {
      render(
        <Task {...defaultProps} title="Digital Task" mediaType={MEDIA_CHANNEL.CHAT} mediaChannel={MEDIA_CHANNEL.CHAT} />
      );

      const tooltip = document.querySelector('mdc-tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute('tooltip-type', 'description');
      expect(tooltip).toHaveClass('task-tooltip');
    });

    it('does not render tooltip for voice media types', () => {
      render(
        <Task
          {...defaultProps}
          title="Voice Task"
          mediaType={MEDIA_CHANNEL.TELEPHONY}
          mediaChannel={MEDIA_CHANNEL.TELEPHONY}
        />
      );

      const tooltip = document.querySelector('mdc-tooltip');
      expect(tooltip).not.toBeInTheDocument();
    });
  });

  describe('TaskTimer Integration', () => {
    it('renders handle time timer for non-incoming tasks with startTimeStamp', () => {
      render(
        <Task {...defaultProps} isIncomingTask={false} startTimeStamp={1641234567890} state={TaskState.CONNECTED} />
      );

      expect(screen.getByText(/Handle Time/)).toBeInTheDocument();
      expect(document.querySelector('time')).toBeInTheDocument();
    });

    it('renders time left timer for incoming tasks with RONA timeout', () => {
      render(<Task {...defaultProps} isIncomingTask={true} ronaTimeout={30} state={TaskState.NEW} />);

      expect(screen.getByText(/Time Left/)).toBeInTheDocument();
      expect(document.querySelector('time')).toBeInTheDocument();
    });

    it('renders handle time for incoming tasks without RONA timeout but with startTimeStamp', () => {
      render(<Task {...defaultProps} isIncomingTask={true} ronaTimeout={undefined} startTimeStamp={1641234567890} />);

      expect(screen.getByText(/Handle Time/)).toBeInTheDocument();
    });

    it('does not render timer when no startTimeStamp and no RONA timeout', () => {
      render(<Task {...defaultProps} isIncomingTask={true} ronaTimeout={undefined} startTimeStamp={undefined} />);

      expect(screen.queryByText(/Handle Time/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Time Left/)).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('renders accept button and handles clicks', () => {
      render(<Task {...defaultProps} acceptText="Accept" acceptTask={mockAcceptTask} />);

      const acceptButton = screen.getByTestId('task:accept-button');
      expect(acceptButton).toBeInTheDocument();
      expect(acceptButton).toHaveTextContent('Accept');

      fireEvent.click(acceptButton);
      expect(mockAcceptTask).toHaveBeenCalledTimes(1);
    });

    it('renders decline button and handles clicks', () => {
      render(<Task {...defaultProps} declineText="Decline" declineTask={mockDeclineTask} />);

      const declineButton = screen.getByTestId('task:decline-button');
      expect(declineButton).toBeInTheDocument();
      expect(declineButton).toHaveTextContent('Decline');

      fireEvent.click(declineButton);
      expect(mockDeclineTask).toHaveBeenCalledTimes(1);
    });

    it('renders both accept and decline buttons when configured', () => {
      render(
        <Task
          {...defaultProps}
          acceptText="Accept Call"
          declineText="Decline Call"
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
        />
      );

      const acceptButton = screen.getByTestId('task:accept-button');
      const declineButton = screen.getByTestId('task:decline-button');

      expect(acceptButton).toBeInTheDocument();
      expect(declineButton).toBeInTheDocument();

      // Verify both buttons are clickable
      expect(acceptButton).not.toBeDisabled();
      expect(declineButton).not.toBeDisabled();
    });

    it('disables accept button when disableAccept is true', () => {
      render(<Task {...defaultProps} acceptText="Accept" acceptTask={mockAcceptTask} disableAccept={true} />);

      const acceptButton = screen.getByTestId('task:accept-button');
      expect(acceptButton).toBeDisabled();
    });

    it('does not render buttons when no text provided', () => {
      render(<Task {...defaultProps} />);

      expect(screen.queryByTestId('task:accept-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task:decline-button')).not.toBeInTheDocument();
    });

    it('handles task selection when onTaskSelect is provided', () => {
      render(<Task {...defaultProps} onTaskSelect={mockOnTaskSelect} />);

      const taskItem = screen.getByRole('listitem');
      fireEvent.click(taskItem);

      expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);
    });

    it('does not handle task selection when onTaskSelect is not provided', () => {
      render(<Task {...defaultProps} />);

      const taskItem = screen.getByRole('listitem');
      fireEvent.click(taskItem);

      expect(mockOnTaskSelect).not.toHaveBeenCalled();
    });

    it('verifies button properties and behavior', () => {
      render(
        <Task
          {...defaultProps}
          acceptText="Accept"
          declineText="Decline"
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
          disableAccept={false}
        />
      );

      const acceptButton = screen.getByTestId('task:accept-button');
      const declineButton = screen.getByTestId('task:decline-button');

      // Verify button content
      expect(acceptButton).toHaveTextContent('Accept');
      expect(declineButton).toHaveTextContent('Decline');

      // Verify button states
      expect(acceptButton).not.toBeDisabled();
      expect(declineButton).not.toBeDisabled();

      // Verify button types (if they have specific roles or types)
      expect(acceptButton).toHaveAttribute('type', 'button');
      expect(declineButton).toHaveAttribute('type', 'button');

      // Test functionality
      fireEvent.click(acceptButton);
      expect(mockAcceptTask).toHaveBeenCalledTimes(1);

      fireEvent.click(declineButton);
      expect(mockDeclineTask).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Integration', () => {
    it('maintains consistent behavior with voice call props', () => {
      extractTaskComponentDataSpy.mockClear();

      const voiceProps: TaskProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: false,
        state: TaskState.CONNECTED,
      };

      render(<Task {...voiceProps} />);

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(extractTaskComponentDataSpy).toHaveBeenCalledWith({
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: false,
        interactionId: 'test-interaction-123',
        state: TaskState.CONNECTED,
        queue: undefined,
        ronaTimeout: undefined,
        startTimeStamp: 1641234567890,
      });
      expect(document.querySelector('mdc-avatar[icon-name="handset-filled"]')).toBeInTheDocument();
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    it('maintains consistent behavior with incoming call props', () => {
      extractTaskComponentDataSpy.mockClear();

      const incomingProps: TaskProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: true,
        state: TaskState.NEW,
        ronaTimeout: 30,
      };

      render(<Task {...incomingProps} />);

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(extractTaskComponentDataSpy).toHaveBeenCalledWith({
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: true,
        interactionId: 'test-interaction-123',
        state: TaskState.NEW,
        queue: undefined,
        ronaTimeout: 30,
        startTimeStamp: 1641234567890,
      });
      expect(document.querySelector('mdc-avatar[icon-name="handset-filled"]')).toBeInTheDocument();
      expect(screen.getByText(/Time Left/)).toBeInTheDocument();
    });

    it('maintains consistent behavior with digital media props', () => {
      extractTaskComponentDataSpy.mockClear();

      const digitalProps: TaskProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.CHAT,
        mediaChannel: MEDIA_CHANNEL.CHAT,
        isIncomingTask: true,
        queue: TaskQueue.SUPPORT,
      };

      render(<Task {...digitalProps} />);

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(extractTaskComponentDataSpy).toHaveBeenCalledWith({
        mediaType: MEDIA_CHANNEL.CHAT,
        mediaChannel: MEDIA_CHANNEL.CHAT,
        isIncomingTask: true,
        interactionId: 'test-interaction-123',
        state: TaskState.ACTIVE,
        queue: TaskQueue.SUPPORT,
        ronaTimeout: undefined,
        startTimeStamp: 1641234567890,
      });
      expect(document.querySelector('mdc-avatar[icon-name="chat-filled"]')).toBeInTheDocument();
      expect(screen.getByText(/Support/i)).toBeInTheDocument();
    });

    it('integrates properly with all momentum components', () => {
      const fullProps: TaskProps = {
        ...defaultProps,
        title: 'Complete Integration Task',
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        state: TaskState.ACTIVE,
        queue: TaskQueue.SALES,
        startTimeStamp: 1641234567890,
        selected: true,
        acceptText: 'Accept',
        declineText: 'Decline',
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        onTaskSelect: mockOnTaskSelect,
      };

      render(<Task {...fullProps} />);

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

  describe('Edge Cases', () => {
    it('handles undefined interactionId gracefully', () => {
      render(<Task {...defaultProps} interactionId={undefined} />);

      const listItem = screen.getByRole('listitem');
      expect(listItem).not.toHaveAttribute('id');
    });

    it('handles zero values correctly', () => {
      render(<Task {...defaultProps} startTimeStamp={0} ronaTimeout={0} />);

      expect(extractTaskComponentDataSpy).toHaveBeenCalledWith({
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: false,
        interactionId: 'test-interaction-123',
        state: TaskState.ACTIVE,
        queue: undefined,
        ronaTimeout: 0,
        startTimeStamp: 0,
      });
    });

    it('handles empty string values', () => {
      render(<Task {...defaultProps} title="" state="" queue="" styles="" />);

      expect(screen.queryByText(/Test Task/)).not.toBeInTheDocument();
      expect(extractTaskComponentDataSpy).toHaveBeenCalledWith({
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: false,
        interactionId: 'test-interaction-123',
        state: '',
        queue: '',
        ronaTimeout: undefined,
        startTimeStamp: 1641234567890,
      });
    });

    it('handles all media channel combinations', () => {
      const mediaChannelCombinations: Array<{mediaType: MEDIA_CHANNEL; mediaChannel: MEDIA_CHANNEL}> = [
        {mediaType: MEDIA_CHANNEL.EMAIL, mediaChannel: MEDIA_CHANNEL.EMAIL},
        {mediaType: MEDIA_CHANNEL.SMS, mediaChannel: MEDIA_CHANNEL.SMS},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.FACEBOOK},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.WHATSAPP},
      ];

      mediaChannelCombinations.forEach(({mediaType, mediaChannel}) => {
        extractTaskComponentDataSpy.mockClear();

        const {unmount} = render(
          <Task {...defaultProps} mediaType={mediaType} mediaChannel={mediaChannel} title="Media Test" />
        );

        expect(screen.getByRole('listitem')).toBeInTheDocument();
        expect(extractTaskComponentDataSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            mediaType,
            mediaChannel,
          })
        );

        unmount();
      });
    });
  });

  describe('Props Validation', () => {
    it('handles function props correctly', () => {
      const customAcceptTask = jest.fn();
      const customDeclineTask = jest.fn();
      const customOnTaskSelect = jest.fn();

      const functionProps: TaskProps = {
        ...defaultProps,
        acceptTask: customAcceptTask,
        declineTask: customDeclineTask,
        onTaskSelect: customOnTaskSelect,
        acceptText: 'Custom Accept',
        declineText: 'Custom Decline',
      };

      render(<Task {...functionProps} />);

      fireEvent.click(screen.getByRole('listitem'));
      expect(customOnTaskSelect).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('task:accept-button'));
      expect(customAcceptTask).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('task:decline-button'));
      expect(customDeclineTask).toHaveBeenCalledTimes(1);
    });

    it('handles boolean props correctly', () => {
      const booleanTestCases: Array<Partial<TaskProps>> = [
        {selected: true, isIncomingTask: true, disableAccept: true},
        {selected: false, isIncomingTask: false, disableAccept: false},
      ];

      booleanTestCases.forEach((booleanProps, index) => {
        const testProps: TaskProps = {
          ...defaultProps,
          ...booleanProps,
          title: `Boolean Test ${index}`,
          acceptText: 'Accept',
        };

        const {unmount} = render(<Task {...testProps} />);

        expect(getTaskListItemClassesSpy).toHaveBeenCalledWith(booleanProps.selected, undefined);

        if (booleanProps.disableAccept) {
          expect(screen.getByTestId('task:accept-button')).toBeDisabled();
        } else {
          expect(screen.getByTestId('task:accept-button')).not.toBeDisabled();
        }

        unmount();
      });
    });
  });
});
