import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import {mockTask, mockIncomingTaskData} from '@webex/test-fixtures';
import IncomingTaskComponent from '../../../../src/components/task/IncomingTask/incoming-task';
import {IncomingTaskComponentProps, MEDIA_CHANNEL} from '../../../../src/components/task/task.types';
import * as incomingTaskUtils from '../../../../src/components/task/IncomingTask/incoming-task.utils';

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

describe('IncomingTaskComponent', () => {
  // Mock functions
  const mockAccept = jest.fn();
  const mockReject = jest.fn();

  // Default props using IncomingTaskComponentProps interface
  const defaultProps: IncomingTaskComponentProps = {
    incomingTask: null,
    isBrowser: true,
    accept: mockAccept,
    reject: mockReject,
  };

  // Utility function spies
  const extractIncomingTaskDataSpy = jest.spyOn(incomingTaskUtils, 'extractIncomingTaskData');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    extractIncomingTaskDataSpy.mockRestore();
  });

  describe('Empty Component Scenarios', () => {
    it('should return empty component when incomingTask is null or undefined', async () => {
      // Test with null
      const propsWithNull: IncomingTaskComponentProps = {
        ...defaultProps,
        incomingTask: null,
      };

      const {container: containerNull} = await render(<IncomingTaskComponent {...propsWithNull} />);
      expect(containerNull).toMatchSnapshot();

      // Test with undefined
      const propsWithUndefined: IncomingTaskComponentProps = {
        ...defaultProps,
        incomingTask: undefined,
      };

      const {container: containerUndefined} = await render(<IncomingTaskComponent {...propsWithUndefined} />);
      expect(containerUndefined).toMatchSnapshot();
    });
  });

  describe('Rendering with Incoming Tasks', () => {
    const sampleIncomingTask = {
      ...mockTask,
      data: {
        ...mockTask.data,
        interactionId: 'incoming-task-123',
        interaction: {
          ...mockTask.data.interaction,
          state: 'new',
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          callAssociatedDetails: {
            ani: '1234567890',
            customerName: 'John Doe',
            virtualTeamName: 'Support Team',
            ronaTimeout: '30',
          },
        },
        wrapUpRequired: false,
      },
    };

    it('should render multiple incoming tasks with different media types and their corresponding icons and labels', async () => {
      // Create telephony WebRTC task
      const telephonyWebRTCTask = {
        ...sampleIncomingTask,
        data: {
          ...sampleIncomingTask.data,
          interactionId: 'telephony-webrtc-task',
          interaction: {
            ...sampleIncomingTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Telephony Customer',
              virtualTeamName: 'Support Team',
              ronaTimeout: '30',
            },
          },
        },
      };

      // Create telephony Extension task
      const telephonyExtensionTask = {
        ...sampleIncomingTask,
        data: {
          ...sampleIncomingTask.data,
          interactionId: 'telephony-extension-task',
          interaction: {
            ...sampleIncomingTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            callAssociatedDetails: {
              ani: '0987654321',
              customerName: 'Extension Customer',
              virtualTeamName: 'Mobile Support',
              ronaTimeout: '30',
            },
          },
        },
      };

      // Create chat task
      const chatTask = {
        ...sampleIncomingTask,
        data: {
          ...sampleIncomingTask.data,
          interactionId: 'chat-task',
          interaction: {
            ...sampleIncomingTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.CHAT,
            callAssociatedDetails: {
              ani: 'chat-user-123',
              customerName: 'Chat Customer',
              virtualTeamName: 'Chat Support',
              ronaTimeout: '60',
            },
          },
        },
      };

      // Create social (Facebook) task
      const socialTask = {
        ...sampleIncomingTask,
        data: {
          ...sampleIncomingTask.data,
          interactionId: 'social-task',
          interaction: {
            ...sampleIncomingTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.SOCIAL,
            mediaChannel: MEDIA_CHANNEL.FACEBOOK,
            callAssociatedDetails: {
              ani: 'facebook-user-456',
              customerName: 'Social Customer',
              virtualTeamName: 'Social Team',
              ronaTimeout: '45',
            },
          },
        },
      };

      // Mock different return values for each media type and device mode
      extractIncomingTaskDataSpy
        .mockReturnValueOnce(mockIncomingTaskData.webRTC) // WebRTC telephony
        .mockReturnValueOnce(mockIncomingTaskData.extension) // Extension telephony
        .mockReturnValueOnce(mockIncomingTaskData.chat) // Chat
        .mockReturnValueOnce(mockIncomingTaskData.social); // Social

      // Test WebRTC telephony task (isBrowser: true)
      const {container: webRTCContainer} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={telephonyWebRTCTask} isBrowser={true} />
      );
      expect(webRTCContainer).toMatchSnapshot();

      // Test Extension telephony task (isBrowser: false)
      const {container: extensionContainer} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={telephonyExtensionTask} isBrowser={false} />
      );
      expect(extensionContainer).toMatchSnapshot();

      // Test chat task
      const {container: chatContainer} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={chatTask} isBrowser={true} />
      );
      expect(chatContainer).toMatchSnapshot();

      // Test social task
      const {container: socialContainer} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={socialTask} isBrowser={true} />
      );
      expect(socialContainer).toMatchSnapshot();
    });

    it('should render telephony incoming task with Accept/Decline buttons in WebRTC mode', async () => {
      extractIncomingTaskDataSpy.mockReturnValue(mockIncomingTaskData.webRTC);

      const webRTCTask = {
        ...sampleIncomingTask,
        data: {
          ...sampleIncomingTask.data,
          interactionId: 'webrtc-telephony-task',
          interaction: {
            ...sampleIncomingTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.TELEPHONY,
          },
          wrapUpRequired: false,
        },
      };

      const {container} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={webRTCTask} isBrowser={true} />
      );
      expect(container).toMatchSnapshot();
    });

    it('should render telephony incoming task with disabled Accept button in Extension mode', async () => {
      extractIncomingTaskDataSpy.mockReturnValue(mockIncomingTaskData.extension);

      const extensionTask = {
        ...sampleIncomingTask,
        data: {
          ...sampleIncomingTask.data,
          interactionId: 'extension-telephony-task',
          interaction: {
            ...sampleIncomingTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.TELEPHONY,
          },
          wrapUpRequired: false,
        },
      };

      const {container} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={extensionTask} isBrowser={false} />
      );
      expect(container).toMatchSnapshot();
    });

    it('should render digital incoming task with Accept button only', async () => {
      extractIncomingTaskDataSpy.mockReturnValue(mockIncomingTaskData.chat);

      const incomingChatTask = {
        ...sampleIncomingTask,
        data: {
          ...sampleIncomingTask.data,
          interactionId: 'incoming-chat-task',
          interaction: {
            ...sampleIncomingTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.CHAT,
          },
          wrapUpRequired: false,
        },
      };

      const {container} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={incomingChatTask} isBrowser={true} />
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
          callAssociatedDetails: {
            ani: '1234567890',
            customerName: 'Action Customer',
            virtualTeamName: 'Action Team',
            ronaTimeout: '30',
          },
        },
        wrapUpRequired: false,
      },
    };

    beforeEach(() => {
      extractIncomingTaskDataSpy.mockReturnValue(mockIncomingTaskData.webRTC);
    });

    it('should call acceptTask when accept button is clicked', async () => {
      const {container} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={actionTask} isBrowser={true} />
      );

      expect(container).toMatchSnapshot();

      const acceptButton = container.querySelector('[data-testid="task:accept-button"]') as HTMLElement;
      fireEvent.click(acceptButton);

      expect(container).toMatchSnapshot();
    });

    it('should call declineTask when decline button is clicked', async () => {
      const {container} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={actionTask} isBrowser={true} />
      );

      expect(container).toMatchSnapshot();

      const declineButton = container.querySelector('[data-testid="task:decline-button"]') as HTMLElement;
      fireEvent.click(declineButton);

      expect(container).toMatchSnapshot();
    });
  });
});
