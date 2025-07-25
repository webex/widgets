import React from 'react';
import {render, fireEvent, getByTestId, getByRole} from '@testing-library/react';
import '@testing-library/jest-dom';
import Task, {TaskProps} from '../../../../src/components/task/Task';
import {MEDIA_CHANNEL, TaskState} from '../../../../src/components/task/task.types';
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

describe('Task Component Snapshots', () => {
  const mockAcceptTask = jest.fn();
  const mockDeclineTask = jest.fn();
  const mockOnTaskSelect = jest.fn();

  // Default props using TaskProps interface
  const defaultProps: TaskProps = {
    interactionId: 'test-interaction-123',
    title: 'Test Task',
    state: TaskState.CONNECTED,
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
    it('should render media type icons and brand visuals correctly for different channels', async () => {
      // Test 1: Telephony task with avatar icon
      const {container: telephonyContainer} = await render(<Task {...defaultProps} />);
      expect(telephonyContainer).toMatchSnapshot('telephony-task-with-avatar');

      // Test 2: Social media (Facebook) task with brand visual
      const facebookProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.SOCIAL,
        mediaChannel: MEDIA_CHANNEL.FACEBOOK,
        title: 'Facebook Customer',
      };

      const {container: facebookContainer} = await render(<Task {...facebookProps} />);
      expect(facebookContainer).toMatchSnapshot('facebook-task-with-brand-visual');

      // Test 3: Email task with avatar
      const emailProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.EMAIL,
        mediaChannel: MEDIA_CHANNEL.EMAIL,
        title: 'Email Subject Line',
        state: TaskState.ACTIVE,
      };

      const {container: emailContainer} = await render(<Task {...emailProps} />);
      expect(emailContainer).toMatchSnapshot('email-task-with-avatar');

      // Test 4: WhatsApp incoming task with brand visual
      const whatsappProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.SOCIAL,
        mediaChannel: MEDIA_CHANNEL.WHATSAPP,
        title: 'WhatsApp Contact',
        isIncomingTask: true,
      };

      const {container: whatsappContainer} = await render(<Task {...whatsappProps} />);
      expect(whatsappContainer).toMatchSnapshot('whatsapp-incoming-task-with-brand-visual');

      // Test 5: Chat task with avatar
      const chatProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.CHAT,
        mediaChannel: MEDIA_CHANNEL.CHAT,
        title: 'Chat Customer Name',
        isIncomingTask: false,
      };

      const {container: chatContainer} = await render(<Task {...chatProps} />);
      expect(chatContainer).toMatchSnapshot('chat-task-with-avatar');
    });

    it('should render titles and tooltips correctly based on media type and selection state', async () => {
      // Test 1: Task without title should not render any title elements
      const noTitleProps = {
        ...defaultProps,
        title: undefined,
      };

      const {container: noTitleContainer} = await render(<Task {...noTitleProps} />);
      expect(noTitleContainer).toMatchSnapshot('task-without-title');

      // Test 2: Voice media (Telephony) should render simple title without tooltip
      const telephonyWithTitleProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        title: 'John Doe - Customer Call',
      };

      const {container: telephonyContainer} = await render(<Task {...telephonyWithTitleProps} />);
      expect(telephonyContainer).toMatchSnapshot('telephony-task-with-simple-title');

      // Test 3: Digital media (Chat) should render title with tooltip for user assistance
      const chatWithTitleProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.CHAT,
        mediaChannel: MEDIA_CHANNEL.CHAT,
        title: 'Live Chat with Customer Support',
        isIncomingTask: false,
      };

      const {container: chatContainer} = await render(<Task {...chatWithTitleProps} />);
      expect(chatContainer).toMatchSnapshot('chat-task-with-title-and-tooltip');

      // Test 4: Selected digital task should display bold title for visual emphasis
      const selectedEmailProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.EMAIL,
        mediaChannel: MEDIA_CHANNEL.EMAIL,
        title: 'Urgent: Customer Complaint Email',
        selected: true,
      };

      const {container: selectedContainer} = await render(<Task {...selectedEmailProps} />);
      expect(selectedContainer).toMatchSnapshot('selected-email-task-with-bold-title');

      // Test 5: Unselected digital task should display medium weight title
      const unselectedEmailProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.EMAIL,
        mediaChannel: MEDIA_CHANNEL.EMAIL,
        title: 'Standard Customer Inquiry Email',
        selected: false,
      };

      const {container: unselectedContainer} = await render(<Task {...unselectedEmailProps} />);
      expect(unselectedContainer).toMatchSnapshot('unselected-email-task-with-medium-title');

      // Test 6: Incoming digital task should use specialized styling and tooltip
      const incomingFacebookProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.SOCIAL,
        mediaChannel: MEDIA_CHANNEL.FACEBOOK,
        title: 'New Facebook Message from Customer',
        isIncomingTask: true,
      };

      const {container: incomingContainer} = await render(<Task {...incomingFacebookProps} />);
      expect(incomingContainer).toMatchSnapshot('incoming-facebook-task-with-special-styling');

      // Test 7: Selected voice task should affect title weight
      const selectedVoiceProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        title: 'Important Customer Call',
        selected: true,
      };

      const {container: selectedVoiceContainer} = await render(<Task {...selectedVoiceProps} />);
      expect(selectedVoiceContainer).toMatchSnapshot('selected-voice-task-with-bold-title');

      // Test 8: Selected task with custom styles
      const selectedWithStylesProps = {
        ...defaultProps,
        selected: true,
        styles: 'custom-task-style task-highlight',
      };

      const {container: styledContainer} = await render(<Task {...selectedWithStylesProps} />);
      expect(styledContainer).toMatchSnapshot('selected-task-with-custom-styles');

      // Test 9: Empty string title should behave like undefined title
      const emptyTitleProps = {
        ...defaultProps,
        title: '',
      };

      const {container: emptyTitleContainer} = await render(<Task {...emptyTitleProps} />);
      expect(emptyTitleContainer).toMatchSnapshot('task-with-empty-string-title');
    });

    it('should render state, queue, and time information correctly for different task scenarios', async () => {
      // Test 1: Active task with state and handle time
      const activeProps = {
        ...defaultProps,
        state: TaskState.CONNECTED,
        startTimeStamp: 1641234567890,
        isIncomingTask: false,
      };

      const {container: activeContainer} = await render(<Task {...activeProps} />);
      expect(activeContainer).toMatchSnapshot();

      // Test 2: Incoming task with queue and time left (RONA timeout)
      const incomingProps = {
        ...defaultProps,
        isIncomingTask: true,
        queue: 'Support Team',
        ronaTimeout: 30,
        state: TaskState.NEW,
        startTimeStamp: 1641234567890,
      };

      const {container: incomingContainer} = await render(<Task {...incomingProps} />);
      expect(incomingContainer).toMatchSnapshot();

      // Test 3: WhatsApp incoming task with queue and handle time (no RONA)
      const whatsappProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.SOCIAL,
        mediaChannel: MEDIA_CHANNEL.WHATSAPP,
        isIncomingTask: true,
        queue: 'WhatsApp Support',
        ronaTimeout: undefined, // No RONA timeout
        startTimeStamp: 1641234567890,
      };

      const {container: whatsappContainer} = await render(<Task {...whatsappProps} />);
      expect(whatsappContainer).toMatchSnapshot();
    });

    it('should render accept and decline buttons with correct states and properties', async () => {
      // Test 1: Task with both accept and decline buttons
      const bothButtonsProps = {
        ...defaultProps,
        acceptText: 'Accept',
        declineText: 'Decline',
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
      };

      const {container: bothButtonsContainer} = await render(<Task {...bothButtonsProps} />);
      expect(bothButtonsContainer).toMatchSnapshot();

      // Test 2: Task with disabled accept button
      const disabledProps = {
        ...defaultProps,
        acceptText: 'Ringing...',
        disableAccept: true,
        acceptTask: mockAcceptTask,
      };

      const {container: disabledContainer} = await render(<Task {...disabledProps} />);
      expect(disabledContainer).toMatchSnapshot();

      // Test 3: Verify button container data attributes
      const buttonDataProps = {
        ...defaultProps,
        acceptText: 'Accept Call',
        acceptTask: mockAcceptTask,
      };

      const {container: buttonDataContainer} = await render(<Task {...buttonDataProps} />);
      expect(buttonDataContainer).toMatchSnapshot();
    });

    it('should handle default prop values and edge cases correctly', async () => {
      // Test 1: Component with minimal props (tests default values)
      const minimalProps = {
        interactionId: 'test-minimal-123',
        title: 'Minimal Task',
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        // Intentionally omitting: selected, isIncomingTask, disableAccept
        // to test default values
      };

      const {container: minimalContainer} = await render(<Task {...minimalProps} />);
      expect(minimalContainer).toMatchSnapshot('minimal-task-with-default-values');

      // Test 2: Task with accept button using default disableAccept = false
      const enabledAcceptProps = {
        interactionId: 'test-enabled-456',
        title: 'Enabled Accept Task',
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        acceptText: 'Accept Now',
        acceptTask: mockAcceptTask,
        // Intentionally omitting disableAccept to test default false value
      };

      const {container: enabledContainer} = await render(<Task {...enabledAcceptProps} />);
      expect(enabledContainer).toMatchSnapshot('task-with-enabled-accept-button');

      // Test 3: Explicitly test selected = false vs undefined
      const explicitlyUnselectedProps = {
        ...defaultProps,
        selected: false, // Explicitly set to false
        title: 'Explicitly Unselected Task',
      };

      const {container: explicitContainer} = await render(<Task {...explicitlyUnselectedProps} />);
      expect(explicitContainer).toMatchSnapshot('explicitly-unselected-task');

      // Test 4: Explicitly test isIncomingTask = false vs undefined
      const explicitlyNotIncomingProps = {
        ...defaultProps,
        isIncomingTask: false, // Explicitly set to false
        state: TaskState.CONNECTED,
        startTimeStamp: 1641234567890,
        queue: 'Should Not Show Queue', // Queue provided but shouldn't show
      };

      const {container: notIncomingContainer} = await render(<Task {...explicitlyNotIncomingProps} />);
      expect(notIncomingContainer).toMatchSnapshot('explicitly-not-incoming-task');

      // Test 5: Explicitly test disableAccept = false vs undefined
      const explicitlyEnabledProps = {
        ...defaultProps,
        acceptText: 'Join Meeting',
        acceptTask: mockAcceptTask,
        disableAccept: false, // Explicitly set to false
      };

      const {container: explicitEnabledContainer} = await render(<Task {...explicitlyEnabledProps} />);
      expect(explicitEnabledContainer).toMatchSnapshot('explicitly-enabled-accept-button');

      // Test 6: Component without any optional props (pure minimal)
      const pureMinimalProps = {
        interactionId: 'pure-minimal-789',
        // Only required props - everything else should use defaults
      };

      const {container: pureContainer} = await render(<Task {...pureMinimalProps} />);
      expect(pureContainer).toMatchSnapshot('pure-minimal-task-props');

      // Test 7: Edge case - all boolean props set to their default values explicitly
      const allDefaultsExplicitProps = {
        interactionId: 'all-defaults-explicit',
        title: 'All Defaults Explicit',
        selected: false, // Explicit default
        isIncomingTask: false, // Explicit default
        disableAccept: false, // Explicit default
        acceptText: 'Accept',
        acceptTask: mockAcceptTask,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
      };

      const {container: allDefaultsContainer} = await render(<Task {...allDefaultsExplicitProps} />);
      expect(allDefaultsContainer).toMatchSnapshot('all-explicit-default-values');
    });
  });

  describe('Actions', () => {
    it('should handle accept task action correctly', async () => {
      // Accept button click calls acceptTask callback
      const acceptProps = {
        ...defaultProps,
        acceptText: 'Accept',
        acceptTask: mockAcceptTask,
      };

      const {container: acceptContainer} = await render(<Task {...acceptProps} />);
      expect(acceptContainer).toMatchSnapshot();

      const acceptButton = getByTestId(acceptContainer, 'task:accept-button');
      fireEvent.click(acceptButton);
      expect(acceptContainer).toMatchSnapshot();

      // Disabled accept button does not trigger callback
      const disabledAcceptProps = {
        ...defaultProps,
        acceptText: 'Ringing...',
        disableAccept: true,
        acceptTask: mockAcceptTask,
      };

      jest.clearAllMocks();

      const {container: disabledContainer} = await render(<Task {...disabledAcceptProps} />);
      expect(disabledContainer).toMatchSnapshot();

      const disabledAcceptButton = getByTestId(disabledContainer, 'task:accept-button');
      fireEvent.click(disabledAcceptButton);
      expect(disabledContainer).toMatchSnapshot();

      // Accept action with both buttons - only accept should be called
      const bothButtonsProps = {
        ...defaultProps,
        acceptText: 'Accept Call',
        declineText: 'Decline',
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
      };

      jest.clearAllMocks();

      const {container: bothContainer} = await render(<Task {...bothButtonsProps} />);
      expect(bothContainer).toMatchSnapshot();

      const acceptButtonBoth = getByTestId(bothContainer, 'task:accept-button');
      fireEvent.click(acceptButtonBoth);
      expect(bothContainer).toMatchSnapshot();
    });

    it('should handle decline task action correctly', async () => {
      // Test 1: Decline button click calls declineTask callback
      const declineProps = {
        ...defaultProps,
        declineText: 'Decline',
        declineTask: mockDeclineTask,
      };

      const {container: declineContainer} = await render(<Task {...declineProps} />);
      expect(declineContainer).toMatchSnapshot();

      const declineButton = getByTestId(declineContainer, 'task:decline-button');
      fireEvent.click(declineButton);
      expect(declineContainer).toMatchSnapshot();

      // Test 2: Decline action with both buttons - only decline should be called
      const bothButtonsProps = {
        ...defaultProps,
        acceptText: 'Accept',
        declineText: 'Decline Call',
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
      };

      jest.clearAllMocks();

      const {container: bothContainer} = await render(<Task {...bothButtonsProps} />);
      expect(bothContainer).toMatchSnapshot();

      const declineButtonBoth = getByTestId(bothContainer, 'task:decline-button');
      fireEvent.click(declineButtonBoth);
      expect(bothContainer).toMatchSnapshot();

      // Test 3: Multiple decline clicks should call callback multiple times
      jest.clearAllMocks();

      fireEvent.click(declineButtonBoth);
      fireEvent.click(declineButtonBoth);
      expect(bothContainer).toMatchSnapshot();
    });

    it('should handle task selection action correctly', async () => {
      // Test 1: Task list item click calls onTaskSelect callback
      const selectProps = {
        ...defaultProps,
        onTaskSelect: mockOnTaskSelect,
      };

      const {container: selectContainer} = await render(<Task {...selectProps} />);
      expect(selectContainer).toMatchSnapshot();

      const listItem = getByRole(selectContainer, 'listitem');
      fireEvent.click(listItem);
      expect(selectContainer).toMatchSnapshot();

      // Test 2: Task selection with buttons - selection should work independently
      const selectWithButtonsProps = {
        ...defaultProps,
        onTaskSelect: mockOnTaskSelect,
        acceptText: 'Accept',
        declineText: 'Decline',
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
      };

      jest.clearAllMocks();

      const {container: selectButtonsContainer} = await render(<Task {...selectWithButtonsProps} />);
      expect(selectButtonsContainer).toMatchSnapshot();

      const listItemWithButtons = getByRole(selectButtonsContainer, 'listitem');
      const acceptButton = getByTestId(selectButtonsContainer, 'task:accept-button');
      const declineButton = getByTestId(selectButtonsContainer, 'task:decline-button');

      // Click on list item (not buttons)
      fireEvent.click(listItemWithButtons);
      expect(selectButtonsContainer).toMatchSnapshot();

      // Verify buttons still work independently
      jest.clearAllMocks();

      fireEvent.click(acceptButton);
      expect(selectButtonsContainer).toMatchSnapshot();

      fireEvent.click(declineButton);
      expect(selectButtonsContainer).toMatchSnapshot();

      // Test 3: Selected task maintains selection behavior
      const selectedTaskProps = {
        ...defaultProps,
        selected: true,
        onTaskSelect: mockOnTaskSelect,
      };

      jest.clearAllMocks();

      const {container: selectedContainer} = await render(<Task {...selectedTaskProps} />);
      expect(selectedContainer).toMatchSnapshot();

      const selectedListItem = getByRole(selectedContainer, 'listitem');
      fireEvent.click(selectedListItem);
      expect(selectedContainer).toMatchSnapshot();

      // Test 4: Multiple task selection clicks
      jest.clearAllMocks();

      fireEvent.click(selectedListItem);
      fireEvent.click(selectedListItem);
      fireEvent.click(selectedListItem);
      expect(selectedContainer).toMatchSnapshot();

      // Test 5: Task selection with different media types
      const digitalTaskSelectProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.CHAT,
        mediaChannel: MEDIA_CHANNEL.CHAT,
        title: 'Chat Customer',
        onTaskSelect: mockOnTaskSelect,
      };

      jest.clearAllMocks();

      const {container: digitalSelectContainer} = await render(<Task {...digitalTaskSelectProps} />);
      expect(digitalSelectContainer).toMatchSnapshot();

      const digitalListItem = getByRole(digitalSelectContainer, 'listitem');
      fireEvent.click(digitalListItem);
      expect(digitalSelectContainer).toMatchSnapshot();

      // Test 6: Task selection with custom styles
      const styledTaskProps = {
        ...defaultProps,
        onTaskSelect: mockOnTaskSelect,
        styles: 'custom-task-style',
        selected: false,
      };

      jest.clearAllMocks();

      const {container: styledContainer} = await render(<Task {...styledTaskProps} />);
      expect(styledContainer).toMatchSnapshot();

      const styledListItem = getByRole(styledContainer, 'listitem');
      fireEvent.click(styledListItem);
      expect(styledContainer).toMatchSnapshot();

      // Test 7: Task selection with incoming task
      const incomingTaskProps = {
        ...defaultProps,
        isIncomingTask: true,
        onTaskSelect: mockOnTaskSelect,
      };

      jest.clearAllMocks();

      const {container: incomingContainer} = await render(<Task {...incomingTaskProps} />);
      expect(incomingContainer).toMatchSnapshot();

      const incomingListItem = getByRole(incomingContainer, 'listitem');
      fireEvent.click(incomingListItem);
      expect(incomingContainer).toMatchSnapshot();
    });
  });
});
