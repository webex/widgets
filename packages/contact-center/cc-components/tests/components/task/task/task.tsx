import React from 'react';
import {render, fireEvent, within, getByTestId, getByRole, queryByTestId} from '@testing-library/react';
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

describe('Task Component', () => {
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

      // Verify telephony avatar
      const telephonyAvatar = telephonyContainer.querySelector('mdc-avatar');
      expect(telephonyAvatar).toBeInTheDocument();
      expect(telephonyAvatar).toHaveClass('telephony');
      expect(telephonyAvatar).toHaveAttribute('icon-name', 'handset-filled');
      expect(telephonyAvatar).toHaveAttribute('size', '32');

      // Verify no tooltip for telephony
      const telephonyTooltip = telephonyContainer.querySelector('mdc-tooltip');
      expect(telephonyTooltip).not.toBeInTheDocument();

      // Test 2: Social media (Facebook) task with brand visual
      const facebookProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.SOCIAL,
        mediaChannel: MEDIA_CHANNEL.FACEBOOK,
        title: 'Facebook Customer',
      };

      const {container: facebookContainer} = await render(<Task {...facebookProps} />);

      // Verify brand visual background
      const brandVisualBackground = facebookContainer.querySelector('.brand-visual-background');
      expect(brandVisualBackground).toBeInTheDocument();

      // Verify Facebook brand visual
      const facebookBrandVisual = facebookContainer.querySelector('mdc-brandvisual');
      expect(facebookBrandVisual).toBeInTheDocument();
      expect(facebookBrandVisual).toHaveClass('facebook');
      expect(facebookBrandVisual).toHaveAttribute('name', 'social-facebook-color');

      // Verify no avatar for social media
      const socialAvatar = facebookContainer.querySelector('mdc-avatar');
      expect(socialAvatar).not.toBeInTheDocument();

      // Test 3: Email task with avatar
      const emailProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.EMAIL,
        mediaChannel: MEDIA_CHANNEL.EMAIL,
        title: 'Email Subject Line',
        state: TaskState.ACTIVE,
      };

      const {container: emailContainer} = await render(<Task {...emailProps} />);

      // Verify email avatar
      const emailAvatar = emailContainer.querySelector('mdc-avatar');
      expect(emailAvatar).toBeInTheDocument();
      expect(emailAvatar).toHaveClass('email');
      expect(emailAvatar).toHaveAttribute('icon-name', 'email-filled');
      expect(emailAvatar).toHaveAttribute('size', '32');

      // Test 4: WhatsApp incoming task with brand visual
      const whatsappProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.SOCIAL,
        mediaChannel: MEDIA_CHANNEL.WHATSAPP,
        title: 'WhatsApp Contact',
        isIncomingTask: true,
      };

      const {container: whatsappContainer} = await render(<Task {...whatsappProps} />);

      // Verify WhatsApp brand visual
      const whatsappBrandVisual = whatsappContainer.querySelector('mdc-brandvisual');
      expect(whatsappBrandVisual).toBeInTheDocument();
      expect(whatsappBrandVisual).toHaveClass('whatsapp');
      expect(whatsappBrandVisual).toHaveAttribute('name', 'social-whatsapp-color');

      // Test 5: Chat task with avatar
      const chatProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.CHAT,
        mediaChannel: MEDIA_CHANNEL.CHAT,
        title: 'Chat Customer Name',
        isIncomingTask: false,
      };

      const {container: chatContainer} = await render(<Task {...chatProps} />);

      // Verify chat avatar
      const chatAvatar = chatContainer.querySelector('mdc-avatar');
      expect(chatAvatar).toBeInTheDocument();
      expect(chatAvatar).toHaveClass('chat');
      expect(chatAvatar).toHaveAttribute('icon-name', 'chat-filled');
      expect(chatAvatar).toHaveAttribute('size', '32');
    });

    it('should render titles and tooltips correctly based on media type and selection state', async () => {
      // Test 1: Task without title should not render any title elements
      const noTitleProps = {
        ...defaultProps,
        title: undefined,
      };

      const {container: noTitleContainer} = await render(<Task {...noTitleProps} />);

      // Verify no title elements are rendered when title is undefined
      const noTitle = noTitleContainer.querySelector('.task-title');
      const noDigitalTitle = noTitleContainer.querySelector('.task-digital-title');
      const noIncomingTitle = noTitleContainer.querySelector('.incoming-digital-task-title');

      expect(noTitle).not.toBeInTheDocument();
      expect(noDigitalTitle).not.toBeInTheDocument();
      expect(noIncomingTitle).not.toBeInTheDocument();

      // Test 2: Voice media (Telephony) should render simple title without tooltip
      const telephonyWithTitleProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        title: 'John Doe - Customer Call',
      };

      const {container: telephonyContainer} = await render(<Task {...telephonyWithTitleProps} />);

      // Verify regular title is rendered for voice media without extra UI elements
      const voiceTitle = telephonyContainer.querySelector('.task-title');
      expect(voiceTitle).toBeInTheDocument();
      expect(voiceTitle).toHaveTextContent('John Doe - Customer Call');
      expect(voiceTitle).not.toHaveAttribute('id'); // No tooltip trigger needed for voice

      // Verify tooltip is not rendered for voice media to keep UI clean
      const noTooltip = telephonyContainer.querySelector('mdc-tooltip');
      expect(noTooltip).not.toBeInTheDocument();

      // Test 3: Digital media (Chat) should render title with tooltip for user assistance
      const chatWithTitleProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.CHAT,
        mediaChannel: MEDIA_CHANNEL.CHAT,
        title: 'Live Chat with Customer Support',
        isIncomingTask: false,
      };

      const {container: chatContainer} = await render(<Task {...chatWithTitleProps} />);

      // Verify digital title is rendered with proper accessibility attributes
      const digitalTitle = chatContainer.querySelector('.task-digital-title');
      expect(digitalTitle).toBeInTheDocument();
      expect(digitalTitle).toHaveTextContent('Live Chat with Customer Support');
      expect(digitalTitle).toHaveAttribute('id', 'tooltip-trigger-test-interaction-123');

      // Verify tooltip is rendered for non-voice media to show full title on hover
      const tooltip = chatContainer.querySelector('mdc-tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveClass('task-tooltip');
      expect(tooltip).toHaveAttribute('id', 'tooltip-test-interaction-123');
      expect(tooltip).toHaveAttribute('triggerid', 'tooltip-trigger-test-interaction-123');
      expect(tooltip).toHaveTextContent('Live Chat with Customer Support');
      expect(tooltip).toHaveAttribute('append-to', '');
      expect(tooltip).toHaveAttribute('color', 'contrast');
      expect(tooltip).toHaveAttribute('delay', '0,0');
      expect(tooltip).toHaveAttribute('disable-aria-expanded', '');
      expect(tooltip).toHaveAttribute('flip', '');
      expect(tooltip).toHaveAttribute('hide-on-blur', '');
      expect(tooltip).toHaveAttribute('hide-on-escape', '');
      expect(tooltip).toHaveAttribute('offset', '4');
      expect(tooltip).toHaveAttribute('placement', 'top-start');
      expect(tooltip).toHaveAttribute('role', 'tooltip');
      expect(tooltip).toHaveAttribute('style', 'z-index: 1000;');
      expect(tooltip).toHaveAttribute('tooltip-type', 'description');
      expect(tooltip).toHaveAttribute('trigger', 'mouseenter focusin');
      expect(tooltip).toHaveAttribute('z-index', '1000');

      // Test 4: Selected digital task should display bold title for visual emphasis
      const selectedEmailProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.EMAIL,
        mediaChannel: MEDIA_CHANNEL.EMAIL,
        title: 'Urgent: Customer Complaint Email',
        selected: true,
      };

      const {container: selectedContainer} = await render(<Task {...selectedEmailProps} />);

      // Verify selected task uses bold typography to indicate active state
      const selectedTitle = selectedContainer.querySelector('.task-digital-title');
      expect(selectedTitle).toBeInTheDocument();
      expect(selectedTitle).toHaveAttribute('type', 'body-large-bold');
      expect(selectedTitle).toHaveAttribute('id', 'tooltip-trigger-test-interaction-123');
      expect(selectedTitle).toHaveAttribute('tagname', 'span');

      // Test 5: Unselected digital task should display medium weight title
      const unselectedEmailProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.EMAIL,
        mediaChannel: MEDIA_CHANNEL.EMAIL,
        title: 'Standard Customer Inquiry Email',
        selected: false,
      };

      const {container: unselectedContainer} = await render(<Task {...unselectedEmailProps} />);
      // Verify unselected task uses medium typography for standard appearance
      const unselectedTitle = unselectedContainer.querySelector('.task-digital-title');
      expect(unselectedTitle).toBeInTheDocument();
      expect(unselectedTitle).toHaveAttribute('type', 'body-large-medium');
      expect(unselectedTitle).toHaveAttribute('id', 'tooltip-trigger-test-interaction-123');
      expect(unselectedTitle).toHaveAttribute('tagname', 'span');

      // Test 6: Incoming digital task should use specialized styling and tooltip
      const incomingFacebookProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.SOCIAL,
        mediaChannel: MEDIA_CHANNEL.FACEBOOK,
        title: 'New Facebook Message from Customer',
        isIncomingTask: true,
      };

      const {container: incomingContainer} = await render(<Task {...incomingFacebookProps} />);

      // Verify incoming task uses special CSS class for visual distinction
      const incomingTitle = incomingContainer.querySelector('.incoming-digital-task-title');
      expect(incomingTitle).toBeInTheDocument();
      expect(incomingTitle).toHaveTextContent('New Facebook Message from Customer');
      expect(incomingTitle).toHaveAttribute('id', 'tooltip-trigger-test-interaction-123');

      // Verify tooltip is available for incoming tasks to show full context
      const incomingTooltip = incomingContainer.querySelector('mdc-tooltip');
      expect(incomingTooltip).toBeInTheDocument();
      expect(incomingTooltip).toHaveTextContent('New Facebook Message from Customer');

      // Test 7: Selected voice task should affect title weight
      const selectedVoiceProps = {
        ...defaultProps,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        title: 'Important Customer Call',
        selected: true,
      };

      const {container: selectedVoiceContainer} = await render(<Task {...selectedVoiceProps} />);

      // Verify selected voice task uses bold typography
      const selectedVoiceTitle = selectedVoiceContainer.querySelector('.task-title');
      expect(selectedVoiceTitle).toHaveAttribute('type', 'body-large-bold');

      // Test 8: Selected task with custom styles
      const selectedWithStylesProps = {
        ...defaultProps,
        selected: true,
        styles: 'custom-task-style task-highlight',
      };

      const {container: styledContainer} = await render(<Task {...selectedWithStylesProps} />);

      // Verify selected task CSS classes
      const selectedListItem = styledContainer.querySelector('[role="listitem"]');
      expect(selectedListItem).toHaveClass(
        'task-list-item',
        'task-list-item--selected',
        'custom-task-style',
        'task-highlight'
      );

      // Test 9: Empty string title should behave like undefined title
      const emptyTitleProps = {
        ...defaultProps,
        title: '',
      };

      const {container: emptyTitleContainer} = await render(<Task {...emptyTitleProps} />);

      // Verify empty title is treated as no title
      const noEmptyTitle = emptyTitleContainer.querySelector('.task-title');
      const noEmptyDigitalTitle = emptyTitleContainer.querySelector('.task-digital-title');

      expect(noEmptyTitle).not.toBeInTheDocument();
      expect(noEmptyDigitalTitle).not.toBeInTheDocument();
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

      // Verify state display
      const stateText = getByTestId(activeContainer, 'test-interaction-123-state');
      expect(stateText).toHaveClass('md-text-wrapper', 'task-text');
      expect(stateText).toHaveAttribute('tagname', 'span');
      expect(stateText).toHaveAttribute('type', 'body-midsize-regular');
      expect(stateText).toHaveTextContent('Connected');

      // Verify handle time display
      const handleTime = getByTestId(activeContainer, 'test-interaction-123-handle-time');
      expect(handleTime).toHaveClass('md-text-wrapper', 'task-text');
      expect(handleTime).toHaveTextContent('Handle Time:');

      const handleTimeElement = within(handleTime).getByRole('time');
      expect(handleTimeElement).toHaveClass('task-text', 'task-text--secondary');
      expect(handleTimeElement).toHaveAttribute('datetime', '00:00');
      expect(handleTimeElement).toHaveTextContent('00:00');

      // Verify no queue display for active task using queryByTestId
      const noQueue = queryByTestId(activeContainer, 'test-interaction-123-queue');
      expect(noQueue).not.toBeInTheDocument();

      // Verify no time left display using queryByTestId
      const noTimeLeft = queryByTestId(activeContainer, 'test-interaction-123-time-left');
      expect(noTimeLeft).not.toBeInTheDocument();

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

      // Verify queue display
      const queueText = getByTestId(incomingContainer, 'test-interaction-123-queue');
      expect(queueText).toHaveClass('md-text-wrapper', 'task-text');
      expect(queueText).toHaveAttribute('tagname', 'span');
      expect(queueText).toHaveAttribute('type', 'body-midsize-regular');
      expect(queueText).toHaveTextContent('Support Team');

      // Verify time left display
      const timeLeft = getByTestId(incomingContainer, 'test-interaction-123-time-left');
      expect(timeLeft).toHaveClass('md-text-wrapper', 'task-text');
      expect(timeLeft).toHaveTextContent('Time Left:');

      const timeLeftElement = within(timeLeft).getByRole('time');
      expect(timeLeftElement).toHaveClass('task-text', 'task-text--secondary');
      expect(timeLeftElement).toHaveAttribute('datetime', '00:00');

      // Verify no state display for incoming task
      const noState = queryByTestId(incomingContainer, 'test-interaction-123-state');
      expect(noState).not.toBeInTheDocument();

      // Verify no handle time display when RONA timeout exists
      const noHandleTime = queryByTestId(incomingContainer, 'test-interaction-123-handle-time');
      expect(noHandleTime).not.toBeInTheDocument();

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

      // Verify queue display
      const whatsappQueue = getByTestId(whatsappContainer, 'test-interaction-123-queue');
      expect(whatsappQueue).toHaveTextContent('WhatsApp Support');

      // Verify handle time display (since no RONA timeout)
      const whatsappHandleTime = getByTestId(whatsappContainer, 'test-interaction-123-handle-time');
      expect(whatsappHandleTime).toHaveTextContent('Handle Time:');
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

      // Verify button container
      const buttonContainer = bothButtonsContainer.querySelector('.task-button-container');
      expect(buttonContainer).toBeInTheDocument();

      // Verify accept button
      const acceptButton = getByTestId(bothButtonsContainer, 'task:accept-button');
      expect(acceptButton).toHaveClass('md-button-pill-wrapper', 'md-button-simple-wrapper');
      expect(acceptButton).toHaveAttribute('data-color', 'join');
      expect(acceptButton).toHaveAttribute('data-disabled', 'false');
      expect(acceptButton).toHaveAttribute('data-size', '40');
      expect(acceptButton).toHaveAttribute('type', 'button');
      expect(acceptButton).toHaveAttribute('tabindex', '-1');
      expect(acceptButton).not.toHaveAttribute('disabled');

      const acceptButtonSpan = within(acceptButton).getByText('Accept');
      expect(acceptButtonSpan).toBeInTheDocument();

      // Verify decline button
      const declineButton = getByTestId(bothButtonsContainer, 'task:decline-button');
      expect(declineButton).toHaveClass('md-button-pill-wrapper', 'md-button-simple-wrapper');
      expect(declineButton).toHaveAttribute('data-color', 'cancel');
      expect(declineButton).toHaveAttribute('data-disabled', 'false');
      expect(declineButton).toHaveAttribute('data-size', '40');
      expect(declineButton).toHaveAttribute('type', 'button');
      expect(declineButton).toHaveAttribute('tabindex', '-1');

      const declineButtonSpan = within(declineButton).getByText('Decline');
      expect(declineButtonSpan).toBeInTheDocument();

      // Test 2: Task with disabled accept button
      const disabledProps = {
        ...defaultProps,
        acceptText: 'Ringing...',
        disableAccept: true,
        acceptTask: mockAcceptTask,
      };

      const {container: disabledContainer} = await render(<Task {...disabledProps} />);

      // Verify disabled accept button
      const disabledAcceptButton = getByTestId(disabledContainer, 'task:accept-button');
      expect(disabledAcceptButton).toHaveAttribute('data-color', 'join');
      expect(disabledAcceptButton).toHaveAttribute('data-disabled', 'true');
      expect(disabledAcceptButton).toHaveAttribute('disabled', '');

      const disabledButtonSpan = within(disabledAcceptButton).getByText('Ringing...');
      expect(disabledButtonSpan).toBeInTheDocument();

      // Verify no decline button when not provided
      const noDeclineButton = queryByTestId(disabledContainer, 'task:decline-button');
      expect(noDeclineButton).not.toBeInTheDocument();

      // Test 3: Verify button container data attributes
      const buttonDataProps = {
        ...defaultProps,
        acceptText: 'Accept Call',
        acceptTask: mockAcceptTask,
      };

      const {container: buttonDataContainer} = await render(<Task {...buttonDataProps} />);

      // Use getByTestId for type safety
      const buttonWithData = getByTestId(buttonDataContainer, 'task:accept-button');
      expect(buttonWithData).toHaveAttribute('data-disabled-outline', 'false');
      expect(buttonWithData).toHaveAttribute('data-ghost', 'false');
      expect(buttonWithData).toHaveAttribute('data-grown', 'false');
      expect(buttonWithData).toHaveAttribute('data-inverted', 'false');
      expect(buttonWithData).toHaveAttribute('data-outline', 'false');
      expect(buttonWithData).toHaveAttribute('data-shallow-disabled', 'false');

      // Verify button text
      const buttonDataSpan = within(buttonWithData).getByText('Accept Call');
      expect(buttonDataSpan).toBeInTheDocument();
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

      // Verify default selected = false is applied
      const unselectedListItem = getByRole(minimalContainer, 'listitem');
      expect(unselectedListItem).toHaveClass('task-list-item');
      expect(unselectedListItem).not.toHaveClass('task-list-item--selected');

      // Verify default isIncomingTask = false behavior (shows state, not queue)
      const noQueue = queryByTestId(minimalContainer, 'test-minimal-123-queue');
      expect(noQueue).not.toBeInTheDocument();

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

      // Verify default disableAccept = false is applied
      const enabledAcceptButton = getByTestId(enabledContainer, 'task:accept-button');
      expect(enabledAcceptButton).toHaveAttribute('data-disabled', 'false');
      expect(enabledAcceptButton).not.toHaveAttribute('disabled');

      // Verify button is clickable with default enabled state
      fireEvent.click(enabledAcceptButton);
      expect(mockAcceptTask).toHaveBeenCalledTimes(1);

      // Test 3: Explicitly test selected = false vs undefined
      const explicitlyUnselectedProps = {
        ...defaultProps,
        selected: false, // Explicitly set to false
        title: 'Explicitly Unselected Task',
      };

      const {container: explicitContainer} = await render(<Task {...explicitlyUnselectedProps} />);

      const explicitListItem = getByRole(explicitContainer, 'listitem');
      expect(explicitListItem).not.toHaveClass('task-list-item--selected');

      // Verify title uses medium weight for unselected state
      const explicitTitle = explicitContainer.querySelector('.task-title');
      expect(explicitTitle).toHaveAttribute('type', 'body-large-medium');

      // Test 4: Explicitly test isIncomingTask = false vs undefined
      const explicitlyNotIncomingProps = {
        ...defaultProps,
        isIncomingTask: false, // Explicitly set to false
        state: TaskState.CONNECTED,
        startTimeStamp: 1641234567890,
        queue: 'Should Not Show Queue', // Queue provided but shouldn't show
      };

      const {container: notIncomingContainer} = await render(<Task {...explicitlyNotIncomingProps} />);

      // Verify explicit isIncomingTask = false shows state, not queue
      const stateElement = getByTestId(notIncomingContainer, 'test-interaction-123-state');
      expect(stateElement).toBeInTheDocument();
      expect(stateElement).toHaveTextContent('Connected');

      const noQueueElement = queryByTestId(notIncomingContainer, 'test-interaction-123-queue');
      expect(noQueueElement).not.toBeInTheDocument();

      // Test 5: Explicitly test disableAccept = false vs undefined
      const explicitlyEnabledProps = {
        ...defaultProps,
        acceptText: 'Join Meeting',
        acceptTask: mockAcceptTask,
        disableAccept: false, // Explicitly set to false
      };

      jest.clearAllMocks();

      const {container: explicitEnabledContainer} = await render(<Task {...explicitlyEnabledProps} />);

      const explicitEnabledButton = getByTestId(explicitEnabledContainer, 'task:accept-button');
      expect(explicitEnabledButton).toHaveAttribute('data-disabled', 'false');
      expect(explicitEnabledButton).not.toHaveAttribute('disabled');

      // Verify explicit false allows button interaction
      fireEvent.click(explicitEnabledButton);
      expect(mockAcceptTask).toHaveBeenCalledTimes(1);

      // Test 6: Component without any optional props (pure minimal)
      const pureMinimalProps = {
        interactionId: 'pure-minimal-789',
        // Only required props - everything else should use defaults
      };

      const {container: pureContainer} = await render(<Task {...pureMinimalProps} />);

      // Verify component renders with all defaults
      const pureListItem = getByRole(pureContainer, 'listitem');
      expect(pureListItem).toHaveClass('task-list-item');
      expect(pureListItem).not.toHaveClass('task-list-item--selected'); // selected = false default
      expect(pureListItem).toHaveAttribute('id', 'pure-minimal-789');

      // Verify empty button container (no accept/decline text provided)
      const emptyButtonContainer = pureContainer.querySelector('.task-button-container');
      expect(emptyButtonContainer).toBeInTheDocument();
      expect(emptyButtonContainer).toBeEmptyDOMElement();

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

      jest.clearAllMocks();

      const {container: allDefaultsContainer} = await render(<Task {...allDefaultsExplicitProps} />);

      // Verify all explicit defaults work correctly
      const allDefaultsListItem = getByRole(allDefaultsContainer, 'listitem');
      expect(allDefaultsListItem).not.toHaveClass('task-list-item--selected');

      const allDefaultsButton = getByTestId(allDefaultsContainer, 'task:accept-button');
      expect(allDefaultsButton).not.toHaveAttribute('disabled');

      fireEvent.click(allDefaultsButton);
      expect(mockAcceptTask).toHaveBeenCalledTimes(1);
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

      const acceptButton = getByTestId(acceptContainer, 'task:accept-button');
      expect(acceptButton).not.toHaveAttribute('disabled');

      fireEvent.click(acceptButton);

      expect(mockAcceptTask).toHaveBeenCalledTimes(1);
      expect(mockDeclineTask).not.toHaveBeenCalled();
      expect(mockOnTaskSelect).not.toHaveBeenCalled();

      // Verify accept button text content
      const acceptButtonSpan = within(acceptButton).getByText('Accept');
      expect(acceptButtonSpan).toBeInTheDocument();

      // Disabled accept button does not trigger callback
      const disabledAcceptProps = {
        ...defaultProps,
        acceptText: 'Ringing...',
        disableAccept: true,
        acceptTask: mockAcceptTask,
      };

      jest.clearAllMocks();

      const {container: disabledContainer} = await render(<Task {...disabledAcceptProps} />);

      const disabledAcceptButton = getByTestId(disabledContainer, 'task:accept-button');
      expect(disabledAcceptButton).toHaveAttribute('disabled', '');
      expect(disabledAcceptButton).toHaveAttribute('data-disabled', 'true');

      fireEvent.click(disabledAcceptButton);

      expect(mockAcceptTask).not.toHaveBeenCalled();
      expect(mockDeclineTask).not.toHaveBeenCalled();
      expect(mockOnTaskSelect).not.toHaveBeenCalled();

      // Verify disabled button text content
      const disabledButtonSpan = within(disabledAcceptButton).getByText('Ringing...');
      expect(disabledButtonSpan).toBeInTheDocument();

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

      const acceptButtonBoth = getByTestId(bothContainer, 'task:accept-button');

      fireEvent.click(acceptButtonBoth);

      expect(mockAcceptTask).toHaveBeenCalledTimes(1);
      expect(mockDeclineTask).not.toHaveBeenCalled();
      expect(mockOnTaskSelect).not.toHaveBeenCalled();
    });

    it('should handle decline task action correctly', async () => {
      // Test 1: Decline button click calls declineTask callback
      const declineProps = {
        ...defaultProps,
        declineText: 'Decline',
        declineTask: mockDeclineTask,
      };

      const {container: declineContainer} = await render(<Task {...declineProps} />);

      const declineButton = getByTestId(declineContainer, 'task:decline-button');
      expect(declineButton).not.toHaveAttribute('disabled');
      expect(declineButton).toHaveAttribute('data-color', 'cancel');

      fireEvent.click(declineButton);

      expect(mockDeclineTask).toHaveBeenCalledTimes(1);
      expect(mockAcceptTask).not.toHaveBeenCalled();
      expect(mockOnTaskSelect).not.toHaveBeenCalled();

      // Verify decline button text content
      const declineButtonSpan = within(declineButton).getByText('Decline');
      expect(declineButtonSpan).toBeInTheDocument();

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

      const declineButtonBoth = getByTestId(bothContainer, 'task:decline-button');

      fireEvent.click(declineButtonBoth);

      expect(mockDeclineTask).toHaveBeenCalledTimes(1);
      expect(mockAcceptTask).not.toHaveBeenCalled();
      expect(mockOnTaskSelect).not.toHaveBeenCalled();

      // Test 3: Multiple decline clicks should call callback multiple times
      jest.clearAllMocks();

      fireEvent.click(declineButtonBoth);
      fireEvent.click(declineButtonBoth);

      expect(mockDeclineTask).toHaveBeenCalledTimes(2);
      expect(mockAcceptTask).not.toHaveBeenCalled();
    });

    it('should handle task selection action correctly', async () => {
      // Test 1: Task list item click calls onTaskSelect callback
      const selectProps = {
        ...defaultProps,
        onTaskSelect: mockOnTaskSelect,
      };

      const {container: selectContainer} = await render(<Task {...selectProps} />);

      const listItem = getByRole(selectContainer, 'listitem');
      expect(listItem).toHaveAttribute('id', 'test-interaction-123');
      expect(listItem).toHaveClass('task-list-item');

      fireEvent.click(listItem);

      expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);
      expect(mockAcceptTask).not.toHaveBeenCalled();
      expect(mockDeclineTask).not.toHaveBeenCalled();

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

      const listItemWithButtons = getByRole(selectButtonsContainer, 'listitem');

      // Click on list item (not buttons)
      fireEvent.click(listItemWithButtons);

      expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);
      expect(mockAcceptTask).not.toHaveBeenCalled();
      expect(mockDeclineTask).not.toHaveBeenCalled();

      // Test accept button with fresh render
      jest.clearAllMocks();
      const {container: acceptTestContainer} = await render(<Task {...selectWithButtonsProps} />);
      const acceptTestButton = getByTestId(acceptTestContainer, 'task:accept-button');

      fireEvent.click(acceptTestButton);
      expect(mockAcceptTask).toHaveBeenCalledTimes(1);
      expect(mockOnTaskSelect).not.toHaveBeenCalled();

      // Test decline button with fresh render
      jest.clearAllMocks();
      const {container: declineTestContainer} = await render(<Task {...selectWithButtonsProps} />);
      const declineTestButton = getByTestId(declineTestContainer, 'task:decline-button');

      fireEvent.click(declineTestButton);
      expect(mockDeclineTask).toHaveBeenCalledTimes(1);
      expect(mockOnTaskSelect).not.toHaveBeenCalled();

      // Test 3: Selected task maintains selection behavior
      const selectedTaskProps = {
        ...defaultProps,
        selected: true,
        onTaskSelect: mockOnTaskSelect,
      };

      jest.clearAllMocks();

      const {container: selectedContainer} = await render(<Task {...selectedTaskProps} />);

      const selectedListItem = getByRole(selectedContainer, 'listitem');
      expect(selectedListItem).toHaveClass('task-list-item', 'task-list-item--selected');

      fireEvent.click(selectedListItem);

      expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

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

      const digitalListItem = getByRole(digitalSelectContainer, 'listitem');
      fireEvent.click(digitalListItem);

      expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);

      // Verify the task still renders with chat avatar
      const chatAvatar = digitalSelectContainer.querySelector('mdc-avatar.chat');
      expect(chatAvatar).toBeInTheDocument();

      // Test 6: Task selection with custom styles
      const styledTaskProps = {
        ...defaultProps,
        onTaskSelect: mockOnTaskSelect,
        styles: 'custom-task-style',
        selected: false,
      };

      jest.clearAllMocks();

      const {container: styledContainer} = await render(<Task {...styledTaskProps} />);

      const styledListItem = getByRole(styledContainer, 'listitem');
      expect(styledListItem).toHaveClass('task-list-item', 'custom-task-style');
      expect(styledListItem).not.toHaveClass('task-list-item--selected');

      fireEvent.click(styledListItem);

      expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);

      // Test 7: Task selection with incoming task
      const incomingTaskProps = {
        ...defaultProps,
        isIncomingTask: true,
        onTaskSelect: mockOnTaskSelect,
      };

      jest.clearAllMocks();

      const {container: incomingContainer} = await render(<Task {...incomingTaskProps} />);

      const incomingListItem = getByRole(incomingContainer, 'listitem');
      fireEvent.click(incomingListItem);

      expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);

      // Test 10: List item accessibility attributes
      expect(listItem).toHaveAttribute('role', 'listitem');
      expect(listItem).toHaveAttribute('tabindex', '0');
      expect(listItem).toHaveAttribute('data-interactive', 'true');
    });
  });
});
