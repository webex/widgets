import React from 'react';
import {render, fireEvent, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import OutdialCallComponent from '@webex/cc-components/src/components/OutdialCall/out-dial-call';

describe('OutdialCallComponent', () => {
  const mockStartOutdial = jest.fn();

  const props = {
    startOutdial: mockStartOutdial,
  };

  beforeEach(() => {
    mockStartOutdial.mockClear();
  });

  it('renders the component correctly', () => {
    render(<OutdialCallComponent {...props} />);
    expect(screen.getByPlaceholderText('Enter number to dial')).toBeInTheDocument();
    expect(screen.getByText('Outdial Call')).toBeInTheDocument();
  });

  it('updates input value when typing directly', () => {
    render(<OutdialCallComponent {...props} />);
    const input = screen.getByPlaceholderText('Enter number to dial');
    fireEvent.change(input, {target: {value: '123'}});
    expect(input).toHaveValue('123');
  });

  it('updates input value when clicking keypad buttons', () => {
    render(<OutdialCallComponent {...props} />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('3'));
    expect(screen.getByPlaceholderText('Enter number to dial')).toHaveValue('123');
  });

  it('calls startOutdial with correct payload when clicking call button', () => {
    render(<OutdialCallComponent {...props} />);
    const input = screen.getByPlaceholderText('Enter number to dial');
    fireEvent.change(input, {target: {value: '123'}});

    const callButton = screen.getByRole('button');
    fireEvent.click(callButton);

    expect(mockStartOutdial).toHaveBeenCalledWith({
      entryPointId: 'test-entry-point',
      destination: '123',
      direction: 'OUTBOUND',
      attributes: {},
      mediaType: 'telephony',
      outboundType: 'OUTDIAL',
    });
  });

  it('allows special characters (* # +) from keypad', () => {
    render(<OutdialCallComponent {...props} />);
    fireEvent.click(screen.getByText('*'));
    fireEvent.click(screen.getByText('#'));
    expect(screen.getByPlaceholderText('Enter number to dial')).toHaveValue('*#');
  });

  it('does not allow invalid characters', () => {
    render(<OutdialCallComponent {...props} />);
    const input = screen.getByPlaceholderText('Enter number to dial');
    fireEvent.change(input, {target: {value: 'abc'}});
    expect(input).toHaveValue('');
  });

  it('does not allow invalid characters when typing', () => {
    render(<OutdialCallComponent {...props} />);
    const input = screen.getByPlaceholderText('Enter number to dial');
    fireEvent.change(input, {target: {value: '123abc'}});
    expect(input).toHaveValue('123');
  });

  it('does not allow empty input', () => {
    render(<OutdialCallComponent {...props} />);
    const callButton = screen.getByRole('button');
    fireEvent.click(callButton);
    expect(mockStartOutdial).not.toHaveBeenCalled();
  });

  it('should remove whitespace and only keep numbers', () => {
    render(<OutdialCallComponent {...props} />);
    const input = screen.getByPlaceholderText('Enter number to dial');
    fireEvent.change(input, {target: {value: '  1 2 3 4  '}});
    expect(input).toHaveValue('1234');
  });
});
