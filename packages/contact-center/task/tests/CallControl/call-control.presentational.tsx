import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlPresentational from '../../src/CallControl/call-control.presentational';

describe('CallControlPresentational', () => {
  const mockToggleHold = jest.fn();
  const mockToggleRecording = jest.fn();
  const mockEndCall = jest.fn();
  const mockWrapupCall = jest.fn();
  const mockWrapupCodes = [
    {id: '1', name: 'Reason 1'},
    {id: '2', name: 'Reason 2'},
  ];

  const defaultProps = {
    currentTask: {},
    toggleHold: mockToggleHold,
    toggleRecording: mockToggleRecording,
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
    expect(screen.getByText('Pause Recording')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Wrap Up')).toBeInTheDocument();
  });

  it('calls toggleHold with the correct argument when Hold/Pause button is clicked', () => {
    render(<CallControlPresentational {...defaultProps} />);

    const holdButton = screen.getByText('Hold');
    fireEvent.click(holdButton);

    expect(mockToggleHold).toHaveBeenCalledWith(true);

    fireEvent.click(holdButton);
    expect(mockToggleHold).toHaveBeenCalledWith(false);
  });

  it('calls toggleRecording with the correct argument when Pause/Pause Recording button is clicked', () => {
    render(<CallControlPresentational {...defaultProps} />);

    const pauseButton = screen.getByText('Pause Recording');
    fireEvent.click(pauseButton);

    expect(mockToggleRecording).toHaveBeenCalledWith(true);

    fireEvent.click(pauseButton);
    expect(mockToggleRecording).toHaveBeenCalledWith(false);
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
    const pauseButton = screen.getByText('Pause Recording');
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
