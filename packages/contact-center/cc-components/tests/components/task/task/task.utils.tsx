import {
  capitalizeFirstWord,
  getTitleClassName,
  createTooltipIds,
  shouldShowState,
  shouldShowQueue,
  shouldShowHandleTime,
  shouldShowTimeLeft,
  getTaskListItemClasses,
  extractTaskComponentData,
} from '../../../../src/components/task/Task/task.utils';
import {MEDIA_CHANNEL} from '../../../../src/components/task/task.types';
import * as utils from '../../../../src/utils';

describe('task.utils', () => {
  // Spy on the getMediaTypeInfo function
  let mockGetMediaTypeInfo: jest.SpyInstance;

  beforeAll(() => {
    mockGetMediaTypeInfo = jest.spyOn(utils, 'getMediaTypeInfo');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockGetMediaTypeInfo.mockRestore();
  });

  describe('capitalizeFirstWord', () => {
    it('should capitalize the first letter of a word', () => {
      expect(capitalizeFirstWord('hello')).toBe('Hello');
      expect(capitalizeFirstWord('world')).toBe('World');
    });

    it('should handle edge cases', () => {
      // Empty strings
      expect(capitalizeFirstWord('')).toBe('');
      // Single character
      expect(capitalizeFirstWord('a')).toBe('A');
      // Already capitalized
      expect(capitalizeFirstWord('Hello')).toBe('Hello');
      // Leading whitespace
      expect(capitalizeFirstWord('  hello')).toBe('Hello');
      // Numbers and special characters
      expect(capitalizeFirstWord('123abc')).toBe('123abc');
      expect(capitalizeFirstWord('!hello')).toBe('!hello');
      expect(capitalizeFirstWord(' hello world')).toBe('Hello world');
    });
  });

  describe('getTitleClassName', () => {
    it('should return correct class names for different task types', () => {
      expect(getTitleClassName(true, true)).toBe('incoming-digital-task-title');
      expect(getTitleClassName(true, false)).toBe('task-digital-title');
      expect(getTitleClassName(false, true)).toBe('task-title');
      expect(getTitleClassName(false, false)).toBe('task-title');
    });
  });

  describe('createTooltipIds', () => {
    it('should create tooltip IDs with interaction ID', () => {
      const result = createTooltipIds('test-123');
      expect(result).toEqual({
        tooltipTriggerId: 'tooltip-trigger-test-123',
        tooltipId: 'tooltip-test-123',
      });
    });
  });

  describe('shouldShowState', () => {
    it('should determine state visibility based on business rules', () => {
      // Show state when active task (not incoming)
      expect(shouldShowState('connected', false)).toBe(true);
      // Don't show state for incoming tasks
      expect(shouldShowState('new', true)).toBe(false);
      // Don't show when no state
      expect(shouldShowState(undefined, false)).toBe(false);
      expect(shouldShowState('', false)).toBe(false);
    });
  });

  describe('shouldShowQueue', () => {
    it('should determine queue visibility based on business rules', () => {
      // Show queue only for incoming tasks
      expect(shouldShowQueue('Support Team', true)).toBe(true);
      expect(shouldShowQueue('Sales Team', true)).toBe(true);
      // Don't show queue for active tasks
      expect(shouldShowQueue('Support Team', false)).toBe(false);
      // Don't show when no queue
      expect(shouldShowQueue(undefined, true)).toBe(false);
      expect(shouldShowQueue('', true)).toBe(false);
    });
  });

  describe('shouldShowHandleTime', () => {
    it('should determine handle time visibility based on business rules', () => {
      // Don't show without startTimeStamp
      expect(shouldShowHandleTime(false, undefined, undefined)).toBe(false);
      expect(shouldShowHandleTime(true, 30, undefined)).toBe(false);
      // Show for incoming task without RONA timeout
      expect(shouldShowHandleTime(true, undefined, 1641234567890)).toBe(true);
      expect(shouldShowHandleTime(true, 0, 1641234567890)).toBe(true);
      // Don't show for incoming task with RONA timeout
      expect(shouldShowHandleTime(true, 30, 1641234567890)).toBe(false);
      // Always show for active tasks with timestamp
      expect(shouldShowHandleTime(false, undefined, 1641234567890)).toBe(true);
      expect(shouldShowHandleTime(false, 30, 1641234567890)).toBe(true);
    });
  });

  describe('shouldShowTimeLeft', () => {
    it('should determine time left visibility based on business rules', () => {
      // Show only for incoming tasks with RONA timeout
      expect(shouldShowTimeLeft(true, 30)).toBe(true);
      expect(shouldShowTimeLeft(true, 60)).toBe(true);
      // Don't show for active tasks
      expect(shouldShowTimeLeft(false, 30)).toBe(false);
      // Don't show without timeout
      expect(shouldShowTimeLeft(true, undefined)).toBe(false);
      expect(shouldShowTimeLeft(true, 0)).toBe(false);
      // Handle edge cases
      expect(shouldShowTimeLeft(undefined, 30)).toBe(false);
      expect(shouldShowTimeLeft(undefined, undefined)).toBe(false);
    });
  });

  describe('getTaskListItemClasses', () => {
    it('should build CSS classes correctly', () => {
      expect(getTaskListItemClasses()).toBe('task-list-item');
      expect(getTaskListItemClasses(true)).toBe('task-list-item task-list-item--selected');
      expect(getTaskListItemClasses(false)).toBe('task-list-item');
      expect(getTaskListItemClasses(false, 'custom-class')).toBe('task-list-item  custom-class');
      expect(getTaskListItemClasses(true, 'custom-class another-class')).toBe(
        'task-list-item task-list-item--selected custom-class another-class'
      );
    });
  });

  describe('extractTaskComponentData', () => {
    beforeEach(() => {
      // Ensure mock is cleared and ready for each test
      mockGetMediaTypeInfo.mockClear();
    });

    it('should extract data for telephony task correctly', () => {
      // Mock telephony media type info to match actual implementation
      mockGetMediaTypeInfo.mockReturnValue({
        labelName: 'Call',
        iconName: 'handset-filled',
        className: 'telephony',
        isBrandVisual: false,
      });

      const input = {
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: false,
        interactionId: 'test-123',
        state: 'active',
        queue: 'support team',
        ronaTimeout: undefined,
        startTimeStamp: 1641234567890,
      };

      const result = extractTaskComponentData(input);

      expect(result).toEqual({
        currentMediaType: {
          labelName: 'Call',
          iconName: 'handset-filled',
          className: 'telephony',
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
        capitalizedQueue: 'Support team',
      });

      expect(mockGetMediaTypeInfo).toHaveBeenCalledTimes(1);
      expect(mockGetMediaTypeInfo).toHaveBeenCalledWith(MEDIA_CHANNEL.TELEPHONY, MEDIA_CHANNEL.TELEPHONY);
    });

    it('should extract data for social media incoming task correctly', () => {
      // Mock social media type info to match actual implementation
      mockGetMediaTypeInfo.mockReturnValue({
        labelName: 'Chat',
        iconName: 'chat-filled',
        className: 'social',
        isBrandVisual: false,
      });

      const input = {
        mediaType: MEDIA_CHANNEL.SOCIAL,
        mediaChannel: MEDIA_CHANNEL.SOCIAL,
        isIncomingTask: true,
        interactionId: 'social-456',
        state: 'new',
        queue: 'social support',
        ronaTimeout: 30,
        startTimeStamp: 1641234567890,
      };

      const result = extractTaskComponentData(input);

      expect(result).toEqual({
        currentMediaType: {
          labelName: 'Chat',
          iconName: 'chat-filled',
          className: 'social',
          isBrandVisual: false,
        },
        isNonVoiceMedia: true,
        tooltipTriggerId: 'tooltip-trigger-social-456',
        tooltipId: 'tooltip-social-456',
        titleClassName: 'incoming-digital-task-title',
        shouldShowState: false,
        shouldShowQueue: true,
        shouldShowHandleTime: false,
        shouldShowTimeLeft: true,
        capitalizedState: 'New',
        capitalizedQueue: 'Social support',
      });

      expect(mockGetMediaTypeInfo).toHaveBeenCalledTimes(1);
      expect(mockGetMediaTypeInfo).toHaveBeenCalledWith(MEDIA_CHANNEL.SOCIAL, MEDIA_CHANNEL.SOCIAL);
    });

    it('should extract data for chat task correctly', () => {
      // Mock chat media type info to match actual implementation
      mockGetMediaTypeInfo.mockReturnValue({
        labelName: 'Chat',
        iconName: 'chat-filled',
        className: 'chat',
        isBrandVisual: false,
      });

      const input = {
        mediaType: MEDIA_CHANNEL.CHAT,
        mediaChannel: MEDIA_CHANNEL.CHAT,
        isIncomingTask: false,
        interactionId: 'chat-789',
        state: 'connected',
        queue: 'chat team',
        ronaTimeout: undefined,
        startTimeStamp: 1641234567890,
      };

      const result = extractTaskComponentData(input);

      expect(result).toEqual({
        currentMediaType: {
          labelName: 'Chat',
          iconName: 'chat-filled',
          className: 'chat',
          isBrandVisual: false,
        },
        isNonVoiceMedia: true,
        tooltipTriggerId: 'tooltip-trigger-chat-789',
        tooltipId: 'tooltip-chat-789',
        titleClassName: 'task-digital-title',
        shouldShowState: true,
        shouldShowQueue: false,
        shouldShowHandleTime: true,
        shouldShowTimeLeft: false,
        capitalizedState: 'Connected',
        capitalizedQueue: 'Chat team',
      });

      expect(mockGetMediaTypeInfo).toHaveBeenCalledTimes(1);
      expect(mockGetMediaTypeInfo).toHaveBeenCalledWith(MEDIA_CHANNEL.CHAT, MEDIA_CHANNEL.CHAT);
    });

    it('should handle default values and edge cases', () => {
      // Mock default media type info to match actual implementation (defaults to telephony)
      mockGetMediaTypeInfo.mockReturnValue({
        labelName: 'Call',
        iconName: 'handset-filled',
        className: 'telephony',
        isBrandVisual: false,
      });

      const result = extractTaskComponentData({});

      expect(result).toEqual({
        currentMediaType: {
          labelName: 'Call',
          iconName: 'handset-filled',
          className: 'telephony',
          isBrandVisual: false,
        },
        isNonVoiceMedia: false,
        tooltipTriggerId: 'tooltip-trigger-undefined',
        tooltipId: 'tooltip-undefined',
        titleClassName: 'task-title',
        shouldShowState: false,
        shouldShowQueue: false,
        shouldShowHandleTime: false,
        shouldShowTimeLeft: false,
        capitalizedState: '',
        capitalizedQueue: '',
      });

      expect(mockGetMediaTypeInfo).toHaveBeenCalledTimes(1);
      expect(mockGetMediaTypeInfo).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should determine voice vs non-voice media correctly', () => {
      // Test voice media (telephony)
      mockGetMediaTypeInfo.mockReturnValueOnce({
        labelName: 'Call',
        iconName: 'handset-filled',
        className: 'telephony',
        isBrandVisual: false,
      });

      let result = extractTaskComponentData({
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
      });

      expect(result.isNonVoiceMedia).toBe(false);
      expect(mockGetMediaTypeInfo).toHaveBeenCalledWith(MEDIA_CHANNEL.TELEPHONY, MEDIA_CHANNEL.TELEPHONY);

      // Clear the mock for the next call
      mockGetMediaTypeInfo.mockClear();

      // Test non-voice media (email)
      mockGetMediaTypeInfo.mockReturnValueOnce({
        labelName: 'Email',
        iconName: 'email-filled',
        className: 'email',
        isBrandVisual: false,
      });

      result = extractTaskComponentData({
        mediaType: MEDIA_CHANNEL.EMAIL,
        mediaChannel: MEDIA_CHANNEL.EMAIL,
      });

      expect(result.isNonVoiceMedia).toBe(true);
      expect(mockGetMediaTypeInfo).toHaveBeenCalledWith(MEDIA_CHANNEL.EMAIL, MEDIA_CHANNEL.EMAIL);
    });
  });
});
