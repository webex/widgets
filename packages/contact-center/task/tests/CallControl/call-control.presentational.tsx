import React from 'react';
import {queryByTestId, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlPresentational from '../../src/CallControl/call-control.presentational';

jest.mock('@momentum-ui/react-collaboration', () => ({
  ButtonPill: () => <div data-testid="ButtonPill" />,
  ListItemBase: () => <div data-testid="ListItemBase" />,
  ListItemBaseSection: () => <div data-testid="ListItemBaseSection" />,
  Text: () => <div data-testid="Text" />,
  ButtonCircle: () => <div data-testid="ButtonCircle" />,
  PopoverNext: () => <div data-testid="PopoverNext" />,
  SelectNext: () => <div data-testid="SelectNext" />,
  TooltipNext: () => <div data-testid="TooltipNext" />,
}));

jest.mock('@momentum-design/components/dist/react', () => ({
  Avatar: () => <div data-testid="Avatar" />,
  Icon: () => <div data-testid="Icon" />,
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
    expect(screen.getByTestId('call-control-container')).toBeInTheDocument();
  });
});
