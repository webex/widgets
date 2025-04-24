/* eslint-disable react/prop-types */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlComponent from '../../../../src/components/task/CallControl/call-control';

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
  Avatar: () => <div data-testid="Avatar" />,
  Icon: () => <div data-testid="Icon" />,
}));

jest.mock('@webex/cc-store', () => ({
  DestinationType: {
    AGENT: 'agent',
    QUEUE: 'queue',
  },
}));

jest.mock('../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-popover', () => {
  const MockPopover = (props) => (
    <div data-testid="ConsultTransferPopover">
      <button data-testid="AgentSelectButton" onClick={() => props.onAgentSelect('agent1')}>
        Select Agent
      </button>
    </div>
  );
  MockPopover.displayName = 'ConsultTransferPopoverPresentational';
  return MockPopover;
});

jest.mock('../../../../src/components/task/CallControl/CallControlCustom/call-control-consult', () => {
  // eslint-disable-next-line react/display-name
  return (props) => (
    <div data-testid="CallControlConsultComponent" {...props}>
      CallControlConsultComponent
    </div>
  );
});

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
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
  const mockLoadQueues = jest.fn();
  const mockConsultCall = jest.fn();
  const mockTransferCall = jest.fn();
  const mockSetConsultAgentId = jest.fn();
  const mockSetConsultAgentName = jest.fn();
  const setIsHeld = jest.fn();

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
    setIsHeld: setIsHeld,
    buddyAgents: [],
    loadBuddyAgents: mockLoadBuddyAgents,
    loadQueues: mockLoadQueues,
    transferCall: mockTransferCall,
    consultCall: mockConsultCall,
    setIsRecording: jest.fn(),
    queues: [],
    setConsultAgentId: mockSetConsultAgentId,
    setConsultAgentName: mockSetConsultAgentName,
    consultAgentId: null,
    consultAgentName: null,
    endConsultCall: jest.fn(),
    consultTransfer: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with call control container', () => {
    render(<CallControlComponent {...defaultProps} />);
    expect(screen.getByTestId('call-control-container')).toBeInTheDocument();
  });

  it('calls toggleHold with correct value when hold button is clicked', () => {
    render(<CallControlComponent {...defaultProps} />);
    const buttons = screen.getAllByTestId('ButtonCircle');
    fireEvent.click(buttons[0]);
    expect(mockToggleHold).toHaveBeenCalledWith(true);
  });

  it('calls endCall when end call button is clicked', () => {
    render(<CallControlComponent {...defaultProps} />);
    const buttons = screen.getAllByTestId('ButtonCircle');
    fireEvent.click(buttons[4]);
    expect(mockEndCall).toHaveBeenCalled();
  });

  it('calls consultCall when a consult agent is selected', () => {
    render(<CallControlComponent {...defaultProps} />);
    const buttons = screen.getAllByTestId('ButtonCircle');
    fireEvent.click(buttons[1]);
    const agentSelectButton = screen.getByTestId('AgentSelectButton');
    fireEvent.click(agentSelectButton);
    expect(mockConsultCall).toHaveBeenCalledWith('agent1', 'agent');
    expect(mockSetConsultAgentId).toHaveBeenCalledWith('agent1');
    expect(mockLoadQueues).toHaveBeenCalled();
    expect(mockTransferCall).not.toHaveBeenCalled();
  });

  it('calls transferCall when a transfer agent is selected', () => {
    render(<CallControlComponent {...defaultProps} />);
    const buttons = screen.getAllByTestId('ButtonCircle');
    fireEvent.click(buttons[2]);
    const agentSelectButton = screen.getByTestId('AgentSelectButton');
    fireEvent.click(agentSelectButton);
    expect(mockTransferCall).toHaveBeenCalledWith('agent1', 'agent');
    expect(mockLoadQueues).toHaveBeenCalled();
    expect(mockConsultCall).not.toHaveBeenCalled();
  });

  it('renders consult UI with consultAccepted prop', () => {
    const props = {
      ...defaultProps,
      consultAccepted: true,
      consultInitiated: false,
    };
    render(<CallControlComponent {...props} />);
    const consultContainer = document.querySelector('.call-control-consult-container');
    expect(consultContainer).toBeInTheDocument();
    expect(consultContainer).toHaveClass('no-border');
  });

  it('renders consult UI with consultInitiated prop', () => {
    const props = {
      ...defaultProps,
      consultAccepted: false,
      consultInitiated: true,
    };
    render(<CallControlComponent {...props} />);
    const consultContainer = document.querySelector('.call-control-consult-container');
    expect(consultContainer).toBeInTheDocument();
    expect(consultContainer).not.toHaveClass('no-border');
  });
});
