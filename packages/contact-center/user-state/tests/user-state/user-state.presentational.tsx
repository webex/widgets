import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserStatePresentational from '../../src/user-state/user-state.presentational';

describe('UserStatePresentational Component', () => {
  const mockSetAgentStatus = jest.fn();
  const mockIdleCodes = [
    { id: '1', name: 'Available', isSystem: false, isDefault: true },
    { id: '2', name: 'On Break', isSystem: false, isDefault: false },
  ];

  it('renders without crashing', () => {
    render(<UserStatePresentational idleCodes={mockIdleCodes} setAgentStatus={mockSetAgentStatus} isSettingAgentStatus={false} errorMessage="" elapsedTime={3600} />);
    expect(screen.getByText('Agent State')).toBeInTheDocument();
  });

  it('displays the correct default option', () => {
    render(<UserStatePresentational idleCodes={mockIdleCodes} setAgentStatus={mockSetAgentStatus} isSettingAgentStatus={false} errorMessage="" elapsedTime={3600} />);
    const selectElement = screen.getByRole('combobox');
    expect(selectElement.value).toBe('1');
  });

  it('calls setAgentStatus with the correct parameters', () => {
    render(<UserStatePresentational idleCodes={mockIdleCodes} setAgentStatus={mockSetAgentStatus} isSettingAgentStatus={false} errorMessage="" elapsedTime={3600} />);
    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: '2' } });
    expect(mockSetAgentStatus).toHaveBeenCalledWith({ auxCodeId: '2', state: 'On Break' });
  });

  it('displays an error message when provided', () => {
    render(<UserStatePresentational idleCodes={mockIdleCodes} setAgentStatus={mockSetAgentStatus} isSettingAgentStatus={false} errorMessage="Error occurred" elapsedTime={3600} />);
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });

  it('formats elapsed time correctly', () => {
    render(<UserStatePresentational idleCodes={mockIdleCodes} setAgentStatus={mockSetAgentStatus} isSettingAgentStatus={false} errorMessage="" elapsedTime={3661} />);
    expect(screen.getByText('01:01:01')).toBeInTheDocument();
  });
});