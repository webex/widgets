import {renderHook, waitFor} from '@testing-library/react';
import {initializeApp} from '@webex/cc-digital-interactions';

import {useDigitalChannelsInit} from '../src/helper';

// Mock the cc-digital-interactions module
jest.mock('@webex/cc-digital-interactions', () => ({
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
    skipInit: false,
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
});
