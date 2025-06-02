/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsultTransferPopoverComponent from '../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-popover';

jest.mock('../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-list-item', () => {
  const MockListItem = (props: any) => (
    <div data-testid="ConsultTransferListComponent" onClick={props.onButtonPress}>
      {props.title}
    </div>
  );
  MockListItem.displayName = 'ConsultTransferListComponent';
  return MockListItem;
});

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

describe.skip('ConsultTransferPopoverComponent', () => {
  const mockOnAgentSelect = jest.fn();
  const mockOnQueueSelect = jest.fn();
  const baseProps = {
    heading: 'Select an Agent',
    buttonIcon: 'agent-icon',
    buddyAgents: [
      {agentId: 'agent1', agentName: 'Agent One', dn: '1001'},
      {agentId: 'agent2', agentName: 'Agent Two', dn: '1002'},
    ],
    queues: [
      {id: 'queue1', name: 'Queue One'},
      {id: 'queue2', name: 'Queue Two'},
    ],
    onAgentSelect: mockOnAgentSelect,
    onQueueSelect: mockOnQueueSelect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders heading and tab correctly', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} />);
    expect(screen.getByText('Select an Agent')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
  });

  it('renders agents list when buddyAgents provided', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} />);
    expect(screen.getByText('Agent One')).toBeInTheDocument();
    expect(screen.getByText('Agent Two')).toBeInTheDocument();
  });

  it('renders no agents text when buddyAgents is empty', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} buddyAgents={[]} />);
    expect(screen.getByText('No agents found')).toBeInTheDocument();
  });

  it('calls onAgentSelect with correct agentId when agent button is clicked', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} />);
    fireEvent.click(screen.getByText('Agent One'));
    expect(mockOnAgentSelect).toHaveBeenCalledWith('agent1', 'Agent One');
  });

  it('hides queues tab when allowConsultToQueue is false', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} allowConsultToQueue={false} />);
    const queuesTab = screen.getByText('Queues').closest('[data-testid="TabNext"]');
    expect(queuesTab).toHaveStyle('display: none');
  });

  it('shows queues tab when allowConsultToQueue is true', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} allowConsultToQueue={true} />);
    const queuesTab = screen.getByText('Queues').closest('[data-testid="TabNext"]');
    expect(queuesTab).not.toHaveAttribute('disabled', 'true');
    expect(queuesTab).not.toHaveStyle('display: none');
  });
});
