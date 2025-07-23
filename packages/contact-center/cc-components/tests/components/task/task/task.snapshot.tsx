import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import Task, {TaskProps} from '../../../../src/components/task/Task';
import {MEDIA_CHANNEL, TaskState, TaskQueue} from '../../../../src/components/task/task.types';
import {setupTaskTimerMocks} from '../../../utils/browser-api-mocks';
import * as taskUtils from '../../../../src/components/task/Task/task.utils';

setupTaskTimerMocks();

describe('Task Component Snapshots', () => {
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
      const {container} = render(<Task {...defaultProps} />);

      expect(container).toMatchSnapshot();
    });

    it('renders with minimal props', () => {
      const {container} = render(<Task />);

      expect(container).toMatchSnapshot();
    });

    it('renders with selected state and custom styles', () => {
      const {container} = render(<Task {...defaultProps} selected={true} styles="custom-style" />);

      expect(container).toMatchSnapshot();
    });

    it('renders task state for non-incoming tasks', () => {
      const {container} = render(<Task {...defaultProps} state={TaskState.CONNECTED} isIncomingTask={false} />);

      expect(container).toMatchSnapshot();
    });

    it('renders queue information for incoming tasks', () => {
      const {container} = render(<Task {...defaultProps} queue={TaskQueue.SUPPORT} isIncomingTask={true} />);

      expect(container).toMatchSnapshot();
    });

    it('does not render title when not provided', () => {
      const {container} = render(<Task {...defaultProps} title={undefined} />);

      expect(container).toMatchSnapshot();
    });
  });

  describe('Media Type Rendering', () => {
    it('renders Avatar for voice media types', () => {
      const {container} = render(
        <Task {...defaultProps} mediaType={MEDIA_CHANNEL.TELEPHONY} mediaChannel={MEDIA_CHANNEL.TELEPHONY} />
      );

      expect(container).toMatchSnapshot();
    });

    it('renders Avatar for non-brand visual digital media types', () => {
      const digitalMediaTypes = [
        {mediaType: MEDIA_CHANNEL.EMAIL, mediaChannel: MEDIA_CHANNEL.EMAIL, name: 'email'},
        {mediaType: MEDIA_CHANNEL.CHAT, mediaChannel: MEDIA_CHANNEL.CHAT, name: 'chat'},
        {mediaType: MEDIA_CHANNEL.SMS, mediaChannel: MEDIA_CHANNEL.SMS, name: 'sms'},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.SOCIAL, name: 'social'},
      ];

      digitalMediaTypes.forEach(({mediaType, mediaChannel, name}) => {
        const {container} = render(
          <Task {...defaultProps} title="Digital Task" mediaType={mediaType} mediaChannel={mediaChannel} />
        );

        expect(container).toMatchSnapshot(`digital-media-${name}`);
      });
    });

    it('renders Brandvisual for specific social channels', () => {
      const brandvisualMediaTypes = [
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.FACEBOOK, name: 'facebook'},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.WHATSAPP, name: 'whatsapp'},
      ];

      brandvisualMediaTypes.forEach(({mediaType, mediaChannel, name}) => {
        const {container} = render(
          <Task {...defaultProps} title="Social Task" mediaType={mediaType} mediaChannel={mediaChannel} />
        );

        expect(container).toMatchSnapshot(`brandvisual-${name}`);
      });
    });

    it('renders tooltip for digital media types', () => {
      const {container} = render(
        <Task {...defaultProps} title="Digital Task" mediaType={MEDIA_CHANNEL.CHAT} mediaChannel={MEDIA_CHANNEL.CHAT} />
      );

      expect(container).toMatchSnapshot();
    });

    it('does not render tooltip for voice media types', () => {
      const {container} = render(
        <Task
          {...defaultProps}
          title="Voice Task"
          mediaType={MEDIA_CHANNEL.TELEPHONY}
          mediaChannel={MEDIA_CHANNEL.TELEPHONY}
        />
      );

      expect(container).toMatchSnapshot();
    });
  });

  describe('TaskTimer Integration', () => {
    it('renders handle time timer for non-incoming tasks with startTimeStamp', () => {
      const {container} = render(
        <Task {...defaultProps} isIncomingTask={false} startTimeStamp={1641234567890} state={TaskState.CONNECTED} />
      );

      expect(container).toMatchSnapshot();
    });

    it('renders time left timer for incoming tasks with RONA timeout', () => {
      const {container} = render(
        <Task {...defaultProps} isIncomingTask={true} ronaTimeout={30} state={TaskState.NEW} />
      );

      expect(container).toMatchSnapshot();
    });

    it('renders handle time for incoming tasks without RONA timeout but with startTimeStamp', () => {
      const {container} = render(
        <Task {...defaultProps} isIncomingTask={true} ronaTimeout={undefined} startTimeStamp={1641234567890} />
      );

      expect(container).toMatchSnapshot();
    });

    it('does not render timer when no startTimeStamp and no RONA timeout', () => {
      const {container} = render(
        <Task {...defaultProps} isIncomingTask={true} ronaTimeout={undefined} startTimeStamp={undefined} />
      );

      expect(container).toMatchSnapshot();
    });
  });

  describe('Actions', () => {
    it('renders accept button and handles clicks', () => {
      const {container} = render(<Task {...defaultProps} acceptText="Accept" acceptTask={mockAcceptTask} />);

      expect(container).toMatchSnapshot();
    });

    it('renders decline button and handles clicks', () => {
      const {container} = render(<Task {...defaultProps} declineText="Decline" declineTask={mockDeclineTask} />);

      expect(container).toMatchSnapshot();
    });

    it('renders both accept and decline buttons when configured', () => {
      const {container} = render(
        <Task
          {...defaultProps}
          acceptText="Accept Call"
          declineText="Decline Call"
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('disables accept button when disableAccept is true', () => {
      const {container} = render(
        <Task {...defaultProps} acceptText="Accept" acceptTask={mockAcceptTask} disableAccept={true} />
      );

      expect(container).toMatchSnapshot();
    });

    it('does not render buttons when no text provided', () => {
      const {container} = render(<Task {...defaultProps} />);

      expect(container).toMatchSnapshot();
    });

    it('verifies button properties and behavior', () => {
      const {container} = render(
        <Task
          {...defaultProps}
          acceptText="Accept"
          declineText="Decline"
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
          disableAccept={false}
        />
      );

      expect(container).toMatchSnapshot();
    });
  });

  describe('Component Integration', () => {
    it('maintains consistent behavior with voice call props', () => {
      const voiceProps: TaskProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: false,
        state: TaskState.CONNECTED,
      };

      const {container} = render(<Task {...voiceProps} />);

      expect(container).toMatchSnapshot();
    });

    it('maintains consistent behavior with incoming call props', () => {
      const incomingProps: TaskProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: true,
        state: TaskState.NEW,
        ronaTimeout: 30,
      };

      const {container} = render(<Task {...incomingProps} />);

      expect(container).toMatchSnapshot();
    });

    it('maintains consistent behavior with digital media props', () => {
      const digitalProps: TaskProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.CHAT,
        mediaChannel: MEDIA_CHANNEL.CHAT,
        isIncomingTask: true,
        queue: TaskQueue.SUPPORT,
      };

      const {container} = render(<Task {...digitalProps} />);

      expect(container).toMatchSnapshot();
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

      const {container} = render(<Task {...fullProps} />);

      expect(container).toMatchSnapshot();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined interactionId gracefully', () => {
      const {container} = render(<Task {...defaultProps} interactionId={undefined} />);

      expect(container).toMatchSnapshot();
    });

    it('handles zero values correctly', () => {
      const {container} = render(<Task {...defaultProps} startTimeStamp={0} ronaTimeout={0} />);

      expect(container).toMatchSnapshot();
    });

    it('handles empty string values', () => {
      const {container} = render(<Task {...defaultProps} title="" state="" queue="" styles="" />);

      expect(container).toMatchSnapshot();
    });

    it('handles all media channel combinations', () => {
      const mediaChannelCombinations: Array<{
        mediaType: MEDIA_CHANNEL;
        mediaChannel: MEDIA_CHANNEL;
        name: string;
      }> = [
        {mediaType: MEDIA_CHANNEL.EMAIL, mediaChannel: MEDIA_CHANNEL.EMAIL, name: 'email'},
        {mediaType: MEDIA_CHANNEL.SMS, mediaChannel: MEDIA_CHANNEL.SMS, name: 'sms'},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.FACEBOOK, name: 'facebook'},
        {mediaType: MEDIA_CHANNEL.SOCIAL, mediaChannel: MEDIA_CHANNEL.WHATSAPP, name: 'whatsapp'},
      ];

      mediaChannelCombinations.forEach(({mediaType, mediaChannel, name}) => {
        const {container} = render(
          <Task {...defaultProps} mediaType={mediaType} mediaChannel={mediaChannel} title="Media Test" />
        );

        expect(container).toMatchSnapshot(`media-combination-${name}`);
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

      const {container} = render(<Task {...functionProps} />);

      expect(container).toMatchSnapshot();
    });

    it('handles boolean props correctly', () => {
      const booleanTestCases: Array<{props: Partial<TaskProps>; name: string}> = [
        {
          props: {selected: true, isIncomingTask: true, disableAccept: true},
          name: 'selected-incoming-disabled',
        },
        {
          props: {selected: false, isIncomingTask: false, disableAccept: false},
          name: 'unselected-outgoing-enabled',
        },
      ];

      booleanTestCases.forEach(({props: booleanProps, name}) => {
        const testProps: TaskProps = {
          ...defaultProps,
          ...booleanProps,
          title: `Boolean Test ${name}`,
          acceptText: 'Accept',
        };

        const {container} = render(<Task {...testProps} />);

        expect(container).toMatchSnapshot(`boolean-props-${name}`);
      });
    });
  });

  describe('State and Queue Variations', () => {
    it('displays different task states', () => {
      const states = [
        {state: TaskState.NEW, name: 'new'},
        {state: TaskState.ACTIVE, name: 'active'},
        {state: TaskState.HOLD, name: 'hold'},
        {state: TaskState.CONNECTED, name: 'connected'},
      ];

      states.forEach(({state, name}) => {
        const {container} = render(<Task {...defaultProps} state={state} title={`Task ${name}`} />);
        expect(container).toMatchSnapshot(`task-state-${name}`);
      });
    });

    it('displays different queue types', () => {
      const queues = [
        {queue: TaskQueue.SUPPORT, name: 'support'},
        {queue: TaskQueue.SALES, name: 'sales'},
        {queue: TaskQueue.TECHNICAL, name: 'technical'},
      ];

      queues.forEach(({queue, name}) => {
        const {container} = render(
          <Task {...defaultProps} queue={queue} isIncomingTask={true} title={`Queue Task ${name}`} />
        );
        expect(container).toMatchSnapshot(`task-queue-${name}`);
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('renders complex task with all features', () => {
      const complexProps: TaskProps = {
        ...defaultProps,
        title: 'Complex Task with All Features',
        mediaType: MEDIA_CHANNEL.CHAT,
        mediaChannel: MEDIA_CHANNEL.CHAT,
        state: TaskState.CONNECTED,
        queue: TaskQueue.TECHNICAL,
        interactionId: 'complex-task-123',
        startTimeStamp: Date.now() - 120000,
        ronaTimeout: 45,
        isIncomingTask: false,
        selected: true,
        styles: 'complex-task-style',
        acceptText: 'Accept Chat',
        declineText: 'Decline Chat',
        disableAccept: false,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        onTaskSelect: mockOnTaskSelect,
      };

      const {container} = render(<Task {...complexProps} />);

      expect(container).toMatchSnapshot();
    });

    it('renders incoming task with countdown', () => {
      const incomingTaskProps: TaskProps = {
        ...defaultProps,
        title: 'Incoming Call with Countdown',
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        state: TaskState.NEW,
        queue: TaskQueue.SUPPORT,
        interactionId: 'incoming-vip-call',
        isIncomingTask: true,
        ronaTimeout: 60,
        acceptText: 'Accept VIP Call',
        declineText: 'Decline',
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
      };

      const {container} = render(<Task {...incomingTaskProps} />);

      expect(container).toMatchSnapshot();
    });

    it('renders digital media task with tooltip', () => {
      const digitalTaskProps: TaskProps = {
        ...defaultProps,
        title: 'Digital Media Task with Tooltip',
        mediaType: MEDIA_CHANNEL.EMAIL,
        mediaChannel: MEDIA_CHANNEL.EMAIL,
        state: TaskState.ACTIVE,
        queue: TaskQueue.SUPPORT,
        isIncomingTask: true,
        startTimeStamp: 1641234567890,
        selected: false,
        acceptText: 'Accept Email',
        declineText: 'Decline Email',
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
      };

      const {container} = render(<Task {...digitalTaskProps} />);

      expect(container).toMatchSnapshot();
    });
  });

  describe('Button State Variations', () => {
    it('renders task with only accept button', () => {
      const {container} = render(
        <Task {...defaultProps} acceptText="Accept Only" acceptTask={mockAcceptTask} title="Accept Only Task" />
      );

      expect(container).toMatchSnapshot();
    });

    it('renders task with only decline button', () => {
      const {container} = render(
        <Task {...defaultProps} declineText="Decline Only" declineTask={mockDeclineTask} title="Decline Only Task" />
      );

      expect(container).toMatchSnapshot();
    });

    it('renders task with disabled accept button', () => {
      const {container} = render(
        <Task
          {...defaultProps}
          acceptText="Disabled Accept"
          declineText="Decline"
          acceptTask={mockAcceptTask}
          declineTask={mockDeclineTask}
          disableAccept={true}
          title="Disabled Accept Task"
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('renders task with no buttons', () => {
      const {container} = render(<Task {...defaultProps} title="No Buttons Task" />);

      expect(container).toMatchSnapshot();
    });
  });
});
