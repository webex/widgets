/* eslint-disable react/prop-types */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlListItemPresentational from '../../src/CallControl/CallControlCustomComponents/call-control-list-item.presentational';

jest.mock('@momentum-ui/react-collaboration', () => ({
  ListItemBase: (props) => (
    <div data-testid="ListItemBase" {...props}>
      {props.children}
    </div>
  ),
  ListItemBaseSection: (props) => (
    <div data-testid="ListItemBaseSection" {...props}>
      {props.children}
    </div>
  ),
  AvatarNext: (props) => <div data-testid="AvatarNext">{props.initials}</div>,
  Text: (props) => <p {...props}>{props.children}</p>,
  ButtonCircle: (props) => (
    <button data-testid="ButtonCircle" onClick={props.onPress}>
      {props.children}
    </button>
  ),
}));

jest.mock('@momentum-design/components/dist/react', () => ({
  Icon: (props) => <span data-testid="Icon">{props.name}</span>,
}));

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('CallControlListItemPresentational', () => {
  const mockOnButtonPress = jest.fn();
  const defaultProps = {
    title: 'John Doe',
    subtitle: 'Manager',
    buttonIcon: 'test-icon',
    onButtonPress: mockOnButtonPress,
    className: 'custom-class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with title, subtitle, and correct initials', () => {
    render(<CallControlListItemPresentational {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByTestId('AvatarNext')).toHaveTextContent('JD');
    expect(screen.getByTestId('Icon')).toHaveTextContent('test-icon');
  });

  it('renders without subtitle when not provided', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {subtitle, ...propsWithoutSubtitle} = defaultProps;
    render(<CallControlListItemPresentational {...propsWithoutSubtitle} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Manager')).not.toBeInTheDocument();
  });

  it('calls onButtonPress when button is clicked', () => {
    render(<CallControlListItemPresentational {...defaultProps} />);
    const button = screen.getByTestId('ButtonCircle');
    fireEvent.click(button);
    expect(mockOnButtonPress).toHaveBeenCalled();
  });
});
