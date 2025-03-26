/* eslint-disable react/prop-types */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlPresentational from '../../src/CallControl/call-control.presentational';

jest.mock('@webex/cc-store', () => ({
  DestinationType: {
    AGENT: 'agent',
    QUEUE: 'queue',
  },
}));

jest.mock('@momentum-ui/react-collaboration', () => ({
  ButtonPill: (props) => (
    <button data-testid="ButtonPill" onClick={props.onPress} className={props.className}>
      {props.children}
    </button>
  ),
  ButtonCircle: (props) => (
    <button data-testid="ButtonCircle" onClick={props.onPress} disabled={props.disabled} className={props.className}>
      {props.children}
    </button>
  ),
  PopoverNext: (props) => (
    <div data-testid="PopoverNext">
      {props.triggerComponent}
      {props.children}
    </div>
  ),
  SelectNext: (props) => (
    <div data-testid="SelectNext">{props.children && props.items && props.children(props.items[0])}</div>
  ),
  TooltipNext: (props) => (
    <div data-testid="TooltipNext">
      {props.triggerComponent}
      {props.children}
    </div>
  ),
}));

jest.mock('@momentum-design/components/dist/react', () => ({
  Icon: (props) => (
    <span data-testid="Icon" className={props.className}>
      {props.name}
    </span>
  ),
}));

jest.mock('../../src/CallControl/CallControlCustomComponents/call-control-popover.presentational', () => {
  const MockPopover = (props) => (
    <div data-testid="CallControlPopover">
      <button data-testid="AgentSelectButton" onClick={() => props.onAgentSelect('agent1')}>
        Select Agent
      </button>
    </div>
  );
  MockPopover.displayName = 'CallControlPopoverPresentational';
  return MockPopover;
});

describe('CallControlPresentational', () => {
  const mockToggleHold = jest.fn();
  const mockToggleRecording = jest.fn();
  const mockEndCall = jest.fn();
  const mockWrapupCall = jest.fn();
  const mockWrapupCodes = [
    {id: '1', name: 'Reason 1'},
    {id: '2', name: 'Reason 2'},
  ];
  const mockLoadBuddyAgents = jest.fn();
  const mockConsultCall = jest.fn();
  const mockTransferCall = jest.fn();
  const setIsHeld = jest.fn();

  const baseProps = {
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
    setIsHeld: setIsHeld,
    buddyAgents: [],
    loadBuddyAgents: mockLoadBuddyAgents,
    transferCall: mockTransferCall,
    consultCall: mockConsultCall,
    setIsRecording: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with call control container', () => {
    render(<CallControlPresentational {...baseProps} />);
    expect(screen.getByTestId('call-control-container')).toBeInTheDocument();
  });

  it('renders the correct hold button icon based on currentTask (not on hold)', () => {
    render(<CallControlPresentational {...baseProps} />);
    const holdButton = screen.getAllByTestId('ButtonCircle')[0];
    expect(holdButton).toHaveTextContent('pause-bold');
  });

  it('calls toggleHold with correct value when hold button is clicked', () => {
    render(<CallControlPresentational {...baseProps} />);
    const buttons = screen.getAllByTestId('ButtonCircle');
    fireEvent.click(buttons[0]);
    expect(mockToggleHold).toHaveBeenCalledWith(true);
  });

  it('calls endCall when end call button is clicked', () => {
    render(<CallControlPresentational {...baseProps} />);
    const buttons = screen.getAllByTestId('ButtonCircle');
    fireEvent.click(buttons[4]);
    expect(mockEndCall).toHaveBeenCalled();
  });

  it('calls consultCall when a consult agent is selected', () => {
    render(<CallControlPresentational {...baseProps} />);
    const buttons = screen.getAllByTestId('ButtonCircle');
    fireEvent.click(buttons[1]);
    const agentSelectButton = screen.getByTestId('AgentSelectButton');
    fireEvent.click(agentSelectButton);
    expect(mockConsultCall).toHaveBeenCalled();
    expect(mockTransferCall).not.toHaveBeenCalled();
  });

  it('calls transferCall when a transfer agent is selected', () => {
    render(<CallControlPresentational {...baseProps} />);
    const buttons = screen.getAllByTestId('ButtonCircle');
    fireEvent.click(buttons[2]);
    const agentSelectButton = screen.getByTestId('AgentSelectButton');
    fireEvent.click(agentSelectButton);
    expect(mockTransferCall).toHaveBeenCalledWith('agent1', 'agent');
    expect(mockConsultCall).not.toHaveBeenCalled();
  });
});
