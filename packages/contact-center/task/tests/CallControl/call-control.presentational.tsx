import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlPresentational from '../../src/CallControl/call-control.presentational';

describe('CallControlPresentational', () => {
  const mockHoldResume = jest.fn();
  const mockPauseResumeRecording = jest.fn();
  const mockEndCall = jest.fn();
  const mockWrapupCall = jest.fn();
  const mockWrapupCodes = [
    {id: '1', name: 'Reason 1'},
    {id: '2', name: 'Reason 2'},
  ];

  const defaultProps = {
    currentTask: {},
    holdResume: mockHoldResume,
    pauseResumeRecording: mockPauseResumeRecording,
    endCall: mockEndCall,
    wrapupCall: mockWrapupCall,
    wrapupCodes: mockWrapupCodes,
    wrapupRequired: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with buttons and dropdown', () => {
    render(<CallControlPresentational {...defaultProps} />);

    expect(screen.getByText('Hold')).toBeInTheDocument();
    expect(screen.getByText('Resume Recording')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Wrap Up')).toBeInTheDocument();
  });

  it('calls holdResume with the correct argument when Hold/Resume button is clicked', () => {
    render(<CallControlPresentational {...defaultProps} />);

    const holdButton = screen.getByText('Hold');
    fireEvent.click(holdButton);

    expect(mockHoldResume).toHaveBeenCalledWith(true);

    fireEvent.click(holdButton);
    expect(mockHoldResume).toHaveBeenCalledWith(false);
  });

  it('calls pauseResumeRecording with the correct argument when Pause/Resume Recording button is clicked', () => {
    render(<CallControlPresentational {...defaultProps} />);

    const pauseButton = screen.getByText('Resume Recording');
    fireEvent.click(pauseButton);

    expect(mockPauseResumeRecording).toHaveBeenCalledWith(true);

    fireEvent.click(pauseButton);
    expect(mockPauseResumeRecording).toHaveBeenCalledWith(false);
  });

  it('calls endCall when End button is clicked', () => {
    render(<CallControlPresentational {...defaultProps} />);

    const endButton = screen.getByText('End');
    fireEvent.click(endButton);

    expect(mockEndCall).toHaveBeenCalled();
  });

  it('calls wrapupCall with the selected reason and ID when Wrap Up button is clicked', () => {
    const propsWithWrapupRequired = {...defaultProps, wrapupRequired: true};
    render(<CallControlPresentational {...propsWithWrapupRequired} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, {target: {value: '1'}});

    const wrapupButton = screen.getByText('Wrap Up');
    fireEvent.click(wrapupButton);

    expect(mockWrapupCall).toHaveBeenCalledWith('Reason 1', '1');
  });

  it('disables buttons and dropdown when wrapupRequired is false', () => {
    render(<CallControlPresentational {...defaultProps} />);

    const holdButton = screen.getByText('Hold');
    const pauseButton = screen.getByText('Resume Recording');
    const endButton = screen.getByText('End');
    const select = screen.getByRole('combobox');

    expect(holdButton).not.toBeDisabled();
    expect(pauseButton).not.toBeDisabled();
    expect(endButton).not.toBeDisabled();
    expect(select).toBeDisabled();
  });

  it('enables Wrap Up button when a reason is selected and wrapupRequired is true', () => {
    const propsWithWrapupRequired = {...defaultProps, wrapupRequired: true};
    render(<CallControlPresentational {...propsWithWrapupRequired} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, {target: {value: '1'}});

    const wrapupButton = screen.getByText('Wrap Up');
    expect(wrapupButton).not.toBeDisabled();
  });
});
