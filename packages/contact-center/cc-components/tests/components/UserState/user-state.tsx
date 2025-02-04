import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserStateComponent from '../../../src/components/UserState/user-state';

describe('UserStateComponent', () => {
  const mockSetAgentStatus = jest.fn();
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
    currentTheme: 'LIGHT'
  };

  it('should render the component with correct elements', () => {
    render(<UserStateComponent {...defaultProps} />);
    expect(screen.getByTestId('user-state-title')).toHaveTextContent('Agent State');
    expect(screen.getByLabelText('Idle Codes')).toBeInTheDocument();
    expect(screen.getByText('01:01:01')).toBeInTheDocument();
  });

  it('should render only non-system idle codes in the dropdown', () => {
    render(<UserStateComponent {...defaultProps} />);
    fireEvent.mouseDown(screen.getByLabelText('Idle Codes')); // Open the dropdown
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Idle Code 1');
    expect(options[1]).toHaveTextContent('Idle Code 3');
  });

  it('should call setAgentStatus with correct code when an idle code is selected', () => {
    render(<UserStateComponent {...defaultProps} />);
    fireEvent.mouseDown(screen.getByLabelText('Idle Codes')); // Open the dropdown
    fireEvent.click(screen.getByText('Idle Code 3')); // Select the option
    expect(mockSetAgentStatus).toHaveBeenCalledWith({ id: '3', name: 'Idle Code 3', isSystem: false });
  });

  it('should display an error message if provided', () => {
    render(<UserStateComponent {...defaultProps} errorMessage="Error message" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toHaveStyle('color: red');
  });

  it('should disable the select box when isSettingAgentStatus is true', () => {
    render(<UserStateComponent {...{ ...defaultProps, isSettingAgentStatus: true }} />);
    const selectElement = screen.getByLabelText('Idle Codes');
    expect(selectElement).toHaveAttribute('aria-disabled', 'true');
  });

  it('should render elapsed time in correct color based on isSettingAgentStatus', () => {
    const { rerender } = render(<UserStateComponent {...defaultProps} />);
    expect(screen.getByText('01:01:01')).toHaveClass('elapsedTime');

    rerender(<UserStateComponent {...{ ...defaultProps, isSettingAgentStatus: true }} />);
    expect(screen.getByText('01:01:01')).toHaveClass('elapsedTime elapsedTime-disabled');
  });
});