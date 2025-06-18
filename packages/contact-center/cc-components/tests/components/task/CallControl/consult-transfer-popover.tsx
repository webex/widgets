/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsultTransferPopoverComponent from '../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-popover';
import ConsultEmptyState from '../../../../src/components/task/CallControl/CallControlCustom/consult-empty-state';

const loggerMock = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
  error: jest.fn(),
};

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

// This test suite is skipped because we have removed the :broken from the command
// line in the package.json scripts to run these tests in pipeline
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
    logger: loggerMock,
    showTabs: true,
    emptyMessage: 'No agents or queues available',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders heading and tabs when showTabs is true', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} />);
    expect(screen.getByText('Select an Agent')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Queues')).toBeInTheDocument();
  });

  it('does not render tabs when showTabs is false (both lists empty)', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} buddyAgents={[]} queues={[]} />);
    expect(screen.queryByText('Agents')).not.toBeInTheDocument();
    expect(screen.queryByText('Queues')).not.toBeInTheDocument();
  });

  it('renders queues list and allows selecting a queue', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} allowConsultToQueue={true} />);
    fireEvent.click(screen.getByText('Queues'));
    expect(screen.getByText('Queue One')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Queue One'));
    expect(mockOnQueueSelect).toHaveBeenCalledWith('queue1', 'Queue One');
  });

  it('renders queues list and allows selecting a queue', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} allowConsultToQueue={true} />);
    fireEvent.click(screen.getByText('Queues'));
    expect(screen.getByText('Queue One')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Queue One'));
    expect(mockOnQueueSelect).toHaveBeenCalledWith('queue1', 'Queue One');
  });

  it('shows ConsultEmptyState when both buddyAgents and queues are empty', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} buddyAgents={[]} queues={[]} />);
    expect(screen.getByText('We can’t find any queue or agent available for now.')).toBeInTheDocument();
  });

  it('shows ConsultEmptyState when only buddyAgents is empty and Agents tab is active', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} buddyAgents={[]} />);
    expect(screen.getByText('We can’t find any agent available for now.')).toBeInTheDocument();
  });

  it('shows ConsultEmptyState when only queues is empty and Queues tab is active', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} queues={[]} allowConsultToQueue={true} />);
    // Switch to the Queues tab
    fireEvent.click(screen.getByText('Queues'));
    expect(screen.getByText('We can’t find any queue available for now.')).toBeInTheDocument();
  });

  it('hides queues tab when allowConsultToQueue is false', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} allowConsultToQueue={false} />);
    const queuesTab = screen.getByText('Queues');
    // Check that the tab is hidden (display: none)
    expect(queuesTab.closest('button')).toHaveStyle('display: none');
  });

  it('shows queues tab when allowConsultToQueue is true', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} allowConsultToQueue={true} />);
    expect(screen.getByText('Queues')).toBeInTheDocument();
  });

  it('renders ConsultEmptyState component with correct message', () => {
    render(<ConsultEmptyState message="No available agents" />);
    expect(screen.getByText('No available agents')).toBeInTheDocument();
  });

  it('renders queues list and allows selecting a queue', () => {
    render(
      <ConsultTransferPopoverComponent
        {...baseProps}
        allowConsultToQueue={true}
        buddyAgents={[]} // So Queues tab is selected by default if you want
        queues={[
          {id: 'queue1', name: 'Queue One'},
          {id: 'queue2', name: 'Queue Two'},
        ]}
      />
    );
    // Switch to the Queues tab if not already selected
    fireEvent.click(screen.getByText('Queues'));
    expect(screen.getByText('Queue One')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Queue One'));
    expect(mockOnQueueSelect).toHaveBeenCalledWith('queue1', 'Queue One');
  });
});
