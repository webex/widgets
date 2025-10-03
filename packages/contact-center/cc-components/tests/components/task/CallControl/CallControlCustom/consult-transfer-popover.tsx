import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsultTransferPopoverComponent from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-popover';
import {ContactServiceQueue} from '@webex/cc-store';
import * as utils from '../../../../..//src/components/task/CallControl/CallControlCustom/call-control-custom.utils';

const loggerMock = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
  error: jest.fn(),
};

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
    getQueues: async () => ({
      data: [
        {id: 'queue1', name: 'Queue One'} as ContactServiceQueue,
        {id: 'queue2', name: 'Queue Two'} as ContactServiceQueue,
      ],
      meta: {page: 0, totalPages: 1},
    }),
    onAgentSelect: mockOnAgentSelect,
    onQueueSelect: mockOnQueueSelect,
    allowConsultToQueue: true,
    logger: loggerMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders heading and tabs when showTabs is true', async () => {
    const screen = await render(<ConsultTransferPopoverComponent {...baseProps} />);

    // Verify main container
    expect(screen.container.querySelector('.agent-popover-content')).toBeInTheDocument();

    // Verify heading - it's wrapped in mdc-text component
    const heading = screen.container.querySelector('.agent-popover-title');
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Select an Agent');
    expect(heading?.tagName.toLowerCase()).toBe('mdc-text');
    expect(heading).toHaveAttribute('tagname', 'h3');
    expect(heading).toHaveAttribute('type', 'body-large-bold');

    // Verify tabs container
    const buttons = Array.from(screen.container.querySelectorAll('button')).map(
      (b) => (b as HTMLButtonElement).textContent
    );
    expect(buttons).toEqual(expect.arrayContaining(['Agents', 'Queues', 'Dial Number', 'Entry Point']));

    // Verify Agents tab (active by default)
    expect(screen.getByText('Agents')).toBeInTheDocument();

    // Verify Queues tab (inactive by default)
    expect(screen.getByText('Queues')).toBeInTheDocument();

    // Verify agent list
    const agentList = screen.container.querySelector('.agent-list');
    expect(agentList).toBeInTheDocument();

    // Verify agent list items
    const listItems = screen.container.querySelectorAll('.call-control-list-item');
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent('Agent One');
    expect(listItems[1]).toHaveTextContent('Agent Two');

    // Verify list item containers have correct styling
    const listItemContainers = screen.container.querySelectorAll('[style*="cursor: pointer"]');
    expect(listItemContainers).toHaveLength(2);
  });

  it('handles interactions and tab switching correctly', async () => {
    const screen = await render(<ConsultTransferPopoverComponent {...baseProps} />);

    // Test agent selection - click on the button inside the first agent item
    const firstAgentButton = screen.container.querySelectorAll('.call-control-list-item button')[0];
    fireEvent.click(firstAgentButton);
    expect(mockOnAgentSelect).toHaveBeenCalledWith('agent1', 'Agent One');

    // Test onMouseDown event handler (covers line 39) - just trigger the event
    const listItemContainer = screen.container.querySelector('[style*="cursor: pointer"]');
    fireEvent.mouseDown(listItemContainer!);

    // Test tab switching
    fireEvent.click(screen.getByText('Queues'));

    // Test queue selection after switching tabs - click on the button inside the first queue item
    await waitFor(() =>
      expect(screen.container.querySelectorAll('.call-control-list-item button').length).toBeGreaterThan(0)
    );
    const firstQueueButton = screen.container.querySelectorAll('.call-control-list-item button')[0];
    fireEvent.click(firstQueueButton);
    expect(mockOnQueueSelect).toHaveBeenCalledWith('queue1', 'Queue One');
  });

  it('handles edge cases and conditional rendering', async () => {
    // Test empty state when both lists are completely empty
    const emptyProps = {
      ...baseProps,
      buddyAgents: [],
      getQueues: async () => ({data: [], meta: {page: 0, totalPages: 0}}),
    };

    let screen = await render(<ConsultTransferPopoverComponent {...emptyProps} />);
    expect(screen.getByText('No data available for consult transfer.')).toBeInTheDocument();
    screen.unmount();

    // Test empty agents tab with tabs showing (covers lines 94-96)
    const emptyAgentsProps = {
      ...baseProps,
      buddyAgents: [],
    };

    screen = await render(<ConsultTransferPopoverComponent {...emptyAgentsProps} />);
    const buttons = Array.from(screen.container.querySelectorAll('button')).map(
      (b) => (b as HTMLButtonElement).textContent
    );
    expect(buttons).toEqual(expect.arrayContaining(['Agents', 'Queues', 'Dial Number', 'Entry Point']));
    expect(screen.container.querySelector('.consult-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No data available for consult transfer.')).toBeInTheDocument();
    screen.unmount();

    // Test empty queues tab when switched to queues (covers lines 98-100)
    const emptyQueuesProps = {
      ...baseProps,
      getQueues: async () => ({data: [], meta: {page: 0, totalPages: 0}}),
    };

    screen = await render(<ConsultTransferPopoverComponent {...emptyQueuesProps} />);

    // Switch to queues tab
    fireEvent.click(screen.getByText('Queues'));

    // With empty queues, the list should not render and no items should be present
    expect(screen.container.querySelector('.agent-list')).toBeNull();
    expect(screen.container.querySelectorAll('.call-control-list-item').length).toBe(0);
    screen.unmount();

    // Test hidden queue tab when allowConsultToQueue is false
    const propsWithoutQueue = {
      ...baseProps,
      allowConsultToQueue: false,
    };

    screen = await render(<ConsultTransferPopoverComponent {...propsWithoutQueue} />);
    const queuesButton = Array.from(screen.container.querySelectorAll('button')).find(
      (btn) => (btn as HTMLButtonElement).textContent === 'Queues'
    ) as HTMLButtonElement | undefined;
    expect(queuesButton?.disabled).toBe(true);
  });

  it('covers edge case for empty items in renderList (line 50)', async () => {
    // Mock isAgentsEmpty to return false even with empty array to force renderList call
    const mockIsAgentsEmpty = jest.spyOn(utils, 'isAgentsEmpty').mockReturnValue(false);

    try {
      const propsWithEmptyAgents = {
        ...baseProps,
        buddyAgents: [], // Empty array but mocked to return false for isEmpty
      };

      const screen = await render(<ConsultTransferPopoverComponent {...propsWithEmptyAgents} />);

      // Should render the "No agents found" text via empty list state
      expect(screen.getByText('No agents found')).toBeInTheDocument();
    } finally {
      // Restore original functions
      mockIsAgentsEmpty.mockRestore();
    }
  });
});
