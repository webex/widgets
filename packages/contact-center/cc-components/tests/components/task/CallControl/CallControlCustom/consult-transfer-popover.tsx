import React from 'react';
import {render, fireEvent} from '@testing-library/react';
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
    const tabList = screen.container.querySelector('.agent-tablist');
    expect(tabList).toBeInTheDocument();
    expect(tabList).toHaveAttribute('role', 'tablist');
    expect(tabList).toHaveAttribute('aria-label', 'Tabs');
    expect(tabList).toHaveAttribute('data-orientation', 'horizontal');

    // Verify Agents tab (active by default)
    const agentTab = screen.container.querySelector('.agent-tab');
    expect(agentTab).toBeInTheDocument();
    expect(agentTab).toHaveAttribute('role', 'tab');
    expect(agentTab).toHaveAttribute('data-active', 'true');
    expect(agentTab).toHaveTextContent('Agents');

    // Verify Queues tab (inactive by default)
    const queueTab = screen.container.querySelector('.queue-tab');
    expect(queueTab).toBeInTheDocument();
    expect(queueTab).toHaveAttribute('role', 'tab');
    expect(queueTab).toHaveAttribute('data-active', 'false');
    expect(queueTab).toHaveAttribute('tabindex', '-1');
    expect(queueTab).toHaveTextContent('Queues');

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
    const queueTab = screen.container.querySelector('.queue-tab');
    fireEvent.click(queueTab!);

    // Test queue selection after switching tabs - click on the button inside the first queue item
    const firstQueueButton = screen.container.querySelectorAll('.call-control-list-item button')[0];
    fireEvent.click(firstQueueButton);
    expect(mockOnQueueSelect).toHaveBeenCalledWith('queue1', 'Queue One');
  });

  it('handles edge cases and conditional rendering', async () => {
    // Test empty state when both lists are completely empty
    const emptyProps = {
      ...baseProps,
      buddyAgents: [],
      queues: [],
    };

    let screen = await render(<ConsultTransferPopoverComponent {...emptyProps} />);
    expect(screen.container.querySelector('.agent-tablist')).toBeInTheDocument();
    expect(screen.container.querySelector('.consult-empty-state')).toBeInTheDocument();
    expect(screen.container.querySelector('.consult-empty-message')).toBeInTheDocument();

    // Test empty agents tab with tabs showing (covers lines 94-96)
    const emptyAgentsProps = {
      ...baseProps,
      buddyAgents: [],
    };

    screen = await render(<ConsultTransferPopoverComponent {...emptyAgentsProps} />);
    expect(screen.container.querySelector('.agent-tablist')).toBeInTheDocument();
    expect(screen.container.querySelector('.consult-empty-state')).toBeInTheDocument();

    // Test empty queues tab when switched to queues (covers lines 98-100)
    const emptyQueuesProps = {
      ...baseProps,
      queues: [],
    };

    screen = await render(<ConsultTransferPopoverComponent {...emptyQueuesProps} />);

    // Switch to queues tab
    const queueTab = screen.container.querySelector('.queue-tab');
    fireEvent.click(queueTab!);

    // Should show empty state for queues (covers lines 98-100)
    expect(screen.container.querySelector('.consult-empty-state')).toBeInTheDocument();

    // Test hidden queue tab when allowConsultToQueue is false
    const propsWithoutQueue = {
      ...baseProps,
      allowConsultToQueue: false,
    };

    screen = await render(<ConsultTransferPopoverComponent {...propsWithoutQueue} />);
    const hiddenQueueTab = screen.container.querySelector('.queue-tab');
    expect(hiddenQueueTab).toHaveStyle('display: none');
  });

  it('covers edge case for empty items in renderList (line 50)', async () => {
    // Mock isAgentsEmpty to return false even with empty array to force renderList call
    const mockIsAgentsEmpty = jest.spyOn(utils, 'isAgentsEmpty').mockReturnValue(false);
    const mockShouldShowTabs = jest.spyOn(utils, 'shouldShowTabs').mockReturnValue(true);

    try {
      const propsWithEmptyAgents = {
        ...baseProps,
        buddyAgents: [], // Empty array but mocked to return false for isEmpty
      };

      const screen = await render(<ConsultTransferPopoverComponent {...propsWithEmptyAgents} />);

      // Should render the "No agents found" text (line 50)
      expect(screen.getByText('No agents found')).toBeInTheDocument();
    } finally {
      // Restore original functions
      mockIsAgentsEmpty.mockRestore();
      mockShouldShowTabs.mockRestore();
    }
  });
});
