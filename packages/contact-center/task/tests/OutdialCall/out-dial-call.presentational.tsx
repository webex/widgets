import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OutDialCallPresentational from '../../src/OutdialCall/out-dial-call.presentational';

describe('OutDialCallPresentational', () => {
  const mockStartOutdial = jest.fn();
  const mockCc = {
    agentConfig: {
      outDialEp: 'test-entry-point'
    }
  };

  const defaultProps = {
    startOutdial: mockStartOutdial,
    cc: mockCc
  };

  beforeEach(() => {
    mockStartOutdial.mockClear();
  });

  it('renders the component correctly', () => {
    render(<OutDialCallPresentational {...defaultProps} />);
    expect(screen.getByPlaceholderText('Enter number to dial')).toBeInTheDocument();
    expect(screen.getByText('Outdial Call')).toBeInTheDocument();
  });

  it('updates input value when typing directly', () => {
    render(<OutDialCallPresentational {...defaultProps} />);
    const input = screen.getByPlaceholderText('Enter number to dial');
    fireEvent.change(input, { target: { value: '123' } });
    expect(input).toHaveValue('123');
  });

  it('updates input value when clicking keypad buttons', () => {
    render(<OutDialCallPresentational {...defaultProps} />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('3'));
    expect(screen.getByPlaceholderText('Enter number to dial')).toHaveValue('123');
  });

  it('calls startOutdial with correct payload when clicking call button', () => {
    render(<OutDialCallPresentational {...defaultProps} />);
    const input = screen.getByPlaceholderText('Enter number to dial');
    fireEvent.change(input, { target: { value: '123' } });
    
    const callButton = screen.getByRole('button');
    fireEvent.click(callButton);

    expect(mockStartOutdial).toHaveBeenCalledWith({
      entryPointId: 'test-entry-point',
      destination: '123',
      direction: 'OUTBOUND',
      attributes: {},
      mediaType: 'telephony',
      outboundType: 'OUTDIAL'
    });
  });

  it('allows special characters (* # +) from keypad', () => {
    render(<OutDialCallPresentational {...defaultProps} />);
    fireEvent.click(screen.getByText('*'));
    fireEvent.click(screen.getByText('#'));
    expect(screen.getByPlaceholderText('Enter number to dial')).toHaveValue('*#');
  });
});