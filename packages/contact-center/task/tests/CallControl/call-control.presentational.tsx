import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlPresentational from '../../src/CallControl/call-control.presentational';

jest.mock('@momentum-ui/react-collaboration', () => ({
  ButtonPill: () => <div data-testid="ButtonPill" />,
}));

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
  });
});
