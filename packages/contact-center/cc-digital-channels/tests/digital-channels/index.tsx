import React from 'react';
import {render, screen} from '@testing-library/react';
import {DigitalChannels} from '../../src/digital-channels';

// Mock the Engage component
jest.mock('@webex-engage/wxengage-conversations', () => {
  return function MockEngage(props: any) {
    return (
      <div data-testid="mock-engage" {...props}>
        Mock Engage Component
      </div>
    );
  };
});

// Mock the store
jest.mock('@webex/cc-store', () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const mockProps = {
  conversationId: 'test-conversation-id',
  jwtToken: 'test-jwt-token',
  apiEndpoint: 'https://test-api.example.com',
  signalREndpoint: 'https://test-signalr.example.com',
};

describe('DigitalChannels Component', () => {
  it('should render the Engage component when connected', () => {
    render(<DigitalChannels {...mockProps} />);

    expect(screen.getByTestId('mock-engage')).toBeInTheDocument();
  });

  it('should render error message when jwtToken is missing', () => {
    const propsWithoutToken = {
      ...mockProps,
      jwtToken: '',
    };

    render(<DigitalChannels {...propsWithoutToken} />);

    expect(screen.getByText(/Error:/)).toBeInTheDocument();
    expect(screen.queryByTestId('mock-engage')).not.toBeInTheDocument();
  });

  it('should apply custom className and style', () => {
    const customClassName = 'custom-class';
    const customStyle = {backgroundColor: 'red'};

    render(<DigitalChannels {...mockProps} className={customClassName} style={customStyle} />);

    const container = screen.getByTestId('mock-engage').closest('div');
    expect(container).toHaveClass('digital-channels-container', customClassName);
    expect(container).toHaveStyle('background-color: red');
  });

  it('should handle connection errors gracefully', () => {
    const propsWithoutEndpoint = {
      ...mockProps,
      apiEndpoint: '',
    };

    render(<DigitalChannels {...propsWithoutEndpoint} />);

    expect(screen.getByText(/Error:/)).toBeInTheDocument();
    expect(screen.getByText(/Missing required configuration/)).toBeInTheDocument();
  });
});
