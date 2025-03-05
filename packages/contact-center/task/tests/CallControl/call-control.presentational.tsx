import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlPresentational from '../../src/CallControl/call-control.presentational';

jest.mock('@momentum-ui/react-collaboration', () => ({
  ButtonPill: () => <div data-testid="ButtonPill" />,
  TooltipNext: ({children}) => <div data-testid="TooltipNext">{children}</div>,
  PopoverNext: ({children}) => <div data-testid="PopoverNext">{children}</div>,
  SelectNext: ({children}) => <div data-testid="SelectNext">{children}</div>,
  Text: ({children}) => <div data-testid="Text">{children}</div>,
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
    currentTask: {
      data: {
        interaction: {
          mediaResourceId: '1',
          media: {
            '1': {isHold: false},
          },
          callProcessingDetails: {isPaused: false},
        },
      },
    },
    audioRef: React.createRef(),
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
    expect(screen.getByTestId('TooltipNext')).toBeInTheDocument();
    expect(screen.getByTestId('PopoverNext')).toBeInTheDocument();
    expect(screen.getByTestId('SelectNext')).toBeInTheDocument();
    expect(screen.getByTestId('Text')).toBeInTheDocument();
  });
});
