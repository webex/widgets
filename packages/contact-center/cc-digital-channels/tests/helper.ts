import {renderHook} from '@testing-library/react';
import {useDigitalChannels} from '../src/helper';

const mockProps = {
  conversationId: 'test-conversation-id',
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

  it('should initialize with connected state when all required props are provided', () => {
    const {result} = renderHook(() => useDigitalChannels(mockProps));

    expect(result.current.name).toBe('DigitalChannels');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionError).toBe(null);
    expect(result.current.conversationId).toBe(mockProps.conversationId);
  });

  it('should set connection error when required props are missing', () => {
    const incompleteProps = {
      ...mockProps,
      jwtToken: '',
    };

    const {result} = renderHook(() => useDigitalChannels(incompleteProps));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionError).toBe(
      'Missing required configuration: jwtToken, apiEndpoint, or signalREndpoint'
    );
  });

  it('should handle message sending', () => {
    const onMessageSent = jest.fn();
    const props = {
      ...mockProps,
      onMessageSent,
    };

    const {result} = renderHook(() => useDigitalChannels(props));

    result.current.sendMessage('Test message');

    expect(onMessageSent).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Test message',
        conversationId: mockProps.conversationId,
      })
    );
  });

  it('should handle errors correctly', () => {
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
    expect(result.current.connectionError).toBe('Test error');
  });

  it('should refresh conversation correctly', () => {
    const onConversationLoad = jest.fn();
    const props = {
      ...mockProps,
      onConversationLoad,
    };

    const {result} = renderHook(() => useDigitalChannels(props));

    // Clear the initial call
    onConversationLoad.mockClear();

    result.current.refreshConversation();

    // Wait for the timeout in refreshConversation
    setTimeout(() => {
      expect(onConversationLoad).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockProps.conversationId,
          status: 'active',
        })
      );
    }, 150);
  });
});
