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

// Mock the getMediaTypeInfo function
jest.mock('../../../../src/utils', () => ({
  getMediaTypeInfo: jest.fn(),
}));

import {getMediaTypeInfo} from '../../../../src/utils';
const mockGetMediaTypeInfo = getMediaTypeInfo as jest.MockedFunction<typeof getMediaTypeInfo>;

describe('task.utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('capitalizeFirstWord', () => {
    it('should capitalize the first letter of a word', () => {
      expect(capitalizeFirstWord('hello')).toBe('Hello');
      expect(capitalizeFirstWord('world')).toBe('World');
    });

    it('should handle strings with leading whitespace', () => {
      expect(capitalizeFirstWord('  hello')).toBe('Hello');
      expect(capitalizeFirstWord('\tworld')).toBe('World');
    });

    it('should handle empty strings', () => {
      expect(capitalizeFirstWord('')).toBe('');
    });

    it('should handle single character strings', () => {
      expect(capitalizeFirstWord('a')).toBe('A');
      expect(capitalizeFirstWord('z')).toBe('Z');
    });

    it('should handle strings that are already capitalized', () => {
      expect(capitalizeFirstWord('Hello')).toBe('Hello');
      expect(capitalizeFirstWord('WORLD')).toBe('WORLD');
    });

    it('should handle strings with numbers and special characters', () => {
      expect(capitalizeFirstWord('123abc')).toBe('123abc');
      expect(capitalizeFirstWord('!hello')).toBe('!hello');
      expect(capitalizeFirstWord(' hello world')).toBe('Hello world');
    });
  });

  describe('getTitleClassName', () => {
    it('should return correct class for incoming digital task', () => {
      const result = getTitleClassName(true, true);
      expect(result).toBe('incoming-digital-task-title');
    });

    it('should return correct class for active digital task', () => {
      const result = getTitleClassName(true, false);
      expect(result).toBe('task-digital-title');
    });

    it('should return correct class for voice tasks', () => {
      const result = getTitleClassName(false, true);
      expect(result).toBe('task-title');
    });

    it('should return correct class for active voice tasks', () => {
      const result = getTitleClassName(false, false);
      expect(result).toBe('task-title');
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

    it('should handle undefined interaction ID', () => {
      const result = createTooltipIds(undefined);
      expect(result).toEqual({
        tooltipTriggerId: 'tooltip-trigger-undefined',
        tooltipId: 'tooltip-undefined',
      });
    });

    it('should handle empty string interaction ID', () => {
      const result = createTooltipIds('');
      expect(result).toEqual({
        tooltipTriggerId: 'tooltip-trigger-',
        tooltipId: 'tooltip-',
      });
    });

    it('should handle interaction ID with special characters', () => {
      const result = createTooltipIds('test-123_abc!@#');
      expect(result).toEqual({
        tooltipTriggerId: 'tooltip-trigger-test-123_abc!@#',
        tooltipId: 'tooltip-test-123_abc!@#',
      });
    });
  });

  describe('shouldShowState', () => {
    it('should return true when state exists and not incoming task', () => {
      expect(shouldShowState('active', false)).toBe(true);
      expect(shouldShowState('connected', false)).toBe(true);
    });

    it('should return false when incoming task', () => {
      expect(shouldShowState('active', true)).toBe(false);
      expect(shouldShowState('new', true)).toBe(false);
    });

    it('should return false when no state', () => {
      expect(shouldShowState(undefined, false)).toBe(false);
      expect(shouldShowState('', false)).toBe(false);
    });

    it('should return false when no state and incoming task', () => {
      expect(shouldShowState(undefined, true)).toBe(false);
      expect(shouldShowState('', true)).toBe(false);
    });

    it('should handle undefined isIncomingTask parameter', () => {
      expect(shouldShowState('active', undefined)).toBe(true);
      expect(shouldShowState('active')).toBe(true);
    });
  });

  describe('shouldShowQueue', () => {
    it('should return true when queue exists and is incoming task', () => {
      expect(shouldShowQueue('Support Team', true)).toBe(true);
      expect(shouldShowQueue('Sales Team', true)).toBe(true);
    });

    it('should return false when not incoming task', () => {
      expect(shouldShowQueue('Support Team', false)).toBe(false);
      expect(shouldShowQueue('Sales Team', false)).toBe(false);
    });

    it('should return false when no queue', () => {
      expect(shouldShowQueue(undefined, true)).toBe(false);
      expect(shouldShowQueue('', true)).toBe(false);
    });

    it('should return false when no queue and not incoming task', () => {
      expect(shouldShowQueue(undefined, false)).toBe(false);
      expect(shouldShowQueue('', false)).toBe(false);
    });

    it('should handle undefined isIncomingTask parameter', () => {
      expect(shouldShowQueue('Support Team', undefined)).toBe(false);
      expect(shouldShowQueue('Support Team')).toBe(false);
    });
  });

  describe('shouldShowHandleTime', () => {
    it('should return false when no startTimeStamp', () => {
      expect(shouldShowHandleTime(false, undefined, undefined)).toBe(false);
      expect(shouldShowHandleTime(true, 30, undefined)).toBe(false);
    });

    it('should return true for incoming task without RONA timeout', () => {
      expect(shouldShowHandleTime(true, undefined, 1641234567890)).toBe(true);
      expect(shouldShowHandleTime(true, 0, 1641234567890)).toBe(true);
    });

    it('should return false for incoming task with RONA timeout', () => {
      expect(shouldShowHandleTime(true, 30, 1641234567890)).toBe(false);
      expect(shouldShowHandleTime(true, 60, 1641234567890)).toBe(false);
    });

    it('should return true for non-incoming task', () => {
      expect(shouldShowHandleTime(false, undefined, 1641234567890)).toBe(true);
      expect(shouldShowHandleTime(false, 30, 1641234567890)).toBe(true);
    });

    it('should handle undefined isIncomingTask parameter', () => {
      expect(shouldShowHandleTime(undefined, undefined, 1641234567890)).toBe(true);
      expect(shouldShowHandleTime(undefined, 30, 1641234567890)).toBe(true);
    });
  });

  describe('shouldShowTimeLeft', () => {
    it('should return true when incoming task and has RONA timeout', () => {
      expect(shouldShowTimeLeft(true, 30)).toBe(true);
      expect(shouldShowTimeLeft(true, 60)).toBe(true);
    });

    it('should return false when not incoming task', () => {
      expect(shouldShowTimeLeft(false, 30)).toBe(false);
      expect(shouldShowTimeLeft(false, 60)).toBe(false);
    });

    it('should return false when no RONA timeout', () => {
      expect(shouldShowTimeLeft(true, undefined)).toBe(false);
      expect(shouldShowTimeLeft(true, 0)).toBe(false);
    });

    it('should return false when neither incoming nor has timeout', () => {
      expect(shouldShowTimeLeft(false, undefined)).toBe(false);
      expect(shouldShowTimeLeft(false, 0)).toBe(false);
    });

    it('should handle undefined parameters', () => {
      expect(shouldShowTimeLeft(undefined, 30)).toBe(false);
      expect(shouldShowTimeLeft(true, undefined)).toBe(false);
      expect(shouldShowTimeLeft(undefined, undefined)).toBe(false);
    });
  });

  describe('getTaskListItemClasses', () => {
    it('should return base class when no selection or styles', () => {
      const result = getTaskListItemClasses();
      expect(result).toBe('task-list-item');
    });

    it('should add selected class when selected', () => {
      const result = getTaskListItemClasses(true);
      expect(result).toBe('task-list-item task-list-item--selected');
    });

    it('should not add selected class when not selected', () => {
      const result = getTaskListItemClasses(false);
      expect(result).toBe('task-list-item');
    });

    it('should add custom styles', () => {
      const result = getTaskListItemClasses(false, 'custom-class');
      expect(result).toBe('task-list-item  custom-class');
    });

    it('should combine selected and custom styles', () => {
      const result = getTaskListItemClasses(true, 'custom-class another-class');
      expect(result).toBe('task-list-item task-list-item--selected custom-class another-class');
    });

    it('should handle empty string styles', () => {
      const result = getTaskListItemClasses(true, '');
      expect(result).toBe('task-list-item task-list-item--selected');
    });

    it('should handle styles with extra whitespace', () => {
      const result = getTaskListItemClasses(false, '  extra-spaces  ');
      expect(result).toBe('task-list-item    extra-spaces');
    });
  });

  describe('extractTaskComponentData', () => {
    beforeEach(() => {
      mockGetMediaTypeInfo.mockReturnValue({
        labelName: 'Call',
        iconName: 'handset-filled',
        className: 'telephony-icon',
        isBrandVisual: false,
      });
    });

    it('should extract data for telephony task', () => {
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

      expect(mockGetMediaTypeInfo).toHaveBeenCalledWith(MEDIA_CHANNEL.TELEPHONY, MEDIA_CHANNEL.TELEPHONY);

      expect(result).toEqual({
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
        capitalizedQueue: 'Support team',
      });
    });

    it('should extract data for social media incoming task', () => {
      mockGetMediaTypeInfo.mockReturnValue({
        labelName: 'Social',
        iconName: 'facebook-circle-filled',
        className: 'social-icon',
        isBrandVisual: true,
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
          labelName: 'Social',
          iconName: 'facebook-circle-filled',
          className: 'social-icon',
          isBrandVisual: true,
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
    });

    it('should extract data for chat task', () => {
      mockGetMediaTypeInfo.mockReturnValue({
        labelName: 'Chat',
        iconName: 'chat-filled',
        className: 'chat-icon',
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
          className: 'chat-icon',
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
    });

    it('should handle default values', () => {
      const input = {};

      const result = extractTaskComponentData(input);

      expect(result.capitalizedState).toBe('');
      expect(result.capitalizedQueue).toBe('');
      expect(result.shouldShowState).toBe(false);
      expect(result.shouldShowQueue).toBe(false);
      expect(result.shouldShowHandleTime).toBe(false);
      expect(result.shouldShowTimeLeft).toBe(false);
    });

    it('should handle email task', () => {
      mockGetMediaTypeInfo.mockReturnValue({
        labelName: 'Email',
        iconName: 'email-filled',
        className: 'email-icon',
        isBrandVisual: false,
      });

      const input = {
        mediaType: MEDIA_CHANNEL.EMAIL,
        mediaChannel: MEDIA_CHANNEL.EMAIL,
        isIncomingTask: true,
        interactionId: 'email-123',
        state: 'new',
        queue: 'email support',
        ronaTimeout: undefined,
        startTimeStamp: 1641234567890,
      };

      const result = extractTaskComponentData(input);

      expect(result.isNonVoiceMedia).toBe(true);
      expect(result.titleClassName).toBe('incoming-digital-task-title');
      expect(result.shouldShowQueue).toBe(true);
      expect(result.shouldShowState).toBe(false);
      expect(result.shouldShowHandleTime).toBe(true);
      expect(result.shouldShowTimeLeft).toBe(false);
    });

    it('should handle task without startTimeStamp', () => {
      const input = {
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: false,
        interactionId: 'test-no-timestamp',
        state: 'active',
        startTimeStamp: undefined,
      };

      const result = extractTaskComponentData(input);

      expect(result.shouldShowHandleTime).toBe(false);
    });

    it('should handle incoming task with RONA timeout but no startTimeStamp', () => {
      const input = {
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: true,
        interactionId: 'test-rona-no-timestamp',
        state: 'new',
        ronaTimeout: 30,
        startTimeStamp: undefined,
      };

      const result = extractTaskComponentData(input);

      expect(result.shouldShowHandleTime).toBe(false);
      expect(result.shouldShowTimeLeft).toBe(true);
    });

    it('should handle edge case with whitespace in state and queue', () => {
      const input = {
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        mediaChannel: MEDIA_CHANNEL.TELEPHONY,
        isIncomingTask: false,
        state: '  active  ',
        queue: '  support team  ',
      };

      const result = extractTaskComponentData(input);

      expect(result.capitalizedState).toBe('Active  ');
      expect(result.capitalizedQueue).toBe('Support team  ');
    });
  });
});
