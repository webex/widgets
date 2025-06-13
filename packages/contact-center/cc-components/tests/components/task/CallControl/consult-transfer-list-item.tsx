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

describe.skip('CallControlListItemPresentational', () => {
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
    expect(screen.getByTestId('AvatarNext')).toHaveTextContent('JD');
    expect(screen.getByTestId('Icon')).toHaveTextContent('test-icon');
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
    const button = screen.getByTestId('ButtonCircle');
    fireEvent.click(button);
    expect(mockOnButtonPress).toHaveBeenCalled();
  });
});
