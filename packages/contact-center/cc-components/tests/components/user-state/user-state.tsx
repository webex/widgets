import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserStatePresentational from '../../../src/components/user-state/user-state';

describe('UserStatePresentational Component', () => {
  const mockSetAgentStatus = jest.fn();
  const mockSetCurrentState = jest.fn();
  const defaultProps = {
    idleCodes: [
      { id: '1', name: 'Idle Code 1', isSystem: false },
      { id: '2', name: 'Idle Code 2', isSystem: true },
      { id: '3', name: 'Idle Code 3', isSystem: false }
    ],
    setAgentStatus: mockSetAgentStatus,
    isSettingAgentStatus: false,
    errorMessage: '',
    elapsedTime: 3661, // 1 hour, 1 minute, 1 second
    currentState: { id: '1' },
    setCurrentState: mockSetCurrentState
  };

  it('should render the component with correct elements', () => {
    render(<UserStatePresentational {...defaultProps} />);
    expect(screen.getByTestId('user-state-title')).toHaveTextContent('Agent State');
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('01:01:01')).toBeInTheDocument();
  });

  it('should render only non-system idle codes in the dropdown', () => {
    render(<UserStatePresentational {...defaultProps} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Idle Code 1');
    expect(options[1]).toHaveTextContent('Idle Code 3');
  });

  it('should call setAgentStatus with correct code when an idle code is selected', () => {
    render(<UserStatePresentational {...defaultProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '3' } });
    expect(mockSetAgentStatus).toHaveBeenCalledWith({ id: '3', name: 'Idle Code 3', isSystem: false });
  });

  it('should display an error message if provided', () => {
    render(<UserStatePresentational {...defaultProps} errorMessage="Error message" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toHaveStyle('color: red');
  });

  it('should disable the select box when isSettingAgentStatus is true', () => {
    render(<UserStatePresentational {...{ ...defaultProps, isSettingAgentStatus: true }} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('should render elapsed time in correct color based on isSettingAgentStatus', () => {
    const { rerender } = render(<UserStatePresentational {...defaultProps} />);
    expect(screen.getByText('01:01:01')).toHaveClass('elapsedTime');

    rerender(<UserStatePresentational {...{ ...defaultProps, isSettingAgentStatus: true }} />);
    expect(screen.getByText('01:01:01')).toHaveClass('elapsedTime elapsedTime-disabled');
  });
});
