import React from 'react';
import {render} from '@testing-library/react';
import {mockTask} from '@webex/test-fixtures';
import Task from '../../../../src/components/task/Task';
import {MEDIA_CHANNEL, TaskState, TaskQueue} from '../../../../src/components/task/task.types';
import {setupTaskTimerMocks} from '../../../utils/browser-api-mocks';
import * as taskUtils from '../../../../src/components/task/Task/task.utils';

setupTaskTimerMocks();

describe('Task Component Snapshots', () => {
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
      const {container} = render(
        <Task
          title="Test Task"
          interactionId="test-123"
          state={TaskState.ACTIVE}
          startTimeStamp={1641234567890}
          selected={true}
          styles="custom-style"
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should render task title when provided', () => {
      const {container} = render(<Task title="Test Task Title" interactionId="test-123" />);

      expect(container).toMatchSnapshot();
    });

    it('should not render title when not provided', () => {
      const {container} = render(<Task interactionId="test-123" />);

      expect(container).toMatchSnapshot();
    });

    it('should render task with proper types for state and queue', () => {
      const {container} = render(
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

      expect(container).toMatchSnapshot();
    });
  });

  describe('Media type rendering', () => {
    it('should render Avatar for most media types and Brandvisual only for specific social channels', () => {
      const avatarMediaTypes = [
        {mediaType: MEDIA_CHANNEL.TELEPHONY, mediaChannel: MEDIA_CHANNEL.TELEPHONY, name: 'telephony'},
        {mediaType: MEDIA_CHANNEL.EMAIL, mediaChannel: MEDIA_CHANNEL.EMAIL, name: 'email'},
        {mediaType: MEDIA_CHANNEL.CHAT, mediaChannel: MEDIA_CHANNEL.CHAT, name: 'chat'},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.SOCIAL, name: 'social'},
      ];

      avatarMediaTypes.forEach(({mediaType, mediaChannel, name}) => {
        const {container} = render(<Task title="Task" mediaType={mediaType} mediaChannel={mediaChannel} />);
        expect(container).toMatchSnapshot(`avatar-${name}`);
      });

      const brandvisualMediaTypes = [
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.FACEBOOK, name: 'facebook'},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.WHATSAPP, name: 'whatsapp'},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.APPLE, name: 'apple'},
      ];

      brandvisualMediaTypes.forEach(({mediaType, mediaChannel, name}) => {
        const {container} = render(<Task title="Task" mediaType={mediaType} mediaChannel={mediaChannel} />);
        expect(container).toMatchSnapshot(`brandvisual-${name}`);
      });
    });
  });

  describe('TaskTimer integration', () => {
    it('should render TaskTimer for handle time display', () => {
      const {container} = render(
        <Task title="Active Task" startTimeStamp={1641234567890} isIncomingTask={false} state={TaskState.CONNECTED} />
      );

      expect(container).toMatchSnapshot();
    });

    it('should render TaskTimer with countdown for incoming tasks', () => {
      const {container} = render(
        <Task title="Incoming Task" isIncomingTask={true} ronaTimeout={30} state={TaskState.NEW} />
      );

      expect(container).toMatchSnapshot();
    });
  });

  describe('Button interactions', () => {
    it('should render accept button and handle clicks', () => {
      const {container} = render(<Task title="Incoming Task" acceptText="Accept" acceptTask={mockAcceptTask} />);

      expect(container).toMatchSnapshot();
    });

    it('should render decline button and handle clicks', () => {
      const {container} = render(<Task title="Incoming Task" declineText="Decline" declineTask={mockDeclineTask} />);

      expect(container).toMatchSnapshot();
    });

    it('should handle button states correctly', () => {
      const {container} = render(
        <Task title="Incoming Task" acceptText="Accept" acceptTask={mockAcceptTask} disableAccept={true} />
      );

      expect(container).toMatchSnapshot();
    });

    it('should render both accept and decline buttons', () => {
      const {container} = render(
        <Task
          title="Incoming Task"
          acceptText="Accept Call"
          declineText="Decline Call"
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
        />
      );

      expect(container).toMatchSnapshot();
    });
  });

  describe('Task selection and styling', () => {
    it('should render selectable task', () => {
      const {container} = render(<Task title="Selectable Task" onTaskSelect={mockOnTaskSelect} />);

      expect(container).toMatchSnapshot();
    });

    it('should render selected task with custom styles', () => {
      const {container} = render(<Task title="Styled Task" selected={true} styles="custom-style" />);

      expect(container).toMatchSnapshot();
    });

    it('should render unselected task', () => {
      const {container} = render(<Task title="Unselected Task" selected={false} />);

      expect(container).toMatchSnapshot();
    });
  });

  describe('Tooltip functionality', () => {
    it('should render tooltip for digital media types', () => {
      const {container} = render(
        <Task title="Digital Task" mediaType={MEDIA_CHANNEL.CHAT} mediaChannel={MEDIA_CHANNEL.CHAT} />
      );

      expect(container).toMatchSnapshot();
    });
  });

  describe('State and queue display', () => {
    it('should display task state when configured', () => {
      const {container} = render(<Task title="Active Task" state={TaskState.CONNECTED} />);

      expect(container).toMatchSnapshot();
    });

    it('should display queue information for incoming tasks', () => {
      const {container} = render(<Task title="Incoming Task" queue={TaskQueue.SUPPORT} isIncomingTask={true} />);

      expect(container).toMatchSnapshot();
    });

    it('should display different task states', () => {
      const states = [TaskState.NEW, TaskState.ACTIVE, TaskState.HOLD, TaskState.CONNECTED];

      states.forEach((state, index) => {
        const {container} = render(<Task title={`Task ${index}`} state={state} />);
        expect(container).toMatchSnapshot(`task-state-${state}`);
      });
    });

    it('should display different queue types', () => {
      const queues = [TaskQueue.SUPPORT, TaskQueue.SALES, TaskQueue.TECHNICAL];

      queues.forEach((queue, index) => {
        const {container} = render(<Task title={`Queue Task ${index}`} queue={queue} isIncomingTask={true} />);
        expect(container).toMatchSnapshot(`task-queue-${queue}`);
      });
    });
  });

  describe('Integration with test fixtures', () => {
    it('should render task using mockTask data', () => {
      const {container} = render(
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

      expect(container).toMatchSnapshot();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing props gracefully', () => {
      const {container} = render(<Task />);

      expect(container).toMatchSnapshot();
    });

    it('should handle empty title', () => {
      const {container} = render(<Task title="" interactionId="test-123" />);

      expect(container).toMatchSnapshot();
    });

    it('should handle all button combinations', () => {
      const {container} = render(
        <Task
          title="Full Task"
          acceptText="Accept Call"
          declineText="Decline Call"
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
        />
      );

      expect(container).toMatchSnapshot();
    });
  });

  describe('Component integration', () => {
    it('should integrate properly with all momentum components', () => {
      const {container} = render(
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

      expect(container).toMatchSnapshot();
    });

    it('should render complex task with all features', () => {
      const {container} = render(
        <Task
          title="Complex Task with All Features"
          mediaType={MEDIA_CHANNEL.CHAT}
          mediaChannel={MEDIA_CHANNEL.CHAT}
          state={TaskState.CONNECTED}
          queue={TaskQueue.TECHNICAL}
          interactionId="complex-task-123"
          startTimeStamp={Date.now() - 120000}
          ronaTimeout={45}
          isIncomingTask={false}
          selected={true}
          styles="complex-task-style"
          acceptText="Accept Chat"
          declineText="Decline Chat"
          disableAccept={false}
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
          onTaskSelect={mockOnTaskSelect}
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should render incoming task with countdown', () => {
      const {container} = render(
        <Task
          title="Incoming Call with Countdown"
          mediaType={MEDIA_CHANNEL.TELEPHONY}
          mediaChannel={MEDIA_CHANNEL.TELEPHONY}
          state={TaskState.NEW}
          queue={TaskQueue.VIP}
          interactionId="incoming-vip-call"
          isIncomingTask={true}
          ronaTimeout={60}
          acceptText="Accept VIP Call"
          declineText="Decline"
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
        />
      );

      expect(container).toMatchSnapshot();
    });
  });
});
