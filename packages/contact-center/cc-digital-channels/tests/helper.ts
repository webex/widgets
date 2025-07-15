import {renderHook} from '@testing-library/react';
import '@testing-library/jest-dom';
import {useDigitalChannels} from '../src/helper';

// Mock the current task object
const mockCurrentTask = {
  data: {
    interaction: {
      callAssociatedDetails: {
        mediaResourceId: 'test-conversation-id',
      },
    },
  },
};

const mockProps = {
  currentTask: mockCurrentTask,
  jwtToken: 'test-jwt-token',
  apiEndpoint: 'https://test-api.example.com',
  signalREndpoint: 'https://test-signalr.example.com',
  logger: {
    log: jest.fn(),
    error: jest.fn(),
  },
};

describe('useDigitalChannels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct configuration when all required props are provided', () => {
    const {result} = renderHook(() => useDigitalChannels(mockProps));

    expect(result.current.name).toBe('DigitalChannels');
    expect(result.current.conversationId).toBe('test-conversation-id');
    expect(result.current.jwtToken).toBe('test-jwt-token');
    expect(result.current.apiEndpoint).toBe('https://test-api.example.com');
    expect(result.current.signalREndpoint).toBe('https://test-signalr.example.com');
    expect(typeof result.current.handleError).toBe('function');
  });

  it('should handle errors correctly with onError callback', () => {
    const onError = jest.fn().mockReturnValue(true);
    const props = {
      ...mockProps,
      onError,
    };

    const {result} = renderHook(() => useDigitalChannels(props));

    const testError = new Error('Test error');
    const handled = result.current.handleError(testError);

    expect(onError).toHaveBeenCalledWith(testError);
    expect(handled).toBe(true);
    expect(mockProps.logger.error).toHaveBeenCalledWith(
      'Digital channels error',
      'Test error',
      expect.objectContaining({
        module: 'widget-cc-digital-channels#helper.ts',
        method: 'handleError',
      })
    );
  });

  it('should handle errors correctly without onError callback', () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

    const {result} = renderHook(() => useDigitalChannels(mockProps));

    const testError = new Error('Test error');
    const handled = result.current.handleError(testError);

    expect(handled).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Webex Engage component error:', 'Test error');
    expect(mockProps.logger.error).toHaveBeenCalledWith(
      'Digital channels error',
      'Test error',
      expect.objectContaining({
        module: 'widget-cc-digital-channels#helper.ts',
        method: 'handleError',
      })
    );

    consoleSpy.mockRestore();
  });

  it('should handle unknown errors', () => {
    const {result} = renderHook(() => useDigitalChannels(mockProps));

    const handled = result.current.handleError('string error');

    expect(handled).toBe(false);
    expect(mockProps.logger.error).toHaveBeenCalledWith(
      'Digital channels error',
      'Unknown error',
      expect.objectContaining({
        module: 'widget-cc-digital-channels#helper.ts',
        method: 'handleError',
      })
    );
  });
});
