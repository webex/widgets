import {renderHook} from '@testing-library/react';
import '@testing-library/jest-dom';
import {useDigitalChannels} from '../src/helper';
import {mockTask, mockCC} from '@webex/test-fixtures';

// Use fixtures for mock objects
const mockCurrentTask = {
  ...mockTask,
  data: {
    ...mockTask.data,
    interaction: {
      ...mockTask.data.interaction,
      callAssociatedDetails: {
        mediaResourceId: 'test-conversation-id',
      },
    },
  },
};

const mockProps = {
  currentTask: mockCurrentTask,
  jwtToken: 'test-jwt-token',
  dataCenter: 'https://test-api.example.com',
  logger: mockCC.LoggerProxy,
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
    expect(result.current.dataCenter).toBe('https://test-api.example.com');
    expect(typeof result.current.handleError).toBe('function');
  });

  it('should call onError when provided and return its result', () => {
    const mockOnError = jest.fn().mockReturnValue(true);
    const props = {
      ...mockProps,
      onError: mockOnError,
    };

    const {result} = renderHook(() => useDigitalChannels(props));
    const testError = new Error('Test error');

    const handleErrorResult = result.current.handleError(testError);

    expect(mockOnError).toHaveBeenCalledWith(testError);
    expect(handleErrorResult).toBe(true);
  });

  it('should handle error without onError callback', () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

    const {result} = renderHook(() => useDigitalChannels(mockProps));
    const testError = new Error('Test error');

    const handleErrorResult = result.current.handleError(testError);

    expect(mockProps.logger.error).toHaveBeenCalledWith('Digital channels error', 'Test error', {
      module: 'widget-cc-digital-channels#helper.ts',
      method: 'handleError',
    });
    expect(consoleSpy).toHaveBeenCalledWith('Webex Engage component error:', 'Test error');
    expect(handleErrorResult).toBe(false);

    consoleSpy.mockRestore();
  });

  it('should handle unknown error types', () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

    const {result} = renderHook(() => useDigitalChannels(mockProps));
    const unknownError = 'String error';

    const handleErrorResult = result.current.handleError(unknownError);

    expect(mockProps.logger.error).toHaveBeenCalledWith('Digital channels error', 'Unknown error', {
      module: 'widget-cc-digital-channels#helper.ts',
      method: 'handleError',
    });
    expect(consoleSpy).toHaveBeenCalledWith('Webex Engage component error:', 'Unknown error');
    expect(handleErrorResult).toBe(false);

    consoleSpy.mockRestore();
  });
});
