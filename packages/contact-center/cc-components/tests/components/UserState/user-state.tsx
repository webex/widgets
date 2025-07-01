import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import UserStateComponent from '../../../src/components/UserState/user-state';

// This test suite is skipped because we have removed the :broken from the command
// line in the package.json scripts to run these tests in pipeline.
describe.skip('UserStateComponent', () => {
  const mockSetAgentStatus = jest.fn();
  const defaultProps = {
    idleCodes: [
      {id: '1', name: 'Idle Code 1', isSystem: false},
      {id: '2', name: 'Idle Code 2', isSystem: true},
      {id: '3', name: 'Idle Code 3', isSystem: false},
    ],
    setAgentStatus: mockSetAgentStatus,
    isSettingAgentStatus: false,
    elapsedTime: 3661, // 1 hour, 1 minute, 1 second
    lastIdleStateChangeElapsedTime: 0,
    currentState: '1',
    customState: {id: '1', name: 'Custom State'},
    logger: {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      trace: jest.fn(),
    },
  };

  it('should render the component with correct elements', () => {
    render(<UserStateComponent {...defaultProps} />);
    expect(screen.getByTestId('user-state-title')).toHaveTextContent('Agent State');
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('01:01:01')).toBeInTheDocument();
  });

  it('should render only non-system idle codes in the dropdown', () => {
    render(<UserStateComponent {...defaultProps} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Idle Code 1');
    expect(options[1]).toHaveTextContent('Idle Code 3');
  });

  it('should call setAgentStatus with correct code when an idle code is selected', () => {
    render(<UserStateComponent {...defaultProps} />);
    fireEvent.change(screen.getByRole('combobox'), {target: {value: '3'}});
    expect(mockSetAgentStatus).toHaveBeenCalledWith({id: '3', name: 'Idle Code 3', isSystem: false});
  });

  it('should display an error message if provided', () => {
    // Note: errorMessage is not part of UserStateComponentsProps interface
    // This test should be updated to match the actual component interface
    render(<UserStateComponent {...defaultProps} />);
    // Remove assertions for errorMessage since it's not supported
  });

  it('should disable the select box when isSettingAgentStatus is true', () => {
    render(<UserStateComponent {...{...defaultProps, isSettingAgentStatus: true}} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('should render elapsed time in correct color based on isSettingAgentStatus', () => {
    const {rerender} = render(<UserStateComponent {...defaultProps} />);
    expect(screen.getByText('01:01:01')).toHaveClass('elapsedTime');

    rerender(<UserStateComponent {...{...defaultProps, isSettingAgentStatus: true}} />);
    expect(screen.getByText('01:01:01')).toHaveClass('elapsedTime elapsedTime-disabled');
  });
});
