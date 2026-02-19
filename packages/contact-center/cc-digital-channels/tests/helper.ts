import {renderHook, waitFor} from '@testing-library/react';
import {initializeApp} from 'cc-digital-interactions';

import {useDigitalChannelsData, useDigitalChannelsInit} from '../src/helper';

// Mock the cc-digital-interactions module
jest.mock('cc-digital-interactions', () => ({
  initializeApp: jest.fn().mockResolvedValue(undefined),
}));

describe('useDigitalChannelsInit', () => {
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockSetDigitalChannelsInitialized = jest.fn();

  const defaultProps = {
    currentTask: {
      data: {
        interaction: {
          callAssociatedDetails: {
            mediaResourceId: 'test-conversation-id',
          },
        },
      },
    },
    jwtToken: 'test-jwt-token',
    dataCenter: 'test-datacenter',
    logger: mockLogger,
    isDigitalChannelsInitialized: false,
    setDigitalChannelsInitialized: mockSetDigitalChannelsInitialized,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize app when not already initialized', async () => {
    const {result} = renderHook(() => useDigitalChannelsInit(defaultProps));

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    expect(initializeApp).toHaveBeenCalledWith('test-datacenter', 'test-jwt-token');
    expect(mockSetDigitalChannelsInitialized).toHaveBeenCalledWith(true);
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Starting Digital Channels initialization'),
      expect.any(Object)
    );
  });

  it('should skip initialization when already initialized', async () => {
    const props = {
      ...defaultProps,
      isDigitalChannelsInitialized: true,
    };

    const {result} = renderHook(() => useDigitalChannelsInit(props));

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    expect(initializeApp).not.toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('App already initialized'), expect.any(Object));
  });

  it('should skip initialization when skipInit is true', async () => {
    const props = {
      ...defaultProps,
      skipInit: true,
    };

    const {result} = renderHook(() => useDigitalChannelsInit(props));

    // When skipInit is true, initialized should remain false
    expect(result.current.initialized).toBe(false);
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('should handle initialization error', async () => {
    const mockError = new Error('Initialization failed');
    (initializeApp as jest.Mock).mockRejectedValueOnce(mockError);

    renderHook(() => useDigitalChannelsInit(defaultProps));

    await waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize Digital Channels app'),
        expect.any(Object)
      );
    });
  });

  it('should log unknown error message when initialization throws non-Error', async () => {
    (initializeApp as jest.Mock).mockRejectedValueOnce('failure');

    renderHook(() => useDigitalChannelsInit(defaultProps));

    await waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), expect.any(Object));
    });
  });
});

describe('useDigitalChannelsData', () => {
  const mockLogger = {
    error: jest.fn(),
  };

  const defaultTask = {
    data: {
      interaction: {
        callAssociatedDetails: {
          mediaResourceId: 'test-conversation-id',
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch access token and extract conversationId', async () => {
    const getAccessToken = jest.fn().mockResolvedValue('jwt-token');

    const {result} = renderHook(() =>
      useDigitalChannelsData({
        getAccessToken,
        currentTask: defaultTask,
        logger: mockLogger,
      })
    );

    await waitFor(() => {
      expect(result.current.jwtToken).toBe('jwt-token');
    });

    expect(result.current.conversationId).toBe('test-conversation-id');
    expect(result.current.tokenError).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should return empty conversationId when currentTask is missing', async () => {
    const getAccessToken = jest.fn().mockResolvedValue('jwt-token');

    const {result} = renderHook(() =>
      useDigitalChannelsData({
        getAccessToken,
        currentTask: null,
        logger: mockLogger,
      })
    );

    await waitFor(() => {
      expect(result.current.jwtToken).toBe('jwt-token');
    });
    expect(result.current.conversationId).toBe('');
  });

  it('should return empty conversationId when mediaResourceId is missing', async () => {
    const getAccessToken = jest.fn().mockResolvedValue('jwt-token');
    const taskWithoutMediaId = {
      data: {
        interaction: {
          callAssociatedDetails: {},
        },
      },
    };

    const {result} = renderHook(() =>
      useDigitalChannelsData({
        getAccessToken,
        currentTask: taskWithoutMediaId,
        logger: mockLogger,
      })
    );

    await waitFor(() => {
      expect(result.current.jwtToken).toBe('jwt-token');
    });
    expect(result.current.conversationId).toBe('');
  });

  it('should handle token fetch error and set error flags', async () => {
    const getAccessToken = jest.fn().mockRejectedValue(new Error('token error'));

    const {result} = renderHook(() =>
      useDigitalChannelsData({
        getAccessToken,
        currentTask: defaultTask,
        logger: mockLogger,
      })
    );

    await waitFor(() => {
      expect(result.current.tokenError).toBe(true);
    });

    expect(result.current.hasError).toBe(true);
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[DIGITAL_CHANNELS] ❌ Failed to get access token',
      expect.any(Object)
    );
  });

  it('should handle token fetch error gracefully when logger is undefined', async () => {
    const getAccessToken = jest.fn().mockRejectedValue(new Error('token error'));

    const {result} = renderHook(() =>
      useDigitalChannelsData({
        getAccessToken,
        currentTask: defaultTask,
      })
    );

    await waitFor(() => {
      expect(result.current.tokenError).toBe(true);
    });
  });
});
