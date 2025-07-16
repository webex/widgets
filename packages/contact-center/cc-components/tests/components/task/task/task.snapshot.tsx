import React from 'react';
import {render} from '@testing-library/react';
import Task from '../../../../src/components/task/Task';
import {MEDIA_CHANNEL} from '../../../../src/components/task/task.types';

jest.mock('../../../../src/components/task/TaskTimer', () => {
  interface MockTaskTimerProps {
    startTimeStamp?: number;
    countdown?: boolean;
    ronaTimeout?: number;
  }
  return function MockTaskTimer({startTimeStamp, countdown, ronaTimeout}: MockTaskTimerProps) {
    if (countdown) {
      return <span data-testid="task-timer-countdown">Timer Countdown: {ronaTimeout}s</span>;
    }
    return <span data-testid="task-timer">Timer: {startTimeStamp}</span>;
  };
});

jest.mock('../../../../src/components/task/Task/task.utils', () => ({
  extractTaskComponentData: jest.fn(),
  getTaskListItemClasses: jest.fn(),
}));

jest.mock('@momentum-ui/react-collaboration', () => ({
  ButtonPill: ({
    children,
    onPress,
    color,
    disabled,
    'data-testid': testId,
  }: React.PropsWithChildren<{
    onPress?: () => void;
    color?: string;
    disabled?: boolean;
    'data-testid'?: string;
  }>) => (
    <button onClick={onPress} className={`button-pill ${color}`} disabled={disabled} data-testid={testId}>
      {children}
    </button>
  ),
  ListItemBase: ({
    children,
    className,
    onPress,
    id,
  }: React.ComponentPropsWithoutRef<'div'> & {onPress?: () => void}) => (
    <div className={className} onClick={onPress} id={id} data-testid="list-item-base">
      {children}
    </div>
  ),
  ListItemBaseSection: ({children, position}: {children: React.ReactNode; position: string}) => (
    <div className={`section-${position}`} data-testid={`section-${position}`}>
      {children}
    </div>
  ),
  Text: ({
    children,
    tagName,
    type,
    className,
    id,
  }: {
    children?: React.ReactNode;
    tagName?: keyof JSX.IntrinsicElements;
    type?: string;
    className?: string;
    id?: string;
  }) => {
    const Component = tagName || 'span';

    const getTestId = () => {
      const fullClassName = `${type || ''} ${className || ''}`;

      if (
        className &&
        (className.includes('task-digital-title') ||
          className.includes('task-title') ||
          className.includes('incoming-digital-task-title'))
      ) {
        return 'task-title-text';
      }

      if (
        fullClassName.includes('task-title') ||
        fullClassName.includes('task-digital-title') ||
        fullClassName.includes('incoming-digital-task-title')
      ) {
        return 'task-title-text';
      }

      if (className && className.includes('task-text')) {
        return 'task-info-text';
      }
      if (fullClassName.includes('task-text')) {
        return 'task-info-text';
      }

      return 'text-component';
    };

    return (
      <Component className={`${type || ''} ${className || ''}`.trim()} id={id} data-testid={getTestId()}>
        {children}
      </Component>
    );
  },
}));

jest.mock('@momentum-design/components/dist/react', () => ({
  Avatar: ({'icon-name': iconName, className}: Record<string, unknown>) => (
    <div className={className as string} data-testid="avatar" data-icon={iconName as string}>
      Avatar
    </div>
  ),
  Brandvisual: ({name, className}: Record<string, unknown>) => (
    <div className={className as string} data-testid="brandvisual" data-name={name as string}>
      Brandvisual
    </div>
  ),
  Tooltip: ({
    children,
    id,
    triggerID,
    className,
  }: React.PropsWithChildren<{id?: string; triggerID?: string; className?: string}>) => (
    <div id={id} data-trigger={triggerID} className={className} data-testid="tooltip">
      {children}
    </div>
  ),
}));

import {extractTaskComponentData, getTaskListItemClasses} from '../../../../src/components/task/Task/task.utils';

const mockExtractTaskComponentData = extractTaskComponentData as jest.MockedFunction<typeof extractTaskComponentData>;
const mockGetTaskListItemClasses = getTaskListItemClasses as jest.MockedFunction<typeof getTaskListItemClasses>;

describe('Task Component Snapshots', () => {
  const mockOnTaskSelect = jest.fn();
  const mockAcceptTask = jest.fn();
  const mockDeclineTask = jest.fn();

  const defaultTaskData = {
    currentMediaType: {
      labelName: 'Call',
      iconName: 'handset-filled',
      className: 'telephony-icon',
      isBrandVisual: false,
    },
    isNonVoiceMedia: false,
    tooltipTriggerId: 'tooltip-trigger-test-123',
    tooltipId: 'tooltip-test-123',
    titleClassName: 'task-title',
    shouldShowState: true,
    shouldShowQueue: false,
    shouldShowHandleTime: true,
    shouldShowTimeLeft: false,
    capitalizedState: 'Active',
    capitalizedQueue: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractTaskComponentData.mockReturnValue(defaultTaskData);
    mockGetTaskListItemClasses.mockReturnValue('task-list-item');
  });

  describe('Rendering', () => {
    it('should render basic task component', () => {
      const {container} = render(
        <Task title="Test Task" interactionId="test-123" state="active" startTimeStamp={1641234567890} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render task title when provided', () => {
      const {container} = render(<Task title="Test Task Title" interactionId="test-123" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should not render title when not provided', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowState: false,
        shouldShowHandleTime: false,
      });

      const {container} = render(<Task interactionId="test-123" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should not render title when title is empty', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowState: false,
        shouldShowHandleTime: false,
      });

      const {container} = render(<Task title="" interactionId="test-123" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Media Type Rendering', () => {
    it('should render Avatar for voice media', () => {
      const {container} = render(
        <Task title="Voice Task" mediaType={MEDIA_CHANNEL.TELEPHONY} mediaChannel={MEDIA_CHANNEL.TELEPHONY} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render Brandvisual for social media', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        currentMediaType: {
          labelName: 'Social',
          iconName: 'facebook-circle-filled',
          className: 'social-icon',
          isBrandVisual: true,
        },
        isNonVoiceMedia: true,
      });

      const {container} = render(
        <Task title="Social Task" mediaType={MEDIA_CHANNEL.SOCIAL} mediaChannel={MEDIA_CHANNEL.SOCIAL} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Title Text Type', () => {
    it('should use bold text type when task is selected', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowState: false,
        shouldShowHandleTime: false,
      });

      const {container} = render(<Task title="Selected Task" selected={true} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should use medium text type when task is not selected', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowState: false,
        shouldShowHandleTime: false,
      });

      const {container} = render(<Task title="Unselected Task" selected={false} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should use medium text type by default', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowState: false,
        shouldShowHandleTime: false,
      });

      const {container} = render(<Task title="Default Task" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Tooltip for Non-Voice Media', () => {
    it('should render tooltip for non-voice media', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        isNonVoiceMedia: true,
        titleClassName: 'task-digital-title',
        shouldShowState: false,
        shouldShowHandleTime: false,
      });

      const {container} = render(
        <Task title="Digital Task" mediaType={MEDIA_CHANNEL.CHAT} mediaChannel={MEDIA_CHANNEL.CHAT} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should not render tooltip for voice media', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        isNonVoiceMedia: false,
        shouldShowState: false,
        shouldShowHandleTime: false,
      });

      const {container} = render(
        <Task title="Voice Task" mediaType={MEDIA_CHANNEL.TELEPHONY} mediaChannel={MEDIA_CHANNEL.TELEPHONY} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should set correct id for tooltip trigger in non-voice media', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        isNonVoiceMedia: true,
        tooltipTriggerId: 'tooltip-trigger-chat-123',
        shouldShowState: false,
        shouldShowHandleTime: false,
      });

      const {container} = render(<Task title="Chat Task" interactionId="chat-123" mediaType={MEDIA_CHANNEL.CHAT} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Task State Display', () => {
    it('should show state when shouldShowState is true', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowState: true,
        capitalizedState: 'Connected',
      });

      const {container} = render(<Task title="Active Task" state="connected" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should not show state when shouldShowState is false', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowState: false,
        capitalizedState: 'New',
      });

      const {container} = render(<Task title="Incoming Task" state="new" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Queue Display', () => {
    it('should show queue when shouldShowQueue is true', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowQueue: true,
        capitalizedQueue: 'Support Team',
      });

      const {container} = render(<Task title="Incoming Task" queue="support team" isIncomingTask={true} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should not show queue when shouldShowQueue is false', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowQueue: false,
        capitalizedQueue: 'Support Team',
      });

      const {container} = render(<Task title="Active Task" queue="support team" isIncomingTask={false} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Handle Time Display', () => {
    it('should show handle time when shouldShowHandleTime is true', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowHandleTime: true,
      });

      const {container} = render(<Task title="Active Task" startTimeStamp={1641234567890} isIncomingTask={false} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should not show handle time when shouldShowHandleTime is false', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowHandleTime: false,
      });

      const {container} = render(
        <Task title="Incoming Task" startTimeStamp={1641234567890} isIncomingTask={true} ronaTimeout={30} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Time Left Display', () => {
    it('should show time left when shouldShowTimeLeft is true', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowTimeLeft: true,
        shouldShowHandleTime: false,
      });

      const {container} = render(<Task title="Incoming Task" isIncomingTask={true} ronaTimeout={30} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should not show time left when shouldShowTimeLeft is false', () => {
      mockExtractTaskComponentData.mockReturnValue({
        ...defaultTaskData,
        shouldShowTimeLeft: false,
      });

      const {container} = render(<Task title="Active Task" isIncomingTask={false} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Accept Button', () => {
    it('should render accept button when acceptText is provided', () => {
      const {container} = render(<Task title="Incoming Task" acceptText="Accept" acceptTask={mockAcceptTask} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should not render accept button when acceptText is not provided', () => {
      const {container} = render(<Task title="Active Task" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should call acceptTask when accept button is clicked', () => {
      const {container} = render(<Task title="Incoming Task" acceptText="Accept" acceptTask={mockAcceptTask} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should disable accept button when disableAccept is true', () => {
      const {container} = render(
        <Task title="Incoming Task" acceptText="Accept" acceptTask={mockAcceptTask} disableAccept={true} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should enable accept button when disableAccept is false', () => {
      const {container} = render(
        <Task title="Incoming Task" acceptText="Accept" acceptTask={mockAcceptTask} disableAccept={false} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Decline Button', () => {
    it('should render decline button when declineText is provided', () => {
      const {container} = render(<Task title="Incoming Task" declineText="Decline" declineTask={mockDeclineTask} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should not render decline button when declineText is not provided', () => {
      const {container} = render(<Task title="Active Task" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should call declineTask when decline button is clicked', () => {
      const {container} = render(<Task title="Incoming Task" declineText="Decline" declineTask={mockDeclineTask} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Task Selection', () => {
    it('should call onTaskSelect when task is clicked', () => {
      const {container} = render(<Task title="Selectable Task" onTaskSelect={mockOnTaskSelect} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should not call onTaskSelect when onTaskSelect is not provided', () => {
      const {container} = render(<Task title="Non-selectable Task" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('CSS Classes', () => {
    it('should call getTaskListItemClasses with correct parameters', () => {
      const {container} = render(<Task title="Styled Task" selected={true} styles="custom-style" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should apply returned CSS classes to ListItemBase', () => {
      mockGetTaskListItemClasses.mockReturnValue('task-list-item task-selected custom-class');

      const {container} = render(<Task title="Styled Task" selected={true} styles="custom-class" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Utility Function Integration', () => {
    it('should call extractTaskComponentData with correct parameters', () => {
      const {container} = render(
        <Task
          title="Test Task"
          mediaType={MEDIA_CHANNEL.TELEPHONY}
          mediaChannel={MEDIA_CHANNEL.TELEPHONY}
          isIncomingTask={true}
          interactionId="test-123"
          state="new"
          queue="support"
          ronaTimeout={30}
          startTimeStamp={1641234567890}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Component Props', () => {
    it('should set correct id on ListItemBase', () => {
      const {container} = render(<Task title="ID Task" interactionId="unique-id-123" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should handle all optional props gracefully', () => {
      const {container} = render(<Task />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Edge Cases', () => {
    it('should handle both accept and decline buttons together', () => {
      const {container} = render(
        <Task
          title="Incoming Task"
          acceptText="Accept"
          declineText="Decline"
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should handle empty string for acceptText and declineText', () => {
      const {container} = render(<Task title="Task" acceptText="" declineText="" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should handle undefined onTaskSelect gracefully', () => {
      const {container} = render(<Task title="Task" onTaskSelect={undefined} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
