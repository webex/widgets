/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsultTransferPopoverComponent from '../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-popover';
import ConsultTransferEmptyState from '../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-empty-state';
import {ContactServiceQueue} from '@webex/cc-store';

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

// This test suite was previously skipped but is now enabled for 100% coverage
describe('ConsultTransferPopoverComponent', () => {
  const mockOnAgentSelect = jest.fn();
  const mockOnQueueSelect = jest.fn();
  const baseProps = {
    heading: 'Select an Agent',
    buttonIcon: 'agent-icon',
    buddyAgents: [
      {
        agentId: 'agent1',
        agentName: 'Agent One',
        dn: '1001',
        state: 'Available',
        teamId: 'team1',
        siteId: 'site1',
      },
      {
        agentId: 'agent2',
        agentName: 'Agent Two',
        dn: '1002',
        state: 'Available',
        teamId: 'team1',
        siteId: 'site1',
      },
    ],
    queues: [
      {id: 'queue1', name: 'Queue One'} as ContactServiceQueue,
      {id: 'queue2', name: 'Queue Two'} as ContactServiceQueue,
    ],
    onAgentSelect: mockOnAgentSelect,
    onQueueSelect: mockOnQueueSelect,
    allowConsultToQueue: true,
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

  it('renders agent list and allows selecting an agent', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} />);
    expect(screen.getByText('Agent One')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Agent One'));
    expect(mockOnAgentSelect).toHaveBeenCalledWith('agent1', 'Agent One');
  });

  it('shows ConsultTransferEmptyState when both buddyAgents and queues are empty', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} buddyAgents={[]} queues={[]} />);
    expect(screen.getByText(/We can't find any queue or agent available for now/)).toBeInTheDocument();
  });

  it('shows ConsultTransferEmptyState when only buddyAgents is empty and Agents tab is active', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} buddyAgents={[]} />);
    expect(screen.getByText(/We can't find any agent available for now/)).toBeInTheDocument();
  });

  it('shows ConsultTransferEmptyState when only queues is empty and Queues tab is active', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} queues={[]} allowConsultToQueue={true} />);
    // Switch to the Queues tab
    fireEvent.click(screen.getByText('Queues'));
    expect(screen.getByText(/We can't find any queue available for now/)).toBeInTheDocument();
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

  it('renders ConsultTransferEmptyState component with correct message', () => {
    render(<ConsultTransferEmptyState message="No available agents" />);
    expect(screen.getByText('No available agents')).toBeInTheDocument();
  });

  it('renders both agents and queues when available and allows tab switching', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} allowConsultToQueue={true} />);

    // Initially on Agents tab
    expect(screen.getByText('Agent One')).toBeInTheDocument();
    expect(screen.getByText('Agent Two')).toBeInTheDocument();

    // Switch to Queues tab
    fireEvent.click(screen.getByText('Queues'));
    expect(screen.getByText('Queue One')).toBeInTheDocument();
    expect(screen.getByText('Queue Two')).toBeInTheDocument();

    // Switch back to Agents tab
    fireEvent.click(screen.getByText('Agents'));
    expect(screen.getByText('Agent One')).toBeInTheDocument();
    expect(screen.getByText('Agent Two')).toBeInTheDocument();
  });

  it('renders correct tab state based on active selection', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} />);

    const agentsTab = screen.getByText('Agents').closest('button');
    const queuesTab = screen.getByText('Queues').closest('button');

    // Initially Agents tab should be active
    expect(agentsTab).toHaveAttribute('data-active', 'true');
    expect(queuesTab).toHaveAttribute('data-active', 'false');

    // Click on Queues tab
    fireEvent.click(screen.getByText('Queues'));

    // Now Queues tab should be active
    expect(agentsTab).toHaveAttribute('data-active', 'false');
    expect(queuesTab).toHaveAttribute('data-active', 'true');
  });

  it('shows correct empty message for each tab type', () => {
    const {rerender} = render(<ConsultTransferPopoverComponent {...baseProps} buddyAgents={[]} />);

    // Empty agents message
    expect(screen.getByText(/We can't find any agent available for now/)).toBeInTheDocument();

    // Change to empty queues and switch to Queues tab
    rerender(<ConsultTransferPopoverComponent {...baseProps} queues={[]} allowConsultToQueue={true} />);
    fireEvent.click(screen.getByText('Queues'));
    expect(screen.getByText(/We can't find any queue available for now/)).toBeInTheDocument();
  });

  it('handles missing onAgentSelect callback gracefully', () => {
    const propsWithoutAgentSelect = {
      ...baseProps,
      onAgentSelect: undefined,
    };

    render(<ConsultTransferPopoverComponent {...propsWithoutAgentSelect} />);
    expect(screen.getByText('Agent One')).toBeInTheDocument();

    // Should not throw error when clicking
    expect(() => {
      fireEvent.click(screen.getByText('Agent One'));
    }).not.toThrow();
  });

  it('handles missing onQueueSelect callback gracefully', () => {
    const propsWithoutQueueSelect = {
      ...baseProps,
      onQueueSelect: undefined,
    };

    render(<ConsultTransferPopoverComponent {...propsWithoutQueueSelect} allowConsultToQueue={true} />);
    fireEvent.click(screen.getByText('Queues'));
    expect(screen.getByText('Queue One')).toBeInTheDocument();

    // Should not throw error when clicking
    expect(() => {
      fireEvent.click(screen.getByText('Queue One'));
    }).not.toThrow();
  });

  it('renders with different heading text', () => {
    const customHeading = 'Choose Transfer Target';
    render(<ConsultTransferPopoverComponent {...baseProps} heading={customHeading} />);
    expect(screen.getByText(customHeading)).toBeInTheDocument();
  });

  it('displays proper role attributes for accessibility', () => {
    render(<ConsultTransferPopoverComponent {...baseProps} />);

    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();
    expect(tabList).toHaveAttribute('aria-label', 'Tabs');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent('Agents');
    expect(tabs[1]).toHaveTextContent('Queues');
  });
});
