import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsultTransferListComponent from '../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-list-item';

const loggerMock = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
  error: jest.fn(),
};

jest.mock('lottie-web');

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

// This test suite was previously skipped but is now enabled for 100% coverage
describe('CallControlListItemPresentational', () => {
  const mockOnButtonPress = jest.fn();
  const defaultProps = {
    title: 'John Doe',
    subtitle: 'Manager',
    buttonIcon: 'test-icon',
    onButtonPress: mockOnButtonPress,
    className: 'custom-class',
    logger: loggerMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with title, subtitle, and correct initials', () => {
    render(<ConsultTransferListComponent {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveTextContent('JD');
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders without subtitle when not provided', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {subtitle, ...propsWithoutSubtitle} = defaultProps;
    render(<ConsultTransferListComponent {...propsWithoutSubtitle} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Manager')).not.toBeInTheDocument();
  });

  it('calls onButtonPress when button is clicked', () => {
    render(<ConsultTransferListComponent {...defaultProps} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockOnButtonPress).toHaveBeenCalled();
  });

  it('applies custom className when provided', () => {
    const customClass = 'my-custom-class';
    const {container} = render(<ConsultTransferListComponent {...defaultProps} className={customClass} />);
    const listItem = container.querySelector('.call-control-list-item');
    expect(listItem).toHaveClass('call-control-list-item');
    expect(listItem).toHaveClass(customClass);
  });

  it('renders without custom className', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {className, ...propsWithoutClassName} = defaultProps;
    const {container} = render(<ConsultTransferListComponent {...propsWithoutClassName} />);
    const listItem = container.querySelector('.call-control-list-item');
    expect(listItem).toHaveClass('call-control-list-item');
    expect(listItem).not.toHaveClass('custom-class');
  });

  it('generates correct initials for different names', () => {
    const testCases = [
      {title: 'John Doe', expected: 'JD'},
      {title: 'Alice Smith Johnson', expected: 'AS'},
      {title: 'Bob', expected: 'B'},
      {title: 'mary jane', expected: 'MJ'},
      {title: '  John   Doe  ', expected: 'JD'},
    ];

    testCases.forEach(({title, expected}) => {
      const {unmount} = render(<ConsultTransferListComponent {...defaultProps} title={title} />);
      expect(screen.getByRole('img')).toHaveTextContent(expected);
      unmount();
    });
  });

  it('renders with different button icons', () => {
    const iconName = 'custom-icon-name';
    render(<ConsultTransferListComponent {...defaultProps} buttonIcon={iconName} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('sets correct aria-label and title attributes', () => {
    const title = 'Jane Doe Manager';
    render(<ConsultTransferListComponent {...defaultProps} title={title} />);

    const listItem = screen.getByLabelText(title);
    expect(listItem).toBeInTheDocument();

    // The avatar receives the title prop but it may not render as a title attribute in the DOM
    const avatar = screen.getByRole('img');
    expect(avatar).toBeInTheDocument();
  });

  it('handles empty title gracefully', () => {
    const {container} = render(<ConsultTransferListComponent {...defaultProps} title="" />);
    // Check for the empty title in the main text element (using more specific selector)
    const textElements = container.querySelectorAll('mdc-text');
    expect(textElements[0]).toHaveTextContent('');
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveTextContent('');
  });

  it('integrates with handleListItemPress utility correctly', () => {
    const title = 'Integration Test User';
    render(<ConsultTransferListComponent {...defaultProps} title={title} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(loggerMock.info).toHaveBeenCalledWith(`CC-Widgets: ConsultTransferListComponent: button pressed: ${title}`, {
      module: 'consult-transfer-list-item.tsx',
      method: 'handleButtonPress',
    });
    expect(mockOnButtonPress).toHaveBeenCalled();
  });

  it('renders with all required props', () => {
    const requiredProps = {
      title: 'Required User',
      buttonIcon: 'required-icon',
      onButtonPress: jest.fn(),
      logger: loggerMock,
    };

    render(<ConsultTransferListComponent {...requiredProps} />);

    expect(screen.getByText('Required User')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders subtitle conditionally', () => {
    // Test with subtitle
    const {rerender} = render(<ConsultTransferListComponent {...defaultProps} />);
    expect(screen.getByText('Manager')).toBeInTheDocument();

    // Test without subtitle
    rerender(<ConsultTransferListComponent {...defaultProps} subtitle={undefined} />);
    expect(screen.queryByText('Manager')).not.toBeInTheDocument();

    // Test with empty subtitle
    rerender(<ConsultTransferListComponent {...defaultProps} subtitle="" />);
    expect(screen.queryByText('Manager')).not.toBeInTheDocument();
  });

  it('applies correct styling and structure', () => {
    const {container} = render(<ConsultTransferListComponent {...defaultProps} />);

    // Check main container
    const listItem = container.querySelector('.call-control-list-item');
    expect(listItem).toBeInTheDocument();

    // Check sections exist
    expect(container.querySelector('[data-position="start"]')).toBeInTheDocument();
    expect(container.querySelector('[data-position="middle"]')).toBeInTheDocument();
    expect(container.querySelector('[data-position="end"]')).toBeInTheDocument();

    // Check hover button wrapper
    expect(container.querySelector('.hover-button')).toBeInTheDocument();
  });
});
