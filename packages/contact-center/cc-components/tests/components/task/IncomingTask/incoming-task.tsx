import React from 'react';
import {render, fireEvent, getByTestId} from '@testing-library/react';
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
  const loggerMock = {
    error: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
  };

  // Default props using IncomingTaskComponentProps interface
  const defaultProps: IncomingTaskComponentProps = {
    incomingTask: null,
    isBrowser: true,
    accept: mockAccept,
    reject: mockReject,
    logger: loggerMock,
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
      expect(containerNull).toBeEmptyDOMElement();
      expect(extractIncomingTaskDataSpy).not.toHaveBeenCalled();

      jest.clearAllMocks();

      // Test with undefined
      const propsWithUndefined: IncomingTaskComponentProps = {
        ...defaultProps,
        incomingTask: undefined,
      };

      const {container: containerUndefined} = await render(<IncomingTaskComponent {...propsWithUndefined} />);
      expect(containerUndefined).toBeEmptyDOMElement();
      expect(extractIncomingTaskDataSpy).not.toHaveBeenCalled();
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

      // Test Extension telephony task (isBrowser: false)
      const {container: extensionContainer} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={telephonyExtensionTask} isBrowser={false} />
      );

      // Test chat task
      const {container: chatContainer} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={chatTask} isBrowser={true} />
      );

      // Test social task
      const {container: socialContainer} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={socialTask} isBrowser={true} />
      );

      // Verify utility function was called correctly for each task
      expect(extractIncomingTaskDataSpy).toHaveBeenCalledTimes(4);
      expect(extractIncomingTaskDataSpy).toHaveBeenNthCalledWith(1, telephonyWebRTCTask, true, loggerMock, undefined);
      expect(extractIncomingTaskDataSpy).toHaveBeenNthCalledWith(
        2,
        telephonyExtensionTask,
        false,
        loggerMock,
        undefined
      );
      expect(extractIncomingTaskDataSpy).toHaveBeenNthCalledWith(3, chatTask, true, loggerMock, undefined);
      expect(extractIncomingTaskDataSpy).toHaveBeenNthCalledWith(4, socialTask, true, loggerMock, undefined);

      // === WebRTC Telephony Task Assertions ===
      const webRTCListItem = webRTCContainer.querySelector('li.task-list-item');
      expect(webRTCListItem).toBeInTheDocument();
      expect(webRTCListItem).toHaveClass('task-list-item');
      expect(webRTCListItem).toHaveClass('task-list-hover');
      expect(webRTCListItem).toHaveAttribute('data-allow-text-select', 'false');
      expect(webRTCListItem).toHaveAttribute('data-disabled', 'false');
      expect(webRTCListItem).toHaveAttribute('data-interactive', 'true');
      expect(webRTCListItem).toHaveAttribute('data-padded', 'false');
      expect(webRTCListItem).toHaveAttribute('data-shape', 'rectangle');
      expect(webRTCListItem).toHaveAttribute('data-size', '40');
      expect(webRTCListItem).toHaveAttribute('id', 'telephony-webrtc-task');
      expect(webRTCListItem).toHaveAttribute('role', 'listitem');
      expect(webRTCListItem).toHaveAttribute('tabindex', '0');

      // WebRTC avatar and icon
      const webRTCAvatar = webRTCContainer.querySelector('mdc-avatar');
      expect(webRTCAvatar).toBeInTheDocument();
      expect(webRTCAvatar).toHaveClass('telephony');
      expect(webRTCAvatar).toHaveAttribute('icon-name', 'handset-filled');
      expect(webRTCAvatar).toHaveAttribute('size', '32');

      // WebRTC task details
      const webRTCTitle = webRTCContainer.querySelector('.task-title');
      expect(webRTCTitle).toBeInTheDocument();
      expect(webRTCTitle).toHaveTextContent('1234567890'); // ANI as title
      expect(webRTCTitle).toHaveAttribute('type', 'body-large-medium');

      const webRTCTeam = webRTCContainer.querySelectorAll('.task-text')[0];
      expect(webRTCTeam).toHaveTextContent('Support Team');

      // WebRTC time display
      const webRTCTimeElement = webRTCContainer.querySelector('time');
      expect(webRTCTimeElement).toBeInTheDocument();
      expect(webRTCTimeElement).toHaveClass('task-text--secondary');
      expect(webRTCTimeElement).toHaveAttribute('datetime', '00:00');

      // WebRTC buttons - Both Accept and Decline
      const webRTCAcceptButton = webRTCContainer.querySelector('[data-testid="task:accept-button"]');
      const webRTCDeclineButton = webRTCContainer.querySelector('[data-testid="task:decline-button"]');
      expect(webRTCAcceptButton).toBeInTheDocument();
      expect(webRTCDeclineButton).toBeInTheDocument();
      expect(webRTCAcceptButton).toHaveClass('md-button-pill-wrapper');
      expect(webRTCAcceptButton).toHaveClass('md-button-simple-wrapper');
      expect(webRTCAcceptButton).toHaveTextContent('Accept');
      expect(webRTCAcceptButton).toHaveAttribute('data-color', 'join');
      expect(webRTCAcceptButton).toHaveAttribute('data-disabled', 'false');
      expect(webRTCAcceptButton).toHaveAttribute('data-disabled-outline', 'false');
      expect(webRTCAcceptButton).toHaveAttribute('data-ghost', 'false');
      expect(webRTCAcceptButton).toHaveAttribute('data-grown', 'false');
      expect(webRTCAcceptButton).toHaveAttribute('data-inverted', 'false');
      expect(webRTCAcceptButton).toHaveAttribute('data-outline', 'false');
      expect(webRTCAcceptButton).toHaveAttribute('data-shallow-disabled', 'false');
      expect(webRTCAcceptButton).toHaveAttribute('data-size', '40');
      expect(webRTCAcceptButton).toHaveAttribute('data-testid', 'task:accept-button');
      expect(webRTCAcceptButton).toHaveAttribute('tabindex', '-1');
      expect(webRTCAcceptButton).toHaveAttribute('type', 'button');

      expect(webRTCDeclineButton).toHaveAttribute('data-color', 'cancel');
      expect(webRTCDeclineButton).toHaveTextContent('Decline');
      expect(webRTCDeclineButton).toHaveAttribute('data-testid', 'task:decline-button');

      // === Extension Telephony Task Assertions ===
      const extensionListItem = extensionContainer.querySelector('li.task-list-item');
      expect(extensionListItem).toBeInTheDocument();
      expect(extensionListItem).toHaveClass('task-list-item');
      expect(extensionListItem).toHaveClass('task-list-hover');
      expect(extensionListItem).toHaveAttribute('data-allow-text-select', 'false');
      expect(extensionListItem).toHaveAttribute('data-disabled', 'false');
      expect(extensionListItem).toHaveAttribute('data-interactive', 'true');
      expect(extensionListItem).toHaveAttribute('data-padded', 'false');
      expect(extensionListItem).toHaveAttribute('data-shape', 'rectangle');
      expect(extensionListItem).toHaveAttribute('data-size', '40');
      expect(extensionListItem).toHaveAttribute('id', 'telephony-extension-task');
      expect(extensionListItem).toHaveAttribute('role', 'listitem');

      // Extension avatar and icon (same as WebRTC)
      const extensionAvatar = extensionContainer.querySelector('mdc-avatar');
      expect(extensionAvatar).toBeInTheDocument();
      expect(extensionAvatar).toHaveClass('telephony');
      expect(extensionAvatar).toHaveAttribute('icon-name', 'handset-filled');

      // Extension task details
      const extensionTitle = extensionContainer.querySelector('.task-title');
      expect(extensionTitle).toHaveTextContent('1234567890'); // ANI as title

      const extensionTeam = extensionContainer.querySelectorAll('.task-text')[0];
      expect(extensionTeam).toHaveTextContent('Mobile Support');

      // Extension buttons - Only Accept (disabled) button
      const extensionAcceptButton = extensionContainer.querySelector('[data-testid="task:accept-button"]');
      const extensionDeclineButton = extensionContainer.querySelector('[data-testid="task:decline-button"]');
      expect(extensionAcceptButton).toBeInTheDocument();
      expect(extensionDeclineButton).not.toBeInTheDocument(); // No decline button
      expect(extensionAcceptButton).toHaveAttribute('data-disabled', 'true');
      expect(extensionAcceptButton).toHaveAttribute('disabled', '');
      expect(extensionAcceptButton).toHaveTextContent('Ringing...');

      // === Chat Task Assertions ===
      const chatListItem = chatContainer.querySelector('li.task-list-item');
      expect(chatListItem).toBeInTheDocument();
      expect(chatListItem).toHaveAttribute('id', 'chat-task');

      // Chat avatar and icon
      const chatAvatar = chatContainer.querySelector('mdc-avatar');
      expect(chatAvatar).toBeInTheDocument();
      expect(chatAvatar).toHaveClass('chat');
      expect(chatAvatar).toHaveAttribute('icon-name', 'chat-filled');

      // Chat task details with tooltip
      const chatTitle = chatContainer.querySelector('.incoming-digital-task-title');
      expect(chatTitle).toBeInTheDocument();
      expect(chatTitle).toHaveTextContent('Chat Customer'); // Customer name as title
      expect(chatTitle).toHaveAttribute('aria-describedby', 'tooltip-chat-task');
      expect(chatTitle).toHaveAttribute('id', 'tooltip-trigger-chat-task');

      // Chat tooltip
      const chatTooltip = chatContainer.querySelector('mdc-tooltip');
      expect(chatTooltip).toBeInTheDocument();
      expect(chatTooltip).toHaveAttribute('id', 'tooltip-chat-task');
      expect(chatTooltip).toHaveAttribute('triggerid', 'tooltip-trigger-chat-task');
      expect(chatTooltip).toHaveTextContent('Chat Customer');

      const chatTeam = chatContainer.querySelectorAll('.task-text')[0];
      expect(chatTeam).toHaveTextContent('Chat Support');

      // Chat buttons - Only Accept button
      const chatAcceptButton = chatContainer.querySelector('[data-testid="task:accept-button"]');
      const chatDeclineButton = chatContainer.querySelector('[data-testid="task:decline-button"]');
      expect(chatAcceptButton).toBeInTheDocument();
      expect(chatDeclineButton).not.toBeInTheDocument(); // No decline button
      expect(chatAcceptButton).toHaveAttribute('data-disabled', 'false');
      expect(chatAcceptButton).toHaveTextContent('Accept');

      // === Social Task Assertions ===
      const socialListItem = socialContainer.querySelector('li.task-list-item');
      expect(socialListItem).toBeInTheDocument();
      expect(socialListItem).toHaveAttribute('id', 'social-task');

      // Social brand visual (different from avatar)
      const socialBrandBackground = socialContainer.querySelector('.brand-visual-background');
      expect(socialBrandBackground).toBeInTheDocument();

      const socialBrandVisual = socialContainer.querySelector('mdc-brandvisual');
      expect(socialBrandVisual).toBeInTheDocument();
      expect(socialBrandVisual).toHaveClass('facebook');
      expect(socialBrandVisual).toHaveAttribute('name', 'social-facebook-color');

      // Social task details with tooltip
      const socialTitle = socialContainer.querySelector('.incoming-digital-task-title');
      expect(socialTitle).toBeInTheDocument();
      expect(socialTitle).toHaveTextContent('Social Customer'); // Customer name as title
      expect(socialTitle).toHaveAttribute('aria-describedby', 'tooltip-social-task');
      expect(socialTitle).toHaveAttribute('id', 'tooltip-trigger-social-task');

      // Social tooltip
      const socialTooltip = socialContainer.querySelector('mdc-tooltip');
      expect(socialTooltip).toBeInTheDocument();
      expect(socialTooltip).toHaveAttribute('id', 'tooltip-social-task');
      expect(socialTooltip).toHaveAttribute('triggerid', 'tooltip-trigger-social-task');
      expect(socialTooltip).toHaveTextContent('Social Customer');

      const socialTeam = socialContainer.querySelectorAll('.task-text')[0];
      expect(socialTeam).toHaveTextContent('Social Team');

      // Social buttons - Only Accept button
      const socialAcceptButton = socialContainer.querySelector('[data-testid="task:accept-button"]');
      const socialDeclineButton = socialContainer.querySelector('[data-testid="task:decline-button"]');
      expect(socialAcceptButton).toBeInTheDocument();
      expect(socialDeclineButton).not.toBeInTheDocument(); // No decline button
      expect(socialAcceptButton).toHaveAttribute('data-disabled', 'false');
      expect(socialAcceptButton).toHaveTextContent('Accept');

      // === Media Type Specific Assertions ===
      // Verify different icon types
      expect(webRTCAvatar).toHaveAttribute('icon-name', 'handset-filled'); // Telephony
      expect(extensionAvatar).toHaveAttribute('icon-name', 'handset-filled'); // Telephony
      expect(chatAvatar).toHaveAttribute('icon-name', 'chat-filled'); // Chat
      expect(socialBrandVisual).toHaveAttribute('name', 'social-facebook-color'); // Social

      // Verify different avatar classes
      expect(webRTCAvatar).toHaveClass('telephony');
      expect(extensionAvatar).toHaveClass('telephony');
      expect(chatAvatar).toHaveClass('chat');
      expect(socialBrandVisual).toHaveClass('facebook');

      // Verify title display logic (ANI vs Customer Name)
      expect(webRTCTitle).toHaveTextContent('1234567890'); // ANI for telephony
      expect(extensionTitle).toHaveTextContent('1234567890'); // ANI for telephony
      expect(chatTitle).toHaveTextContent('Chat Customer'); // Customer name for digital
      expect(socialTitle).toHaveTextContent('Social Customer'); // Customer name for digital

      // Verify digital tasks have tooltips
      expect(chatTitle).toHaveClass('incoming-digital-task-title');
      expect(socialTitle).toHaveClass('incoming-digital-task-title');
      expect(webRTCTitle).toHaveClass('task-title'); // Regular title for telephony
      expect(extensionTitle).toHaveClass('task-title'); // Regular title for telephony

      // Verify button behavior differences
      expect(webRTCAcceptButton).not.toHaveAttribute('disabled'); // WebRTC enabled
      expect(extensionAcceptButton).toHaveAttribute('disabled', ''); // Extension disabled
      expect(chatAcceptButton).not.toHaveAttribute('disabled'); // Chat enabled
      expect(socialAcceptButton).not.toHaveAttribute('disabled'); // Social enabled

      // Verify decline button presence
      expect(webRTCDeclineButton).toBeInTheDocument(); // WebRTC has decline
      expect(extensionDeclineButton).not.toBeInTheDocument(); // Extension no decline
      expect(chatDeclineButton).not.toBeInTheDocument(); // Chat no decline
      expect(socialDeclineButton).not.toBeInTheDocument(); // Social no decline
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

      // Verify accept button exists
      const acceptButton = getByTestId(container, 'task:accept-button');
      expect(acceptButton).toBeInTheDocument();
      expect(acceptButton).toHaveTextContent('Accept');
      expect(acceptButton).not.toHaveAttribute('disabled');

      // Click the accept button
      fireEvent.click(acceptButton);

      // Verify accept function was called with correct task
      expect(mockAccept).toHaveBeenCalledTimes(1);
      expect(mockAccept).toHaveBeenCalledWith(actionTask);

      // Verify reject was not called
      expect(mockReject).not.toHaveBeenCalled();
    });

    it('should call declineTask when decline button is clicked', async () => {
      const {container} = await render(
        <IncomingTaskComponent {...defaultProps} incomingTask={actionTask} isBrowser={true} />
      );

      // Verify decline button exists
      const declineButton = getByTestId(container, 'task:decline-button');
      expect(declineButton).toBeInTheDocument();
      expect(declineButton).toHaveTextContent('Decline');
      expect(declineButton).not.toHaveAttribute('disabled');

      // Click the decline button
      fireEvent.click(declineButton);

      // Verify reject function was called with correct task
      expect(mockReject).toHaveBeenCalledTimes(1);
      expect(mockReject).toHaveBeenCalledWith(actionTask);

      // Verify accept was not called
      expect(mockAccept).not.toHaveBeenCalled();
    });
  });
});
